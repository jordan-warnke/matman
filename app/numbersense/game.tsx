import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OrderNumberLine from '../../components/OrderNumberLine';
import SpreadsheetChrome from '../../components/SpreadsheetChrome';
import { Font, Spacing } from '../../constants/Theme';
import { useTheme } from '../../contexts/ThemeContext';
import { generateNSProblem, NSExpression, NSProblem } from '../../data/numbersense';
import { useCopyQuestion } from '../../hooks/useCopyQuestion';
import { useRetrySelector } from '../../hooks/useRetrySelector';
import { useWebShortcuts } from '../../hooks/useWebShortcuts';
import {
    DEFAULT_MODE_SETTINGS,
    GameType,
    loadModeSettings,
    ModeSettings,
    recordByKey,
} from '../../store/HistoryStore';

type TileState = 'idle' | 'correct' | 'wrong' | 'placed';

export default function NumberSenseGameScreen() {
  const router = useRouter();
  const { colors, timed, isWork } = useTheme();
  const gameType: GameType = 'numbersense-drill';

  const [settings, setSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);
  const [ready, setReady] = useState(false);

  const selector = useRetrySelector({ generate: generateNSProblem, candidateCount: 12 });

  useEffect(() => {
    Promise.all([loadModeSettings(gameType), selector.refreshHistory()]).then(([s]) => {
      setSettings(s);
      setReady(true);
    });
  }, [gameType]);

  const generate = useCallback((): NSProblem => {
    return selector.next();
  }, [selector]);

  // ── state ─────────────────────────────────────────────
  const [problem, setProblem] = useState<NSProblem | null>(null);
  const [tileStates, setTileStates] = useState<TileState[]>([]);
  const [placed, setPlaced] = useState<NSExpression[]>([]);
  const [nextExpectedIdx, setNextExpectedIdx] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [roundDone, setRoundDone] = useState(false);
  const [reversed, setReversed] = useState(false);
  const [timer, setTimer] = useState(0);
  const [estimateFeedback, setEstimateFeedback] = useState<'none' | 'correct' | 'wrong'>('none');

  // per-tile animations
  const shakeAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  const scaleAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(1))).current;
  const estimateShakeAnim = useRef(new Animated.Value(0)).current;

  // hint pulse on correct tile when wrong tile tapped
  const hintPulseIdx = useRef<number | null>(null);
  const [hintTile, setHintTile] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const problemStartRef = useRef(0);
  const advanceReadyRef = useRef(0);

  const modeColor = colors.teal;
  const modeColorDark = colors.tealDark;

  // ── timer ─────────────────────────────────────────────
  const startProblemTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const deadline = Date.now() + settings.timeAttackSeconds * 1000;
    setTimer(settings.timeAttackSeconds);
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, (deadline - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setTimer(0);
      } else {
        setTimer(remaining);
      }
    }, 100);
  }, [settings.timeAttackSeconds]);

  // ── init ──────────────────────────────────────────────
  const initRound = useCallback((p: NSProblem) => {
    setProblem(p);
    setMistakes(0);
    setRoundDone(false);
    setEstimateFeedback('none');
    shakeAnims.forEach((a) => a.setValue(0));
    scaleAnims.forEach((a) => a.setValue(1));
    estimateShakeAnim.setValue(0);
    setHintTile(null);
    problemStartRef.current = Date.now();
    if (p.type === 'order') {
      const rev = Math.random() < 0.5;
      setReversed(rev);
      setTileStates(p.shuffled.map(() => 'idle'));
      setPlaced([]);
      setNextExpectedIdx(0);
    }
  }, [shakeAnims, scaleAnims, estimateShakeAnim]);

  useEffect(() => {
    if (!ready) return;
    const p = generate();
    initRound(p);
    if (timed) startProblemTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [ready]);

  // ── tile tap (order only) ───────────────────────────────
  const handleTileTap = useCallback(
    async (shuffledIndex: number) => {
      if (!problem || problem.type !== 'order' || roundDone) return;
      const tapped = problem.shuffled[shuffledIndex];
      const order = reversed ? [...problem.sorted].reverse() : problem.sorted;
      const expected = order[nextExpectedIdx];

      if (tapped.value === expected.value) {
        // correct
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.spring(scaleAnims[shuffledIndex], { toValue: 1.15, friction: 4, useNativeDriver: true }).start(() => {
          Animated.timing(scaleAnims[shuffledIndex], { toValue: 0, duration: 200, useNativeDriver: true }).start();
        });
        setTileStates((prev) => { const n = [...prev]; n[shuffledIndex] = 'placed'; return n; });
        setPlaced((prev) => [...prev, tapped]);
        const newIdx = nextExpectedIdx + 1;
        setNextExpectedIdx(newIdx);
        setHintTile(null);

        if (newIdx === problem.sorted.length) {
          // round complete
          const elapsed = Date.now() - problemStartRef.current;
          const perfect = mistakes === 0;
          await recordByKey(problem.historyKey, perfect, elapsed);
          if (!perfect) selector.enqueueRetry(problem.historyKey, problem);
          await selector.refreshHistory();
          setAnswered((c) => c + 1);
          if (perfect) {
            setCorrectCount((c) => c + 1);
            setStreak((s) => s + 1);
          } else {
            setStreak(0);
          }
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          setRoundDone(true);
          advanceReadyRef.current = Date.now() + 500;
        }
      } else {
        // wrong
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setMistakes((m) => m + 1);
        setTileStates((prev) => { const n = [...prev]; n[shuffledIndex] = 'wrong'; return n; });
        // shake wrong tile
        Animated.sequence([
          Animated.timing(shakeAnims[shuffledIndex], { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnims[shuffledIndex], { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnims[shuffledIndex], { toValue: 6, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnims[shuffledIndex], { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start(() => {
          setTileStates((prev) => { const n = [...prev]; if (n[shuffledIndex] === 'wrong') n[shuffledIndex] = 'idle'; return n; });
        });
        // hint pulse correct tile
        const correctShuffledIdx = problem.shuffled.findIndex((e) => e.value === expected.value);
        if (correctShuffledIdx >= 0) {
          setHintTile(correctShuffledIdx);
          hintPulseIdx.current = correctShuffledIdx;
          setTimeout(() => {
            if (hintPulseIdx.current === correctShuffledIdx) setHintTile(null);
          }, 600);
        }
      }
    },
    [problem, roundDone, nextExpectedIdx, mistakes, reversed, scaleAnims, shakeAnims],
  );

  // ── estimate answer (MC) ──────────────────────────────
  const handleEstimateAnswer = useCallback(
    async (optionIndex: number) => {
      if (!problem || problem.type !== 'estimate' || roundDone) return;
      const correct = optionIndex === problem.correctIndex;
      setEstimateFeedback(correct ? 'correct' : 'wrong');

      if (correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStreak((s) => s + 1);
        setCorrectCount((c) => c + 1);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setMistakes(1);
        setStreak(0);
        Animated.sequence([
          Animated.timing(estimateShakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(estimateShakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(estimateShakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
          Animated.timing(estimateShakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
        selector.enqueueRetry(problem.historyKey, problem);
      }

      const elapsed = Date.now() - problemStartRef.current;
      await recordByKey(problem.historyKey, correct, elapsed);
      await selector.refreshHistory();
      setAnswered((c) => c + 1);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setRoundDone(true);
      advanceReadyRef.current = Date.now() + 500;
    },
    [problem, roundDone, estimateShakeAnim, selector],
  );

  // ── advance ───────────────────────────────────────────
  const advanceNext = useCallback(() => {
    if (Date.now() < advanceReadyRef.current) return;
    if (settings.problemCount > 0 && answered >= settings.problemCount) {
      setGameOver(true);
      return;
    }
    const next = generate();
    initRound(next);
    if (timed) startProblemTimer();
  }, [generate, answered, settings.problemCount, timed, startProblemTimer, initRound]);

  // ── keyboard shortcuts (1-4) ────────────────────────────
  const shortcutCallbacks = problem && !roundDone
    ? problem.type === 'order'
      ? problem.shuffled.map((_, i) =>
          tileStates[i] === 'placed' ? null : () => handleTileTap(i))
      : problem.options.map((_, i) => () => handleEstimateAnswer(i))
    : [];

  useWebShortcuts(
    shortcutCallbacks,
    roundDone ? advanceNext : undefined,
  );

  // ── work mode formula ─────────────────────────────────
  const workFormula = problem
    ? problem.type === 'order'
      ? `Sort${reversed ? ' (desc)' : ''}: ${problem.shuffled.map((e) => e.display).join(', ')}`
      : `${problem.display} ${problem.question}`
    : '';
  const { onCopy, copiedVisible } = useCopyQuestion(workFormula);

  // ── render ────────────────────────────────────────────
  if (!ready || !problem) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (gameOver) {
    const pct = answered > 0 ? Math.round((correctCount / answered) * 100) : 0;
    const playAgain = () => {
      setGameOver(false);
      setAnswered(0);
      setCorrectCount(0);
      setStreak(0);
      const p = generate();
      initRound(p);
      if (timed) startProblemTimer();
    };
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={[styles.gameOverTitle, { color: colors.correct }]}>Session Complete!</Text>
          <Text style={[styles.stat, { color: colors.text }]}>
            {pct}% · {correctCount}/{answered} perfect
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: modeColor, borderBottomColor: modeColorDark }]}
            activeOpacity={0.85}
            onPress={playAgain}
          >
            <Text style={styles.primaryBtnText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.muted }]}>Back to Menu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <SpreadsheetChrome
        formula={workFormula}
        cellRef="E3"
        options={problem.type === 'order'
          ? problem.shuffled
              .filter((_, i) => tileStates[i] !== 'placed')
              .map((e) => ({
                label: e.display,
                onPress: () => handleTileTap(problem.shuffled.indexOf(e)),
              }))
          : problem.options.map((opt, i) => ({
              label: opt,
              onPress: () => handleEstimateAnswer(i),
            }))}
        feedbackState={problem.type === 'order'
          ? (roundDone ? 'correct' : null)
          : (estimateFeedback !== 'none' ? estimateFeedback : null)}
        correctAnswer={problem.type === 'order'
          ? (() => {
              const order = reversed ? [...problem.sorted].reverse() : problem.sorted;
              const sep = reversed ? ' > ' : ' < ';
              return order.map((e) => e.display).join(sep);
            })()
          : problem.answer}
        answerRows={problem.type === 'order' && isWork && roundDone ? (() => {
          const order = reversed ? [...problem.sorted].reverse() : problem.sorted;
          return order.map((e) => ({
            label: e.display,
            detail: e.reveal.replace('= ', ''),
          }));
        })() : undefined}
        onBack={() => router.back()}
        onNext={roundDone ? advanceNext : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: modeColor }]}>←</Text>
          </TouchableOpacity>
          {timed && (
            <View style={[styles.timerPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.timerText, { color: colors.text }, timer <= 3 && { color: colors.error }]}>
                {timer.toFixed(1)}s
              </Text>
            </View>
          )}
          <View style={styles.streakBox}>
            <Text style={[styles.streakNum, { color: modeColor }]}>{streak}</Text>
            <Text style={styles.streakLabel}>🔥</Text>
          </View>
        </View>

        {problem.type === 'order' ? (
          <>
            {/* Category + instruction */}
            <View style={styles.promptArea}>
              <TouchableOpacity onPress={onCopy} activeOpacity={0.7}>
              <Text style={[styles.categoryLabel, { color: colors.muted }]}>{problem.category}</Text>
              <Text style={[styles.instruction, { color: colors.text }]}>
                Tap {reversed ? 'largest → smallest' : 'smallest → largest'}
              </Text>
              {copiedVisible && <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 2 }}>Copied!</Text>}
              </TouchableOpacity>
            </View>

            {/* Number line visualization */}
            <OrderNumberLine
              points={problem.sorted.map((expr) => ({
                value: expr.value,
                display: expr.display,
                reveal: expr.reveal,
                placed: placed.some((p) => p.value === expr.value),
              }))}
              colors={colors}
              accentColor={modeColor}
              revealed={roundDone}
            />

            {/* 2×2 tile grid */}
            <View style={styles.tileGrid}>
              {problem.shuffled.map((expr, i) => {
                const state = tileStates[i];
                if (state === 'placed') return <View key={i} style={styles.tileSlot} />;

                const isHinted = hintTile === i;
                const isWrong = state === 'wrong';
                const bgColor = isWrong
                  ? colors.error + '22'
                  : isHinted
                    ? modeColor + '33'
                    : colors.card;
                const borderColor = isWrong
                  ? colors.error
                  : isHinted
                    ? modeColor
                    : colors.border;

                return (
                  <Animated.View
                    key={i}
                    style={[
                      styles.tile,
                      { backgroundColor: bgColor, borderColor },
                      { transform: [{ translateX: shakeAnims[i] }, { scale: scaleAnims[i] }] },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.tileTouch}
                      activeOpacity={0.7}
                      onPress={() => handleTileTap(i)}
                    >
                      <Text style={[styles.tileNum, { color: isHinted ? modeColor : colors.muted }]}>
                        {i + 1}
                      </Text>
                      <Text style={[styles.tileDisplay, { color: isHinted ? modeColor : colors.text }]} numberOfLines={1}>
                        {expr.display}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            {/* Round complete */}
            {roundDone && (
              <View style={styles.roundDoneArea}>
                {!isWork && (
                  <View style={styles.decimalRow}>
                    {(reversed ? [...problem.sorted].reverse() : problem.sorted).map((expr, i) => (
                      <View key={i} style={[styles.decimalChip, { backgroundColor: colors.card }]}>
                        <Text style={[styles.decimalDisplay, { color: colors.text }]} numberOfLines={1}>{expr.display}</Text>
                        <Text style={[styles.decimalValue, { color: colors.muted }]} numberOfLines={1}>{expr.reveal}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={[styles.roundResult, { color: mistakes === 0 ? colors.correct : colors.text }]}>
                  {mistakes === 0 ? 'Perfect!' : `${mistakes} mistake${mistakes > 1 ? 's' : ''}`}
                </Text>
                <TouchableOpacity
                  style={[styles.nextBtn, { backgroundColor: modeColor, borderBottomColor: modeColorDark }]}
                  activeOpacity={0.85}
                  onPress={advanceNext}
                >
                  <Text style={styles.nextText}>→</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Estimate: question */}
            <View style={styles.promptArea}>
              <TouchableOpacity onPress={onCopy} activeOpacity={0.7}>
              <Text style={[styles.categoryLabel, { color: colors.muted }]}>{problem.category}</Text>
              <Animated.View style={{ transform: [{ translateX: estimateShakeAnim }] }}>
                <Text style={[styles.estimateDisplay, { color: colors.text }]}>{problem.display}</Text>
                <Text style={[styles.instruction, { color: estimateFeedback === 'correct' ? colors.correct : estimateFeedback === 'wrong' ? colors.error : colors.text }]}>
                  {problem.question}
                </Text>
              </Animated.View>
              {copiedVisible && <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 2 }}>Copied!</Text>}
              </TouchableOpacity>
            </View>

            {/* Estimate: MC options */}
            <View style={styles.estimateGrid}>
              {problem.options.map((opt, i) => {
                const isCorrect = i === problem.correctIndex;
                const answered = estimateFeedback !== 'none';
                const bgColor = answered
                  ? isCorrect
                    ? colors.correct + '22'
                    : colors.card
                  : colors.card;
                const borderColor = answered
                  ? isCorrect
                    ? colors.correct
                    : colors.border
                  : colors.border;
                const textColor = answered && isCorrect ? colors.correct : colors.text;

                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.estimateOption, { backgroundColor: bgColor, borderColor }]}
                    activeOpacity={0.7}
                    onPress={() => handleEstimateAnswer(i)}
                    disabled={answered}
                  >
                    <Text style={[styles.estimateOptionNum, { color: answered && isCorrect ? colors.correct : colors.muted }]}>
                      {i + 1}
                    </Text>
                    <Text style={[styles.estimateOptionText, { color: textColor }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Estimate: result + next */}
            {roundDone && (
              <View style={styles.roundDoneArea}>
                <Text style={[styles.roundResult, { color: estimateFeedback === 'correct' ? colors.correct : colors.error }]}>
                  {estimateFeedback === 'correct' ? 'Correct!' : `Answer: ${problem.answer}`}
                </Text>
                <TouchableOpacity
                  style={[styles.nextBtn, { backgroundColor: modeColor, borderBottomColor: modeColorDark }]}
                  activeOpacity={0.85}
                  onPress={advanceNext}
                >
                  <Text style={styles.nextText}>→</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <View style={styles.footer} />
      </SpreadsheetChrome>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  loadingText: { ...Font.body },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  back: { fontSize: 28, fontWeight: '700' },
  timerPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    borderWidth: 2,
  },
  timerText: { ...Font.h2, fontVariant: ['tabular-nums'] },
  streakBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakNum: { ...Font.h2 },
  streakLabel: { fontSize: 20 },

  promptArea: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  categoryLabel: { ...Font.caption, marginBottom: Spacing.xs },
  instruction: { ...Font.h3 },

  placedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  placedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  placedDisplay: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  placedReveal: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 1 },

  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  tileSlot: {
    width: '46%',
    height: 56,
  },
  tile: {
    width: '46%',
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    overflow: 'hidden',
  },
  tileTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tileNum: {
    position: 'absolute',
    top: 4,
    left: 8,
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.5,
  },
  tileDisplay: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },

  roundDoneArea: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  decimalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
  },
  decimalChip: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 64,
  },
  decimalDisplay: {
    fontSize: 13,
    fontWeight: '700',
  },
  decimalValue: {
    fontSize: 11,
    fontWeight: '500',
  },
  roundResult: { ...Font.h2 },
  nextBtn: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 60,
    alignItems: 'center',
    borderBottomWidth: 6,
  },
  nextText: { fontSize: 28, color: '#FFF', fontWeight: '700' },

  footer: { height: Spacing.xl },

  estimateDisplay: { ...Font.body, textAlign: 'center', marginBottom: Spacing.sm, paddingHorizontal: Spacing.md },
  estimateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  estimateOption: {
    width: '46%',
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  estimateOptionNum: {
    position: 'absolute',
    top: 4,
    left: 8,
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.5,
  },
  estimateOptionText: { fontSize: 18, fontWeight: '800' },

  gameOverTitle: { ...Font.h1, marginBottom: Spacing.md },
  stat: { ...Font.h2, marginBottom: Spacing.xl },
  primaryBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 16,
    borderRadius: 16,
    borderBottomWidth: 5,
  },
  primaryBtnText: { ...Font.h3, color: '#FFF' },
  secondaryBtn: { marginTop: Spacing.md, paddingVertical: 12 },
  secondaryBtnText: { ...Font.body, fontWeight: '600' },
});

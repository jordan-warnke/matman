import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import KnownToggle from '../../components/KnownToggle';
import NumberPad from '../../components/NumberPad';
import ReferenceOverlay, { SwipeHint } from '../../components/ReferenceOverlay';
import StruggleToggle from '../../components/StruggleToggle';
import { Font, Spacing } from '../../constants/Theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
    checkAnswer,
    FDP_TABLE,
    FDPEntry,
    FDPFormat,
    formatLabel,
    generateOptions,
    getDisplayValue,
    pickFormats,
} from '../../data/fdp';
import {
    ankiWeight,
    DEFAULT_MODE_SETTINGS,
    GameType,
    History,
    loadHistory,
    loadKnown,
    loadModeSettings,
    loadStruggles,
    ModeSettings,
    recordByKey,
    toggleKnown,
    toggleStruggle,
} from '../../store/HistoryStore';


type Feedback = 'none' | 'correct' | 'wrong';

interface FDPProblem {
  entry: FDPEntry;
  sourceFormat: FDPFormat;
  targetFormat: FDPFormat;
  displayValue: string;
  correctAnswer: string;
  options: string[];
  historyKey: string;
}

export default function FDPGameScreen() {
  const router = useRouter();
  const { colors, timed, multipleChoice } = useTheme();
  const { type } = useLocalSearchParams<{ type: string }>();
  const gameType = (type || 'fdp-time-attack') as GameType;

  const [settings, setSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);
  const [ready, setReady] = useState(false);

  const historyRef = useRef<History>({});
  const strugglesRef = useRef<Set<string>>(new Set());
  const knownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      loadModeSettings(gameType),
      loadHistory(),
      loadStruggles(),
      loadKnown(),
    ]).then(([s, h, str, kn]) => {
      setSettings(s);
      historyRef.current = h;
      strugglesRef.current = str;
      knownRef.current = kn;
      setReady(true);
    });
  }, [gameType]);

  // ── game state ──
  const [problem, setProblem] = useState<FDPProblem | null>(null);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<Feedback>('none');
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [awaitingNext, setAwaitingNext] = useState(false);
  const [currentStruggling, setCurrentStruggling] = useState(false);
  const [currentKnown, setCurrentKnown] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const problemStartRef = useRef(0);
  const pausedRef = useRef(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const submittedRef = useRef(false);

  // ── problem generator ──
  const generate = useCallback((): FDPProblem => {
    const history = historyRef.current;

    // Weighted selection based on error rate
    const pool = FDP_TABLE.map((entry) => {
      let source: FDPFormat, target: FDPFormat;
      if (gameType === 'fractions-drill') {
        source = 'fraction'; target = 'decimal';
      } else if (gameType === 'decimals-drill') {
        source = 'decimal'; target = 'fraction';
      } else if (gameType === 'percents-drill') {
        source = 'fraction'; target = 'percent';
      } else {
        ({ source, target } = pickFormats());
      }
      const key = `fdp:${entry.fraction}:${target}`;
      const weight = ankiWeight(history[key], strugglesRef.current.has(key), knownRef.current.has(key));
      return { entry, source, target, weight };
    });

    const totalWeight = pool.reduce((s, p) => s + p.weight, 0);
    let rand = Math.random() * totalWeight;
    let chosen = pool[0];
    for (const p of pool) {
      rand -= p.weight;
      if (rand <= 0) { chosen = p; break; }
    }

    const displayValue = getDisplayValue(chosen.entry, chosen.source);
    const correctAnswer = getDisplayValue(chosen.entry, chosen.target);
    const options = generateOptions(chosen.entry, chosen.target);
    const historyKey = `fdp:${chosen.entry.fraction}:${chosen.target}`;

    return {
      entry: chosen.entry,
      sourceFormat: chosen.source,
      targetFormat: chosen.target,
      displayValue,
      correctAnswer,
      options,
      historyKey,
    };
  }, [gameType]);

  // ── start per-problem timer ──
  const startProblemTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    pausedRef.current = false;
    submittedRef.current = false;
    const deadline = Date.now() + settings.timeAttackSeconds * 1000;
    setTimer(settings.timeAttackSeconds);
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      const remaining = Math.max(0, (deadline - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        if (submittedRef.current) return;
        submittedRef.current = true;
        pausedRef.current = true;
        setTimer(0);
        setFeedback('wrong');
        setStreak(0);
        setAnswered((c) => c + 1);
        setAwaitingNext(true);
      } else {
        setTimer(remaining);
      }
    }, 100);
  }, [settings.timeAttackSeconds]);

  // ── first problem + timer ──
  useEffect(() => {
    if (!ready) return;
    const p = generate();
    setProblem(p);
    problemStartRef.current = Date.now();
    setCurrentStruggling(strugglesRef.current.has(p.historyKey));
    setCurrentKnown(knownRef.current.has(p.historyKey));

    if (timed) {
      startProblemTimer();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [ready]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // ── submit ──
  const submit = useCallback(
    async (value: string) => {
      if (!problem || feedback !== 'none' || gameOver) return;
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSelectedOption(value);
      const elapsed = Date.now() - problemStartRef.current;
      const isCorrect = checkAnswer(problem.entry, problem.targetFormat, value);

      pausedRef.current = true;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

      await recordByKey(problem.historyKey, isCorrect, elapsed);
      historyRef.current = await loadHistory();
      setAnswered((c) => c + 1);

      if (isCorrect) {
        setFeedback('correct');
        setStreak((s) => s + 1);
        setCorrectCount((c) => c + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAwaitingNext(true);
      } else {
        setFeedback('wrong');
        triggerShake();
        setStreak(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setAwaitingNext(true);
      }
    },
    [problem, feedback, gameOver, generate, triggerShake],
  );

  const handleInputSubmit = useCallback(() => {
    if (input.trim()) submit(input.trim());
  }, [input, submit]);

  const advanceNext = useCallback(() => {
    if (settings.problemCount > 0 && answered >= settings.problemCount) {
      setGameOver(true);
      return;
    }
    const next = generate();
    setProblem(next);
    problemStartRef.current = Date.now();
    setInput('');
    setFeedback('none');
    setAwaitingNext(false);
    setSelectedOption(null);
    setCurrentStruggling(strugglesRef.current.has(next.historyKey));
    setCurrentKnown(knownRef.current.has(next.historyKey));
    submittedRef.current = false;
    if (timed) startProblemTimer();
  }, [generate, answered, settings.problemCount, timed, startProblemTimer]);

  const handleToggleStruggle = useCallback(async () => {
    if (!problem) return;
    const nowStruggling = await toggleStruggle(problem.historyKey);
    setCurrentStruggling(nowStruggling);
    strugglesRef.current = await loadStruggles();
    if (nowStruggling) { knownRef.current = await loadKnown(); setCurrentKnown(false); }
  }, [problem]);

  const handleToggleKnown = useCallback(async () => {
    if (!problem) return;
    const nowKnown = await toggleKnown(problem.historyKey);
    setCurrentKnown(nowKnown);
    knownRef.current = await loadKnown();
    if (nowKnown) { strugglesRef.current = await loadStruggles(); setCurrentStruggling(false); }
  }, [problem]);

  const repeatQuestion = useCallback(() => {
    if (problem) {
      const prevIdx = problem.options.indexOf(problem.correctAnswer);
      setProblem({ ...problem, options: generateOptions(problem.entry, problem.targetFormat, prevIdx) });
    }
    setFeedback('none');
    setAwaitingNext(false);
    setInput('');
    setSelectedOption(null);
    submittedRef.current = false;
    problemStartRef.current = Date.now();
    if (timed) startProblemTimer();
  }, [timed, startProblemTimer, problem]);

  const feedbackColor =
    feedback === 'correct' ? colors.correct
      : feedback === 'wrong' ? colors.error
        : colors.text;

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
      setInput('');
      setFeedback('none');
      setAwaitingNext(false);
      submittedRef.current = false;
      const p = generate();
      setProblem(p);
      problemStartRef.current = Date.now();
      setCurrentStruggling(strugglesRef.current.has(p.historyKey));
      setCurrentKnown(knownRef.current.has(p.historyKey));
      if (timed) startProblemTimer();
    };
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={[styles.gameOverTitle, { color: colors.correct }]}>Session Complete!</Text>
          <Text style={[styles.stat, { color: colors.text }]}>
            {pct}% · {correctCount}/{answered} correct
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary, borderBottomColor: colors.primaryDark }]}
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
            <Text style={[styles.secondaryBtnText, { color: colors.muted }]}>Back to Modes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ReferenceOverlay>
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>
        {timed && (
          <View style={[styles.timerPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.timerText, { color: colors.text }, timer <= 3 && { color: colors.error }]}>
              {timer.toFixed(1)}s
            </Text>
          </View>
        )}
        <View style={styles.streakBox}>
          <Text style={[styles.streakNum, { color: colors.accent }]}>{streak}</Text>
          <Text style={styles.streakLabel}>🔥</Text>
        </View>
      </View>

      {/* Problem */}
      <View style={styles.problemArea}>
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <Text style={[styles.problemText, { color: feedbackColor }]}>
            {problem.displayValue}
          </Text>
        </Animated.View>
        <Text style={[styles.questionText, { color: colors.muted }]}>
          As a {formatLabel(problem.targetFormat)}?
        </Text>
        {feedback === 'wrong' && selectedOption && (
          <Text style={[styles.correctHint, { color: colors.error }]}>✗ {selectedOption}</Text>
        )}
        {feedback !== 'none' && (
          <Text style={[styles.correctHint, { color: colors.correct }]}>= {problem.correctAnswer}</Text>
        )}
      </View>

      {/* Answer area */}
      <View style={styles.answerArea}>
        {multipleChoice ? (
          <View style={styles.mcGrid}>
            {problem.options.map((opt, i) => (
              <TouchableOpacity
                key={`${opt}-${i}`}
                style={[
                  styles.mcBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  feedback === 'correct' && opt === problem.correctAnswer && { borderColor: colors.correct, backgroundColor: colors.background },
                  feedback === 'wrong' && opt === problem.correctAnswer && { borderColor: colors.error, backgroundColor: colors.background },
                ]}
                activeOpacity={0.7}
                onPress={() => submit(opt)}
                disabled={feedback !== 'none'}
              >
                <Text style={[styles.mcText, { color: colors.text }]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <>
            <View style={styles.inputRow}>
              <View style={[styles.display, { borderColor: feedbackColor, backgroundColor: colors.card }]}>
                <Text style={[styles.displayText, { color: input ? colors.text : colors.muted }]}>
                  {input || '?'}
                </Text>
              </View>
            </View>
            {!awaitingNext && (
              <View style={{ marginTop: Spacing.sm }}>
                <NumberPad
                  onPress={(key) => setInput((prev) => prev + key)}
                  onBackspace={() => setInput((prev) => prev.slice(0, -1))}
                  onSubmit={handleInputSubmit}
                  extraKeys={['.', '0', '/']}
                  disabled={feedback !== 'none'}
                />
              </View>
            )}
          </>
        )}
        {awaitingNext && (
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.repeatBtn, { borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={repeatQuestion}
            >
              <Text style={[styles.repeatText, { color: colors.muted }]}>↺</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, { flex: 1, backgroundColor: colors.primary, borderBottomColor: colors.primaryDark }]}
              activeOpacity={0.85}
              onPress={advanceNext}
            >
              <Text style={styles.nextText}>→</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <SwipeHint />
        {awaitingNext && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StruggleToggle isStruggling={currentStruggling} onToggle={handleToggleStruggle} />
            <KnownToggle isKnown={currentKnown} onToggle={handleToggleKnown} />
          </View>
        )}
      </View>
    </SafeAreaView>
    </ReferenceOverlay>
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
  headerLabel: { ...Font.h3 },
  streakBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakNum: { ...Font.h2 },
  streakLabel: { fontSize: 20 },

  problemArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  problemText: { fontSize: 48, fontWeight: '900', letterSpacing: -1 },
  questionText: { ...Font.h3, marginTop: Spacing.sm },
  correctHint: { ...Font.h2, marginTop: Spacing.sm },

  answerArea: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },

  mcGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  mcBtn: {
    width: '47%',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    borderBottomWidth: 5,
  },
  mcText: { ...Font.h3 },

  inputRow: { flexDirection: 'row', gap: Spacing.sm },
  display: {
    flex: 1,
    borderWidth: 3,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  displayText: {
    ...Font.h2,
    textAlign: 'center',
  },

  nextBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderBottomWidth: 5,
  },
  nextText: { fontSize: 28, color: '#FFF', fontWeight: '700' },

  navRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  repeatBtn: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20, borderWidth: 2, borderBottomWidth: 4 },
  repeatText: { fontSize: 24, fontWeight: '700' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  footerText: { ...Font.body, fontWeight: '600' },

  gameOverTitle: { ...Font.h1, marginBottom: Spacing.md },
  stat: { ...Font.h2, marginBottom: Spacing.xl },
  primaryBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 16,
    borderRadius: 16,
    borderBottomWidth: 5,
  },
  primaryBtnText: { ...Font.h3, color: '#FFF' },
  secondaryBtn: {
    marginTop: Spacing.md,
    paddingVertical: 12,
  },
  secondaryBtnText: { ...Font.body, fontWeight: '600' },
});

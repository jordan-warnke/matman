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
import KnownToggle from '../../components/KnownToggle';
import ReferenceOverlay, { SwipeHint } from '../../components/ReferenceOverlay';
import StruggleToggle from '../../components/StruggleToggle';
import { Font, Spacing } from '../../constants/Theme';
import { useTheme } from '../../contexts/ThemeContext';
import { EstimationProblem, generateEstimation, regenerateOptions } from '../../data/estimation';
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

export default function EstimationGameScreen() {
  const router = useRouter();
  const { colors, timed } = useTheme();
  const gameType: GameType = 'estimation-drill';

  const [settings, setSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);
  const [ready, setReady] = useState(false);

  const historyRef = useRef<History>({});
  const strugglesRef = useRef<Set<string>>(new Set());
  const knownRef = useRef<Set<string>>(new Set());
  const recentRef = useRef<string[]>([]);

  useEffect(() => {
    Promise.all([loadModeSettings(gameType), loadHistory(), loadStruggles(), loadKnown()]).then(([s, h, str, kn]) => {
      setSettings(s);
      historyRef.current = h;
      strugglesRef.current = str;
      knownRef.current = kn;
      setReady(true);
    });
  }, [gameType]);

  const generate = useCallback((): EstimationProblem => {
    const recent = new Set(recentRef.current);
    // Generate candidates and pick using ankiWeight
    let best: EstimationProblem | null = null;
    let bestW = -1;

    for (let i = 0; i < 12; i++) {
      const candidate = generateEstimation();
      if (recent.has(candidate.historyKey)) continue;
      const w = ankiWeight(
        historyRef.current[candidate.historyKey],
        strugglesRef.current.has(candidate.historyKey),
        knownRef.current.has(candidate.historyKey),
      ) * (0.5 + Math.random());
      if (w > bestW) { bestW = w; best = candidate; }
    }

    if (!best) best = generateEstimation();

    recentRef.current = [...recentRef.current, best.historyKey].slice(-3);
    return best;
  }, []);

  const [problem, setProblem] = useState<EstimationProblem | null>(null);
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
  const submittedRef = useRef(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const popIn = useCallback(() => {
    scaleAnim.setValue(0.8);
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [scaleAnim]);

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

  useEffect(() => {
    if (!ready) return;
    const p = generate();
    setProblem(p);
    problemStartRef.current = Date.now();
    setCurrentStruggling(strugglesRef.current.has(p.historyKey));
    setCurrentKnown(knownRef.current.has(p.historyKey));
    if (timed) startProblemTimer();
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

  const answer = useCallback(
    async (userChoice: string) => {
      if (!problem || feedback !== 'none' || gameOver) return;
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSelectedOption(userChoice);
      const elapsed = Date.now() - problemStartRef.current;
      const isCorrect = userChoice === problem.answer;

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
      } else {
        setFeedback('wrong');
        triggerShake();
        setStreak(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      setAwaitingNext(true);
    },
    [problem, feedback, gameOver, triggerShake],
  );

  const advanceNext = useCallback(() => {
    if (settings.problemCount > 0 && answered >= settings.problemCount) {
      setGameOver(true);
      return;
    }
    const next = generate();
    setProblem(next);
    problemStartRef.current = Date.now();
    setFeedback('none');
    setAwaitingNext(false);
    setSelectedOption(null);
    setCurrentStruggling(strugglesRef.current.has(next.historyKey));
    setCurrentKnown(knownRef.current.has(next.historyKey));
    submittedRef.current = false;
    popIn();
    if (timed) startProblemTimer();
  }, [generate, answered, settings.problemCount, timed, startProblemTimer, popIn]);

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
      const reshuffled = regenerateOptions(problem);
      setProblem(reshuffled);
    }
    setFeedback('none');
    setAwaitingNext(false);
    setSelectedOption(null);
    submittedRef.current = false;
    problemStartRef.current = Date.now();
    if (timed) startProblemTimer();
  }, [timed, startProblemTimer, problem]);

  const feedbackColor =
    feedback === 'correct' ? colors.correct
      : feedback === 'wrong' ? colors.error
        : colors.text;

  // Use accent (yellow) for estimation — distinct from algebra (purple), bounding (secondary)
  const modeColor = colors.accent;
  const modeColorDark = colors.accentDark;

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
      setFeedback('none');
      setAwaitingNext(false);
      setSelectedOption(null);
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
    <ReferenceOverlay>
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
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
          <Text style={[styles.streakNum, { color: colors.accent }]}>{streak}</Text>
          <Text style={styles.streakLabel}>🔥</Text>
        </View>
      </View>

      {/* Problem */}
      <View style={styles.problemArea}>
        <Animated.View style={{ transform: [{ translateX: shakeAnim }, { scale: scaleAnim }] }}>
          <Text style={[styles.categoryLabel, { color: colors.muted }]}>{problem.category}</Text>
          <Text style={[styles.displayText, { color: feedbackColor }]}>
            {problem.display}
          </Text>
          <Text style={[styles.questionText, { color: colors.text }]}>
            {problem.question}
          </Text>
        </Animated.View>
        {feedback === 'correct' && (
          <Text style={[styles.answerText, { color: colors.correct }]}>
            ✓ {problem.answer}
          </Text>
        )}
        {feedback === 'wrong' && (
          <>
            {selectedOption && (
              <Text style={[styles.answerText, { color: colors.error }]}>
                ✗ {selectedOption}
              </Text>
            )}
            <Text style={[styles.answerText, { color: colors.correct }]}>
              ✓ {problem.answer}
            </Text>
          </>
        )}
        {feedback !== 'none' && (
          <Text style={[styles.hintText, { color: colors.muted }]}>
            {problem.hint}
          </Text>
        )}
      </View>

      {/* MC options */}
      <View style={styles.optionsArea}>
        {problem.options.map((option, i) => {
          const isSelected = selectedOption === option;
          const isCorrectOption = option === problem.answer;
          let optStyle: any = { backgroundColor: colors.card, borderColor: colors.border };
          let textColor: string = colors.text;

          if (feedback !== 'none') {
            if (isCorrectOption) {
              optStyle = { backgroundColor: colors.correct, borderColor: colors.correct };
              textColor = '#FFF';
            } else if (isSelected) {
              optStyle = { backgroundColor: colors.error + '22', borderColor: colors.error };
              textColor = colors.error;
            } else {
              optStyle = { ...optStyle, opacity: 0.4 };
            }
          }

          return (
            <TouchableOpacity
              key={i}
              style={[styles.optionBtn, optStyle]}
              activeOpacity={0.7}
              onPress={() => answer(option)}
              disabled={feedback !== 'none'}
            >
              <Text style={[styles.optionText, { color: textColor }]} numberOfLines={2}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
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
              style={[styles.nextBtn, { flex: 1, backgroundColor: modeColor, borderBottomColor: modeColorDark }]}
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
  streakBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakNum: { ...Font.h2 },
  streakLabel: { fontSize: 20 },

  problemArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  categoryLabel: { ...Font.caption, marginBottom: Spacing.sm, textAlign: 'center' },
  displayText: { fontSize: 30, fontWeight: '900', textAlign: 'center', marginBottom: Spacing.md },
  questionText: { ...Font.h3, textAlign: 'center', marginBottom: Spacing.sm },
  answerText: { ...Font.h2, textAlign: 'center', marginTop: Spacing.sm },
  hintText: { ...Font.body, textAlign: 'center', marginTop: Spacing.md, paddingHorizontal: Spacing.md },

  optionsArea: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  optionBtn: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  nextBtn: {
    borderRadius: 20,
    paddingVertical: 22,
    alignItems: 'center',
    borderBottomWidth: 6,
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

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
import PeekHint from '../../components/PeekHint';
import SpreadsheetChrome from '../../components/SpreadsheetChrome';
import { Font, Spacing } from '../../constants/Theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
    CyclicityProblem,
    generateCyclicityProblem,
    shuffleOptions,
} from '../../data/cyclicity';
import { useInlinePeek } from '../../hooks/useInlinePeek';
import { useWebShortcuts } from '../../hooks/useWebShortcuts';
import {
    DEFAULT_MODE_SETTINGS,
    History,
    loadHistory,
    loadModeSettings,
    ModeSettings,
    recordByKey
} from '../../store/HistoryStore';

type Feedback = 'none' | 'correct' | 'wrong';

export default function CyclicityGameScreen() {
  const router = useRouter();
  const { colors, timed, isWork } = useTheme();

  const [settings, setSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);
  const [ready, setReady] = useState(false);
  const historyRef = useRef<History>({});

  useEffect(() => {
    Promise.all([
      loadModeSettings('cyclicity-drill'),
      loadHistory(),
    ]).then(([s, h]) => {
      setSettings(s);
      historyRef.current = h;
      setReady(true);
    });
  }, []);

  const [problem, setProblem] = useState<CyclicityProblem | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('none');
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [awaitingNext, setAwaitingNext] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const { peekVisible, peekUsed, showPeek, hidePeek, togglePeek, resetPeek, panHandlers } = useInlinePeek();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const problemStartRef = useRef(0);
  const pausedRef = useRef(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const submittedRef = useRef(false);
  const graceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceReadyRef = useRef(0);

  const generate = useCallback((): CyclicityProblem => {
    return generateCyclicityProblem(settings.minNumber || 2, settings.maxNumber || 9);
  }, [settings.minNumber, settings.maxNumber]);

  const startProblemTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (graceTimeoutRef.current) { clearTimeout(graceTimeoutRef.current); graceTimeoutRef.current = null; }
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
        setTimer(0);
        graceTimeoutRef.current = setTimeout(() => {
          if (submittedRef.current) return;
          submittedRef.current = true;
          pausedRef.current = true;
          setFeedback('wrong');
          setStreak(0);
          setAnswered((c) => c + 1);
          setAwaitingNext(true);
          advanceReadyRef.current = Date.now() + 500;
        }, 200);
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
    if (timed) startProblemTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (graceTimeoutRef.current) clearTimeout(graceTimeoutRef.current);
    };
  }, [ready]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const submit = useCallback(
    async (value: string) => {
      if (!problem || feedback !== 'none' || gameOver) return;
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSelectedOption(value);
      const elapsed = Date.now() - problemStartRef.current;
      const isCorrect = value === problem.answer;

      pausedRef.current = true;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (graceTimeoutRef.current) { clearTimeout(graceTimeoutRef.current); graceTimeoutRef.current = null; }
      hidePeek();

      const recordedCorrect = isCorrect && !peekUsed;
      await recordByKey(problem.historyKey, recordedCorrect, elapsed);
      historyRef.current = await loadHistory();
      setAnswered((c) => c + 1);

      if (isCorrect) {
        setFeedback('correct');
        if (peekUsed) { setStreak(0); } else { setStreak((s) => s + 1); }
        if (!peekUsed) setCorrectCount((c) => c + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setFeedback('wrong');
        triggerShake();
        setStreak(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      advanceReadyRef.current = Date.now() + 500;
      setAwaitingNext(true);
    },
    [problem, feedback, gameOver, triggerShake, hidePeek, peekUsed],
  );

  const advanceNext = useCallback(() => {
    if (Date.now() < advanceReadyRef.current) return;
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
    resetPeek();
    submittedRef.current = false;
    if (timed) startProblemTimer();
  }, [generate, answered, settings.problemCount, timed, startProblemTimer, resetPeek]);

  const repeatQuestion = useCallback(() => {
    if (problem) {
      const prevIdx = problem.options.indexOf(problem.answer);
      setProblem(shuffleOptions(problem, prevIdx));
    }
    setFeedback('none');
    setAwaitingNext(false);
    setSelectedOption(null);
    resetPeek();
    submittedRef.current = false;
    problemStartRef.current = Date.now();
    if (timed) startProblemTimer();
  }, [timed, startProblemTimer, problem, resetPeek]);

  const feedbackColor =
    feedback === 'correct' ? colors.correct
      : feedback === 'wrong' ? colors.error
        : colors.text;

  const workFormula = problem ? `${problem.display} → ?` : '';

  useWebShortcuts(
    problem
      ? problem.options.map(opt =>
          feedback !== 'none' && opt === problem.answer ? advanceNext
          : feedback !== 'none' ? null
          : () => submit(opt))
      : [],
    awaitingNext ? advanceNext : undefined,
    undefined,
    undefined,
    undefined,
    !awaitingNext && feedback === 'none' ? showPeek : undefined,
    peekVisible ? hidePeek : undefined,
  );

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
      resetPeek();
      submittedRef.current = false;
      const p = generate();
      setProblem(p);
      problemStartRef.current = Date.now();
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} {...panHandlers}>
    <SpreadsheetChrome
      panHandlers={panHandlers}
      formula={workFormula}
      cellRef="E3"
      options={problem.options.map((opt) => ({
        label: opt,
        onPress: () => submit(opt),
      }))}
      feedbackState={feedback === 'none' ? null : feedback}
      correctAnswer={problem.answer}
      peekValue={problem.answer}
      peekVisible={peekVisible && feedback === 'none'}
      selectedValue={selectedOption ?? undefined}
      onBack={() => router.back()}
      onNext={awaitingNext ? advanceNext : undefined}
      onRepeat={awaitingNext ? repeatQuestion : undefined}
      onPeek={!awaitingNext && feedback === 'none' ? togglePeek : undefined}
    >
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
            {problem.display}
          </Text>
        </Animated.View>
        {(feedback !== 'none' || peekVisible) && (
          <Text
            style={[
              styles.inlineReveal,
              {
                color: feedback !== 'none'
                  ? colors.correct
                  : colors.primary,
              },
            ]}
          >
            = {problem.answer}
          </Text>
        )}
        <Text style={[styles.questionText, { color: colors.muted }]}>
          {problem.question}
        </Text>
      </View>

      {/* MC Options */}
      <View style={styles.answerArea}>
        <View style={styles.mcGrid}>
          {problem.options.map((opt, i) => (
            <TouchableOpacity
              key={`${opt}-${i}`}
              style={[
                styles.mcBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                feedback === 'correct' && opt === problem.answer && { borderColor: colors.correct, backgroundColor: colors.background },
                feedback === 'wrong' && opt === problem.answer && { borderColor: colors.error, backgroundColor: colors.background },
              ]}
              activeOpacity={0.7}
              onPress={feedback !== 'none' && opt === problem.answer ? advanceNext : () => submit(opt)}
              disabled={feedback !== 'none' && opt !== problem.answer}
            >
              <Text style={[styles.mcText, { color: colors.text }]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
        <PeekHint onPeek={!awaitingNext && feedback === 'none' ? togglePeek : undefined} />
      </View>
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

  problemArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  problemText: { fontSize: 48, fontWeight: '900', letterSpacing: -1 },
  questionText: { ...Font.h3, marginTop: Spacing.sm, color: '#888' },
  inlineReveal: { fontSize: 41, fontWeight: '900', letterSpacing: -1, textAlign: 'center', marginTop: Spacing.xs },

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

  navRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  nextBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderBottomWidth: 5,
  },
  nextText: { fontSize: 28, color: '#FFF', fontWeight: '700' },
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
    marginBottom: Spacing.md,
  },
  primaryBtnText: { ...Font.h3, color: '#FFF', fontWeight: '700' },
  secondaryBtn: { paddingVertical: Spacing.sm },
  secondaryBtnText: { ...Font.body },
});

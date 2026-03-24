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
import PeekHint from '../../components/PeekHint';
import SpreadsheetChrome from '../../components/SpreadsheetChrome';
import { Font, Spacing } from '../../constants/Theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useInlinePeek } from '../../hooks/useInlinePeek';
import { useWebShortcuts } from '../../hooks/useWebShortcuts';
import {
    generateParityProblem,
    generateSignProblem,
    ParityProblem,
    SignProblem,
} from '../../data/parity';
import {
    ankiWeight,
    DEFAULT_MODE_SETTINGS,
    GameType,
    History,
    loadHistory,
    loadModeSettings,
    ModeSettings,
    recordByKey,
} from '../../store/HistoryStore';


type Feedback = 'none' | 'correct' | 'wrong';
type Problem = (ParityProblem | SignProblem) & { correctLabel: string };

export default function ParityGameScreen() {
  const router = useRouter();
  const { colors, timed, isWork } = useTheme();
  const { type } = useLocalSearchParams<{ type: string }>();
  const gameType = (type || 'parity-drill') as GameType;
  const isParity = gameType === 'parity-drill';

  const [settings, setSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);
  const [ready, setReady] = useState(false);

  const historyRef = useRef<History>({});
  const recentRef = useRef<string[]>([]);

  useEffect(() => {
    Promise.all([loadModeSettings(gameType), loadHistory()]).then(([s, h]) => {
      setSettings(s);
      historyRef.current = h;
      setReady(true);
    });
  }, [gameType]);

  const generate = useCallback((): Problem => {
    const history = historyRef.current;
    const recent = new Set(recentRef.current);

    // Generate a batch and pick the one with highest ankiWeight (with jitter)
    const candidates = Array.from({ length: 8 }, () => {
      if (isParity) {
        const p = generateParityProblem();
        return { ...p, correctLabel: p.answer } as Problem;
      } else {
        const p = generateSignProblem();
        return { ...p, correctLabel: p.answer } as Problem;
      }
    });

    // Filter out recently-seen problems, but keep at least 1
    const eligible = candidates.filter(c => !recent.has(c.historyKey));
    const pool = eligible.length > 0 ? eligible : candidates;

    let best = pool[0];
    let bestW = -1;
    for (const c of pool) {
      const w = ankiWeight(history[c.historyKey]) * (0.5 + Math.random());
      if (w > bestW) { bestW = w; best = c; }
    }

    recentRef.current = [...recentRef.current, best.historyKey].slice(-3);
    return best;
  }, [isParity]);

  const [problem, setProblem] = useState<Problem | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('none');
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [awaitingNext, setAwaitingNext] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const { peekVisible, peekUsed, showPeek, hidePeek, resetPeek, panHandlers } = useInlinePeek();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const problemStartRef = useRef(0);
  const pausedRef = useRef(false);
  const submittedRef = useRef(false);
  const graceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceReadyRef = useRef(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const popIn = useCallback(() => {
    scaleAnim.setValue(0.8);
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [scaleAnim]);

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
  }, [settings.timeAttackSeconds, generate, popIn]);

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

  const answer = useCallback(
    async (userChoice: string) => {
      if (!problem || feedback !== 'none' || gameOver) return;
      if (submittedRef.current) return;
      submittedRef.current = true;
      setUserAnswer(userChoice);
      const elapsed = Date.now() - problemStartRef.current;
      const isCorrect = userChoice === problem.correctLabel;

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
    [problem, feedback, gameOver, answered, settings.problemCount, generate, startProblemTimer, triggerShake, popIn, hidePeek, peekUsed],
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
    setUserAnswer(null);
    resetPeek();
    submittedRef.current = false;
    popIn();
    if (timed) startProblemTimer();
  }, [generate, answered, settings.problemCount, timed, startProblemTimer, popIn, resetPeek]);

  const repeatQuestion = useCallback(() => {
    setFeedback('none');
    setAwaitingNext(false);
    setUserAnswer(null);
    resetPeek();
    submittedRef.current = false;
    problemStartRef.current = Date.now();
    if (timed) startProblemTimer();
  }, [timed, startProblemTimer, resetPeek]);

  const feedbackColor =
    feedback === 'correct' ? colors.correct
      : feedback === 'wrong' ? colors.error
        : colors.text;

  const workFormula = problem
    ? problem.display
    : '';

  // Button labels
  const btnA = isParity ? 'Even' : 'Pos';
  const btnB = isParity ? 'Odd' : 'Neg';
  const colorA = isParity ? colors.secondary : colors.correct;
  const colorB = isParity ? colors.accent : colors.error;

  useWebShortcuts(
    problem
      ? [
          feedback !== 'none' && problem.correctLabel === btnA ? advanceNext
          : feedback !== 'none' ? null
          : () => answer(btnA),
          feedback !== 'none' && problem.correctLabel === btnB ? advanceNext
          : feedback !== 'none' ? null
          : () => answer(btnB),
        ]
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
      formula={workFormula}
      cellRef="C5"
      options={[
        { label: btnA, onPress: () => answer(btnA) },
        { label: btnB, onPress: () => answer(btnB) },
      ]}
      feedbackState={feedback === 'none' ? null : feedback}
      correctAnswer={problem.correctLabel}
      peekValue={problem.correctLabel}
      peekVisible={peekVisible && feedback === 'none'}
      selectedValue={userAnswer || undefined}
      onBack={() => router.back()}
      onNext={awaitingNext ? advanceNext : undefined}
      onRepeat={awaitingNext ? repeatQuestion : undefined}
      onPeek={!awaitingNext && feedback === 'none' ? showPeek : undefined}
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
        <Text style={[styles.modeLabel, { color: colors.muted }]}>
          {isParity ? 'Even or Odd?' : 'Positive or Negative?'}
        </Text>
        <View style={styles.problemInlineRow}>
          <Animated.View style={{ transform: [{ translateX: shakeAnim }, { scale: scaleAnim }] }}>
            <Text style={[styles.problemText, { color: feedbackColor }]}> 
              {problem.display}
            </Text>
          </Animated.View>
          <Text
            style={[
              styles.inlineReveal,
              {
                color: feedback !== 'none'
                  ? colors.correct
                  : peekVisible
                  ? colors.primary
                  : 'transparent',
              },
            ]}
          >
            = {problem.correctLabel}
          </Text>
        </View>
      </View>

      {/* Answer buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[
            styles.choiceBtn,
            { backgroundColor: colors.card, borderColor: colorA },
            feedback === 'correct' && problem.correctLabel === btnA && { backgroundColor: colorA },
            feedback === 'wrong' && problem.correctLabel !== btnA && { borderColor: colors.muted },
          ]}
          activeOpacity={0.7}
          onPress={feedback !== 'none' && problem.correctLabel === btnA ? advanceNext : () => answer(btnA)}
          disabled={feedback !== 'none' && problem.correctLabel !== btnA}
        >
          <Text
            style={[
              styles.choiceText,
              { color: colorA },
              feedback === 'correct' && problem.correctLabel === btnA && { color: '#FFF' },
            ]}
          >
            {btnA.toUpperCase()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.choiceBtn,
            { backgroundColor: colors.card, borderColor: colorB },
            feedback === 'correct' && problem.correctLabel === btnB && { backgroundColor: colorB },
            feedback === 'wrong' && problem.correctLabel !== btnB && { borderColor: colors.muted },
          ]}
          activeOpacity={0.7}
          onPress={feedback !== 'none' && problem.correctLabel === btnB ? advanceNext : () => answer(btnB)}
          disabled={feedback !== 'none' && problem.correctLabel !== btnB}
        >
          <Text
            style={[
              styles.choiceText,
              { color: colorB },
              feedback === 'correct' && problem.correctLabel === btnB && { color: '#FFF' },
            ]}
          >
            {btnB.toUpperCase()}
          </Text>
        </TouchableOpacity>
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

      <View style={styles.footer}>
        <PeekHint />
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
  problemInlineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  modeLabel: { ...Font.h3, marginBottom: Spacing.md },
  problemText: { fontSize: 36, fontWeight: '900', textAlign: 'center' },
  inlineReveal: { ...Font.h2, minWidth: 80, textAlign: 'left' },

  btnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: 22,
    borderRadius: 20,
    borderWidth: 3,
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },

  nextBtn: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 22,
    alignItems: 'center',
    borderBottomWidth: 6,
  },
  nextText: { fontSize: 28, color: '#FFF', fontWeight: '700' },

  navRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
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

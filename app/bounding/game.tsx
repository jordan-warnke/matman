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
import { BoundingProblem, BoundOp, generateBoundingProblem } from '../../data/bounding';
import { useInlinePeek } from '../../hooks/useInlinePeek';
import { useWebShortcuts } from '../../hooks/useWebShortcuts';
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

export default function BoundingGameScreen() {
  const router = useRouter();
  const { colors, timed, isWork } = useTheme();
  const { type } = useLocalSearchParams<{ type: string }>();
  const gameType = (type || 'bound-time-attack') as GameType;

  const [settings, setSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);
  const [ready, setReady] = useState(false);

  const historyRef = useRef<History>({});

  useEffect(() => {
    Promise.all([loadModeSettings(gameType), loadHistory()]).then(([s, h]) => {
      setSettings(s);
      historyRef.current = h;
      setReady(true);
    });
  }, [gameType]);

  const [problem, setProblem] = useState<BoundingProblem | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('none');
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [awaitingNext, setAwaitingNext] = useState(false);
  const [userAnswer, setUserAnswer] = useState<BoundOp | null>(null);
  const { peekVisible, peekUsed, showPeek, hidePeek, togglePeek, resetPeek, panHandlers } = useInlinePeek();

  const recentRef = useRef<string[]>([]);
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

  const generateWeighted = useCallback((): BoundingProblem => {
    // Generate a batch and pick the one with highest ankiWeight
    const candidates = Array.from({ length: 8 }, () => generateBoundingProblem());
    const history = historyRef.current;
    const recent = new Set(recentRef.current);

    // Filter out recently-seen problems, but keep at least 1
    const eligible = candidates.filter(c => !recent.has(c.historyKey));
    const pool = eligible.length > 0 ? eligible : candidates;

    let best = pool[0];
    let bestW = -1;
    for (const c of pool) {
      let w = ankiWeight(history[c.historyKey]) * (0.5 + Math.random());
      if (w > bestW) { bestW = w; best = c; }
    }

    recentRef.current = [...recentRef.current, best.historyKey].slice(-3);
    return best;
  }, []);

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
  }, [settings.timeAttackSeconds, popIn]);

  useEffect(() => {
    if (!ready) return;
    const p = generateWeighted();
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
    async (userChoice: BoundOp) => {
      if (!problem || feedback !== 'none' || gameOver) return;
      if (submittedRef.current) return;
      submittedRef.current = true;
      setUserAnswer(userChoice);
      const elapsed = Date.now() - problemStartRef.current;
      const isCorrect = userChoice === problem.answer;

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
    [problem, feedback, gameOver, answered, settings.problemCount, timed, startProblemTimer, triggerShake, popIn, hidePeek, peekUsed],
  );

  const advanceNext = useCallback(() => {
    if (Date.now() < advanceReadyRef.current) return;
    if (settings.problemCount > 0 && answered >= settings.problemCount) {
      setGameOver(true);
      return;
    }
    const next = generateWeighted();
    setProblem(next);
    problemStartRef.current = Date.now();
    setFeedback('none');
    setAwaitingNext(false);
    setUserAnswer(null);
    resetPeek();
    submittedRef.current = false;
    popIn();
    if (timed) startProblemTimer();
  }, [answered, settings.problemCount, timed, startProblemTimer, popIn, resetPeek]);

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
    ? `${problem.display}  vs  ${problem.benchmark.toLocaleString()}`
    : '';

  useWebShortcuts(
    problem
      ? [
          feedback !== 'none' && problem.answer === '<' ? advanceNext
          : feedback !== 'none' ? null
          : () => answer('<'),
          feedback !== 'none' && problem.answer === '>' ? advanceNext
          : feedback !== 'none' ? null
          : () => answer('>'),
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
      const p = generateWeighted();
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
      cellRef="E5"
      options={[
        { label: '<', onPress: () => answer('<') },
        { label: '>', onPress: () => answer('>') },
      ]}
      feedbackState={feedback === 'none' ? null : feedback}
      correctAnswer={String(problem.answer)}
      peekValue={String(problem.answer)}
      peekVisible={peekVisible && feedback === 'none'}
      selectedValue={userAnswer || undefined}
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
        <Animated.View style={{ transform: [{ translateX: shakeAnim }, { scale: scaleAnim }] }}>
          <Text style={[styles.problemText, { color: feedbackColor }]}> 
            {problem.display}  vs  {problem.benchmark.toLocaleString()}
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
      </View>

      {/* < / > buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[
            styles.choiceBtn,
            { backgroundColor: colors.card, borderColor: colors.secondary },
            feedback === 'correct' && problem.answer === '<' && { backgroundColor: colors.correct, borderColor: colors.correct },
            feedback === 'wrong' && problem.answer === '<' && { borderColor: colors.error },
          ]}
          activeOpacity={0.7}
          onPress={feedback !== 'none' && problem.answer === '<' ? advanceNext : () => answer('<')}
          disabled={feedback !== 'none' && problem.answer !== '<'}
        >
          <Text
            style={[
              styles.choiceSymbol,
              { color: colors.secondary },
              feedback === 'correct' && problem.answer === '<' && { color: '#FFF' },
            ]}
          >
            {'<'}
          </Text>
          <Text style={[styles.choiceLabel, { color: colors.muted }]}>Less</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.choiceBtn,
            { backgroundColor: colors.card, borderColor: colors.accent },
            feedback === 'correct' && problem.answer === '>' && { backgroundColor: colors.correct, borderColor: colors.correct },
            feedback === 'wrong' && problem.answer === '>' && { borderColor: colors.error },
          ]}
          activeOpacity={0.7}
          onPress={feedback !== 'none' && problem.answer === '>' ? advanceNext : () => answer('>')}
          disabled={feedback !== 'none' && problem.answer !== '>'}
        >
          <Text
            style={[
              styles.choiceSymbol,
              { color: colors.accent },
              feedback === 'correct' && problem.answer === '>' && { color: '#FFF' },
            ]}
          >
            {'>'}
          </Text>
          <Text style={[styles.choiceLabel, { color: colors.muted }]}>Greater</Text>
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
  problemText: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  inlineReveal: { fontSize: 27, fontWeight: '900', letterSpacing: -1, textAlign: 'center', marginTop: Spacing.xs },

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
  choiceSymbol: {
    fontSize: 36,
    fontWeight: '900',
  },
  choiceLabel: {
    ...Font.caption,
    marginTop: 2,
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

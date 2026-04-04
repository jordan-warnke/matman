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
import { formatFactorization, isPrime, TRAP_NUMBERS } from '../../data/primes';
import { useCopyQuestion } from '../../hooks/useCopyQuestion';
import { useInlinePeek } from '../../hooks/useInlinePeek';
import { useRetrySelector } from '../../hooks/useRetrySelector';
import { useWebShortcuts } from '../../hooks/useWebShortcuts';
import {
    DEFAULT_MODE_SETTINGS,
    GameType,
    loadModeSettings,
    ModeSettings,
    recordByKey,
} from '../../store/HistoryStore';


type Feedback = 'none' | 'correct' | 'wrong';

interface PrimeProblem {
  n: number;
  prime: boolean;
  factorization: string;
  historyKey: string;
  isTrap: boolean;
}

function generatePrimeProblem(maxN: number): PrimeProblem {
  const minN = 11;
  // 55/45 prime vs composite split
  const wantPrime = Math.random() < 0.55;
  const candidates: number[] = [];
  for (let n = minN; n <= maxN; n++) {
    if (wantPrime === isPrime(n)) candidates.push(n);
  }
  // Fallback if somehow empty
  if (candidates.length === 0) {
    for (let n = minN; n <= maxN; n++) candidates.push(n);
  }
  const n = candidates[Math.floor(Math.random() * candidates.length)];
  const prime = isPrime(n);
  return {
    n,
    prime,
    factorization: prime ? `${n} is prime` : formatFactorization(n),
    historyKey: `prime:${n}`,
    isTrap: TRAP_NUMBERS.includes(n),
  };
}

function primeWeightModifier(item: PrimeProblem): number {
  if (item.isTrap) return 2.5;
  if (item.prime && item.n > 50) return 1.5;
  if (!item.prime) {
    if (item.n % 2 === 0) return 0.08;
    if (item.n % 5 === 0) return 0.15;
    if (item.n % 3 === 0) return 0.3;
  }
  return 1;
}

export default function PrimesGameScreen() {
  const router = useRouter();
  const { colors, timed, isWork } = useTheme();
  const { type } = useLocalSearchParams<{ type: string }>();
  const gameType = (type || 'primes-time-attack') as GameType;

  const [settings, setSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);
  const [ready, setReady] = useState(false);

  const maxN = useRef(200);

  const selector = useRetrySelector({
    generate: () => generatePrimeProblem(maxN.current),
    candidateCount: 12,
    weightModifier: primeWeightModifier,
  });

  useEffect(() => {
    Promise.all([loadModeSettings(gameType), selector.refreshHistory()]).then(([s]) => {
      setSettings(s);
      maxN.current = s.maxNumber > 13 ? s.maxNumber : 400;
      setReady(true);
    });
  }, [gameType]);

  const [problem, setProblem] = useState<PrimeProblem | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('none');
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [awaitingNext, setAwaitingNext] = useState(false);
  const [showDetail, setShowDetail] = useState('');
  const [userAnswer, setUserAnswer] = useState<boolean | null>(null);
  const { peekVisible, peekUsed, showPeek, hidePeek, togglePeek, resetPeek, panHandlers } = useInlinePeek();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const problemStartRef = useRef(0);
  const pausedRef = useRef(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const submittedRef = useRef(false);
  const graceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceReadyRef = useRef(0);

  const generate = useCallback((): PrimeProblem => {
    return selector.next();
  }, [selector]);

  const popIn = useCallback(() => {
    scaleAnim.setValue(0.8);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
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

    if (timed) {
      startProblemTimer();
    }
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
    async (userSaidPrime: boolean) => {
      if (!problem || feedback !== 'none' || gameOver) return;
      if (submittedRef.current) return;
      submittedRef.current = true;
      const elapsed = Date.now() - problemStartRef.current;
      const isCorrect = userSaidPrime === problem.prime;

      // Stop timer immediately
      pausedRef.current = true;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (graceTimeoutRef.current) { clearTimeout(graceTimeoutRef.current); graceTimeoutRef.current = null; }
      hidePeek();

      const recordedCorrect = isCorrect && !peekUsed;
      await recordByKey(problem.historyKey, recordedCorrect, elapsed);
      if (!recordedCorrect) selector.enqueueRetry(problem.historyKey, problem);
      await selector.refreshHistory();
      setAnswered((c) => c + 1);

      setUserAnswer(userSaidPrime);

      if (isCorrect) {
        setFeedback('correct');
        if (peekUsed) { setStreak(0); } else { setStreak((s) => s + 1); }
        if (!peekUsed) setCorrectCount((c) => c + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (!problem.prime) setShowDetail(problem.factorization);
        else setShowDetail(`${problem.n} is prime`);
      } else {
        setFeedback('wrong');
        triggerShake();
        setStreak(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setShowDetail(problem.factorization);
      }

      advanceReadyRef.current = Date.now() + 500;
      setAwaitingNext(true);
    },
    [problem, feedback, gameOver, generate, triggerShake, popIn, answered, settings.problemCount, timed, startProblemTimer, hidePeek, peekUsed],
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
    setShowDetail('');
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
    setShowDetail('');
    setUserAnswer(null);
    resetPeek();
    submittedRef.current = false;
    problemStartRef.current = Date.now();
    if (timed) startProblemTimer();
  }, [timed, startProblemTimer, resetPeek]);

  const isReview = (problem as any)?.resurfacing === 'review';
  const correctColor = isReview && feedback === 'correct' ? colors.gold : colors.correct;
  const feedbackColor =
    feedback === 'correct' ? correctColor
      : feedback === 'wrong' ? colors.error
        : colors.text;

  const workFormula = problem
    ? String(problem.n)
    : '';
  const { onCopy, copiedVisible } = useCopyQuestion(workFormula);

  useWebShortcuts(
    problem
      ? [
          feedback !== 'none' && problem.prime ? advanceNext
          : feedback !== 'none' ? null
          : () => answer(true),
          feedback !== 'none' && !problem.prime ? advanceNext
          : feedback !== 'none' ? null
          : () => answer(false),
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
      setShowDetail('');
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
      cellRef="D5"
      options={[
        { label: 'TRUE', onPress: () => answer(true) },
        { label: 'FALSE', onPress: () => answer(false) },
      ]}
      feedbackState={feedback === 'none' ? null : feedback}
      reviewCorrect={feedback === 'correct' && isReview}
      correctAnswer={problem.prime ? 'Prime' : 'Composite'}
      peekValue={problem.prime ? 'Prime' : 'Composite'}
      peekVisible={peekVisible && feedback === 'none'}
      selectedValue={userAnswer !== null ? (userAnswer ? 'TRUE' : 'FALSE') : undefined}
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

      {/* Number display */}
      <View style={styles.problemArea}>
        <TouchableOpacity onPress={onCopy} activeOpacity={0.7}>
        <Animated.View style={{ transform: [{ translateX: shakeAnim }, { scale: scaleAnim }] }}>
          <Text style={[styles.numberText, { color: feedbackColor }]}> 
            {problem.n}
          </Text>
        </Animated.View>
        {copiedVisible && <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 2 }}>Copied!</Text>}
        </TouchableOpacity>
        {!isWork && (feedback !== 'none' || peekVisible) && (
          <Text
            style={[
              styles.inlineReveal,
              {
                color: feedback !== 'none'
                  ? correctColor
                  : colors.primary,
              },
            ]}
          >
            = {problem.prime ? 'Prime' : 'Composite'}
          </Text>
        )}
        {problem.isTrap && feedback === 'none' && (
          <View style={[styles.trapBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.trapText}>⚠ TRAP</Text>
          </View>
        )}
      </View>

      {/* Prime / Composite buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[
            styles.choiceBtn,
            { backgroundColor: colors.card, borderColor: colors.correct },
            feedback === 'correct' && problem.prime && { backgroundColor: colors.correct },
            feedback === 'wrong' && !problem.prime && { borderColor: colors.error },
          ]}
          activeOpacity={0.7}
          onPress={feedback !== 'none' && problem.prime ? advanceNext : () => answer(true)}
          disabled={feedback !== 'none' && !problem.prime}
        >
          <Text
            style={[
              styles.choiceText,
              { color: colors.correct },
              feedback === 'correct' && problem.prime && { color: '#FFF' },
            ]}
          >
            PRIME
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.choiceBtn,
            { backgroundColor: colors.card, borderColor: colors.error },
            feedback === 'correct' && !problem.prime && { backgroundColor: colors.error },
            feedback === 'wrong' && problem.prime && { borderColor: colors.muted },
          ]}
          activeOpacity={0.7}
          onPress={feedback !== 'none' && !problem.prime ? advanceNext : () => answer(false)}
          disabled={feedback !== 'none' && problem.prime}
        >
          <Text
            style={[
              styles.choiceText,
              { color: colors.error },
              feedback === 'correct' && !problem.prime && { color: '#FFF' },
            ]}
          >
            COMPOSITE
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
  numberText: { fontSize: 72, fontWeight: '900', letterSpacing: -2 },
  trapBadge: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trapText: { fontSize: 12, fontWeight: '800', color: '#FFF', letterSpacing: 1.5 },
  inlineReveal: { fontSize: 61, fontWeight: '900', letterSpacing: -2, textAlign: 'center', marginTop: Spacing.xs },

  btnRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: 22,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    borderBottomWidth: 6,
  },
  choiceText: { ...Font.h2, fontWeight: '800' },

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

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
import ReferenceOverlay, { SwipeHint } from '../../components/ReferenceOverlay';
import StruggleToggle from '../../components/StruggleToggle';
import { Font, Spacing } from '../../constants/Theme';
import { useTheme } from '../../contexts/ThemeContext';
import { formatFactorization, isPrime, TRAP_NUMBERS } from '../../data/primes';
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

interface PrimeProblem {
  n: number;
  prime: boolean;
  factorization: string;
  historyKey: string;
  isTrap: boolean;
}

function buildPool(history: History, maxN: number, struggles: Set<string>, known: Set<string>) {
  const primes: { n: number; weight: number }[] = [];
  const composites: { n: number; weight: number }[] = [];

  for (let n = 2; n <= maxN; n++) {
    const key = `prime:${n}`;
    const isTrap = TRAP_NUMBERS.includes(n);
    let w = ankiWeight(history[key], struggles.has(key), known.has(key));
    if (isTrap) w *= 2; // trap numbers always get a boost

    if (isPrime(n)) {
      primes.push({ n, weight: w });
    } else {
      // Down-weight trivially-even composites so odd composites dominate
      if (n % 2 === 0) w *= 0.25;
      composites.push({ n, weight: w });
    }
  }

  // Pick from primes ~40% of the time for balanced gameplay
  return Math.random() < 0.4 ? primes : composites;
}

export default function PrimesGameScreen() {
  const router = useRouter();
  const { colors, timed } = useTheme();
  const { type } = useLocalSearchParams<{ type: string }>();
  const gameType = (type || 'primes-time-attack') as GameType;

  const [settings, setSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);
  const [ready, setReady] = useState(false);

  const historyRef = useRef<History>({});
  const maxN = useRef(200);
  const strugglesRef = useRef<Set<string>>(new Set());
  const knownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([loadModeSettings(gameType), loadHistory(), loadStruggles(), loadKnown()]).then(([s, h, str, kn]) => {
      setSettings(s);
      historyRef.current = h;
      strugglesRef.current = str;
      knownRef.current = kn;
      maxN.current = s.maxNumber > 13 ? s.maxNumber : 200;
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
  const [currentStruggling, setCurrentStruggling] = useState(false);
  const [currentKnown, setCurrentKnown] = useState(false);
  const [userAnswer, setUserAnswer] = useState<boolean | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const problemStartRef = useRef(0);
  const pausedRef = useRef(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const submittedRef = useRef(false);

  const generate = useCallback((): PrimeProblem => {
    const pool = buildPool(historyRef.current, maxN.current, strugglesRef.current, knownRef.current);
    const totalWeight = pool.reduce((s, p) => s + p.weight, 0);
    let rand = Math.random() * totalWeight;
    let chosen = pool[0];
    for (const p of pool) {
      rand -= p.weight;
      if (rand <= 0) { chosen = p; break; }
    }
    const prime = isPrime(chosen.n);
    return {
      n: chosen.n,
      prime,
      factorization: prime ? `${chosen.n} is prime` : formatFactorization(chosen.n),
      historyKey: `prime:${chosen.n}`,
      isTrap: TRAP_NUMBERS.includes(chosen.n),
    };
  }, []);

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
  }, [settings.timeAttackSeconds, generate, popIn]);

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

      await recordByKey(problem.historyKey, isCorrect, elapsed);
      historyRef.current = await loadHistory();
      setAnswered((c) => c + 1);

      setUserAnswer(userSaidPrime);

      if (isCorrect) {
        setFeedback('correct');
        setStreak((s) => s + 1);
        setCorrectCount((c) => c + 1);
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

      setAwaitingNext(true);
    },
    [problem, feedback, gameOver, generate, triggerShake, popIn, answered, settings.problemCount, timed, startProblemTimer],
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
    setShowDetail('');
    setAwaitingNext(false);
    setUserAnswer(null);
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
    setFeedback('none');
    setAwaitingNext(false);
    setShowDetail('');
    setUserAnswer(null);
    submittedRef.current = false;
    problemStartRef.current = Date.now();
    if (timed) startProblemTimer();
  }, [timed, startProblemTimer]);

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
      setFeedback('none');
      setShowDetail('');
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

      {/* Number display */}
      <View style={styles.problemArea}>
        <Animated.View style={{ transform: [{ translateX: shakeAnim }, { scale: scaleAnim }] }}>
          <Text style={[styles.numberText, { color: feedbackColor }]}>
            {problem.n}
          </Text>
        </Animated.View>
        {problem.isTrap && feedback === 'none' && (
          <View style={[styles.trapBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.trapText}>⚠ TRAP</Text>
          </View>
        )}
        {feedback === 'wrong' && userAnswer !== null && (
          <Text style={[styles.detailText, { color: colors.error }]}>✗ {userAnswer ? 'Prime' : 'Composite'}</Text>
        )}
        {feedback !== 'none' && (
          <Text style={[styles.detailText, { color: colors.correct }]}>✓ {problem.prime ? 'Prime' : 'Composite'}</Text>
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
          onPress={() => answer(true)}
          disabled={feedback !== 'none'}
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
          onPress={() => answer(false)}
          disabled={feedback !== 'none'}
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
  },
  numberText: { fontSize: 72, fontWeight: '900', letterSpacing: -2 },
  trapBadge: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trapText: { fontSize: 12, fontWeight: '800', color: '#FFF', letterSpacing: 1.5 },
  detailText: { ...Font.body, fontWeight: '600', marginTop: Spacing.md },

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

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
import { BoundingProblem, BoundOp, generateBoundingProblem } from '../../data/bounding';
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

export default function BoundingGameScreen() {
  const router = useRouter();
  const { colors, timed } = useTheme();
  const { type } = useLocalSearchParams<{ type: string }>();
  const gameType = (type || 'bound-time-attack') as GameType;

  const [settings, setSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);
  const [ready, setReady] = useState(false);

  const historyRef = useRef<History>({});
  const strugglesRef = useRef<Set<string>>(new Set());
  const knownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([loadModeSettings(gameType), loadHistory(), loadStruggles(), loadKnown()]).then(([s, h, str, kn]) => {
      setSettings(s);
      historyRef.current = h;
      strugglesRef.current = str;
      knownRef.current = kn;
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
  const [currentStruggling, setCurrentStruggling] = useState(false);
  const [currentKnown, setCurrentKnown] = useState(false);
  const [userAnswer, setUserAnswer] = useState<BoundOp | null>(null);

  const recentRef = useRef<string[]>([]);
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
      let w = ankiWeight(history[c.historyKey], strugglesRef.current.has(c.historyKey), knownRef.current.has(c.historyKey)) * (0.5 + Math.random());
      if (w > bestW) { bestW = w; best = c; }
    }

    recentRef.current = [...recentRef.current, best.historyKey].slice(-3);
    return best;
  }, []);

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
  }, [settings.timeAttackSeconds, popIn]);

  useEffect(() => {
    if (!ready) return;
    const p = generateWeighted();
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
    async (userChoice: BoundOp) => {
      if (!problem || feedback !== 'none' || gameOver) return;
      if (submittedRef.current) return;
      submittedRef.current = true;
      setUserAnswer(userChoice);
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
    [problem, feedback, gameOver, answered, settings.problemCount, timed, startProblemTimer, triggerShake, popIn],
  );

  const advanceNext = useCallback(() => {
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
    setCurrentStruggling(strugglesRef.current.has(next.historyKey));
    setCurrentKnown(knownRef.current.has(next.historyKey));
    submittedRef.current = false;
    popIn();
    if (timed) startProblemTimer();
  }, [answered, settings.problemCount, timed, startProblemTimer, popIn]);

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
      setAwaitingNext(false);
      submittedRef.current = false;
      const p = generateWeighted();
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
        <Animated.View style={{ transform: [{ translateX: shakeAnim }, { scale: scaleAnim }] }}>
          <Text style={[styles.problemText, { color: feedbackColor }]}>
            {problem.display}  vs  {problem.benchmark.toLocaleString()}
          </Text>
        </Animated.View>
        {feedback === 'wrong' && userAnswer && (
          <Text style={[styles.hintText, { color: colors.error }]}>✗ {userAnswer}</Text>
        )}
        {feedback !== 'none' && (
          <Text style={[styles.hintText, { color: colors.correct }]}>✓ {problem.answer}</Text>
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
          onPress={() => answer('<')}
          disabled={feedback !== 'none'}
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
          onPress={() => answer('>')}
          disabled={feedback !== 'none'}
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
  problemText: { fontSize: 32, fontWeight: '900', letterSpacing: -1, textAlign: 'center' },
  hintText: { ...Font.body, marginTop: Spacing.md, textAlign: 'center' },

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

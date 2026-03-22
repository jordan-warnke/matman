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
import { Problem, useProblemGenerator } from '../../hooks/useProblemGenerator';
import {
    DEFAULT_MODE_SETTINGS,
    GameType,
    loadKnown,
    loadModeSettings,
    loadStruggles,
    ModeSettings,
    toggleKnown,
    toggleStruggle,
} from '../../store/HistoryStore';


type Feedback = 'none' | 'correct' | 'wrong';

export default function GameScreen() {
  const router = useRouter();
  const { colors, timed, multipleChoice } = useTheme();
  const { type } = useLocalSearchParams<{ type: string }>();
  const gameType: GameType = (type || 'time-attack') as GameType;

  // ── settings ──
  const [settings, setSettings] = useState<ModeSettings>(DEFAULT_MODE_SETTINGS);
  const [ready, setReady] = useState(false);


  useEffect(() => {
    loadModeSettings(gameType).then((s) => {
      setSettings(s);
      setReady(true);
    });
    loadStruggles().then((s) => { strugglesRef.current = s; });
    loadKnown().then((k) => { knownRef.current = k; });
  }, [gameType]);

  // ── problem generator ──
  const { generate, record, reshuffleOptions } = useProblemGenerator(settings.maxNumber, settings.anchor, settings.minNumber, settings.questionStyle, settings.operationType);

  // ── game state ──
  const [problem, setProblem] = useState<Problem | null>(null);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<Feedback>('none');
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [awaitingNext, setAwaitingNext] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // ── struggle / known tracking ──
  const strugglesRef = useRef<Set<string>>(new Set());
  const knownRef = useRef<Set<string>>(new Set());
  const [currentStruggling, setCurrentStruggling] = useState(false);
  const [currentKnown, setCurrentKnown] = useState(false);

  // ── refs for per-problem timer ──
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const problemStartRef = useRef(0);
  const pausedRef = useRef(false);  // true when awaiting next / showing feedback
  const remainingRef = useRef(0);   // remaining seconds at pause time
  const submittedRef = useRef(false); // prevents timer/submit race

  // ── animations ──
  const shakeAnim = useRef(new Animated.Value(0)).current;

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
        if (submittedRef.current) return; // user already answered
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

  // ── first problem ──
  useEffect(() => {
    if (!ready) return;
    const p = generate();
    setProblem(p);
    problemStartRef.current = Date.now();
    setCurrentStruggling(strugglesRef.current.has(`${p.a}x${p.b}`) || strugglesRef.current.has(`${p.b}x${p.a}`));
    setCurrentKnown(knownRef.current.has(`${p.a}x${p.b}`) || knownRef.current.has(`${p.b}x${p.a}`));

    if (timed) {
      startProblemTimer();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ready]);

  // ── shake animation ──
  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // ── answer submission ──
  const submit = useCallback(
    async (value: number) => {
      if (!problem || feedback !== 'none' || gameOver) return;
      if (submittedRef.current) return; // timer already expired
      submittedRef.current = true;
      setSelectedOption(value);

      const elapsed = Date.now() - problemStartRef.current;
      const isCorrect = value === problem.answer;

      // Stop timer immediately
      pausedRef.current = true;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

      await record(problem.a, problem.b, isCorrect, elapsed);
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
    [problem, feedback, gameOver, record, generate, triggerShake],
  );

  // ── input submit handler ──
  const handleInputSubmit = useCallback(() => {
    const n = parseInt(input, 10);
    if (!isNaN(n)) submit(n);
  }, [input, submit]);

  // ── advance to next problem ──
  const advanceNext = useCallback(() => {
    // Check if problem count reached
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
    setCurrentStruggling(strugglesRef.current.has(`${next.a}x${next.b}`) || strugglesRef.current.has(`${next.b}x${next.a}`));
    setCurrentKnown(knownRef.current.has(`${next.a}x${next.b}`) || knownRef.current.has(`${next.b}x${next.a}`));
    submittedRef.current = false;
    if (timed) startProblemTimer();
  }, [generate, answered, settings.problemCount, timed, startProblemTimer]);

  const handleToggleStruggle = useCallback(async () => {
    if (!problem) return;
    const key = `${problem.a}x${problem.b}`;
    const nowStruggling = await toggleStruggle(key);
    setCurrentStruggling(nowStruggling);
    strugglesRef.current = await loadStruggles();
    if (nowStruggling) { knownRef.current = await loadKnown(); setCurrentKnown(false); }
  }, [problem]);

  const handleToggleKnown = useCallback(async () => {
    if (!problem) return;
    const key = `${problem.a}x${problem.b}`;
    const nowKnown = await toggleKnown(key);
    setCurrentKnown(nowKnown);
    knownRef.current = await loadKnown();
    if (nowKnown) { strugglesRef.current = await loadStruggles(); setCurrentStruggling(false); }
  }, [problem]);

  const repeatQuestion = useCallback(() => {
    if (problem) setProblem({ ...problem, options: reshuffleOptions(problem) });
    setFeedback('none');
    setAwaitingNext(false);
    setInput('');
    setSelectedOption(null);
    submittedRef.current = false;
    problemStartRef.current = Date.now();
    if (timed) startProblemTimer();
  }, [timed, startProblemTimer, problem, reshuffleOptions]);

  // ── render helpers ──

  const feedbackColor =
    feedback === 'correct'
      ? colors.correct
      : feedback === 'wrong'
        ? colors.error
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

  // ── Game Over / Session Complete ──
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
      setCurrentStruggling(strugglesRef.current.has(`${p.a}x${p.b}`) || strugglesRef.current.has(`${p.b}x${p.a}`));
      setCurrentKnown(knownRef.current.has(`${p.a}x${p.b}`) || knownRef.current.has(`${p.b}x${p.a}`));
      if (timed) startProblemTimer();
    };
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={[styles.gameOverTitle, { color: colors.correct }]}>Session Complete!</Text>
          <Text style={[styles.gameOverStat, { color: colors.text }]}>
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
            style={[styles.secondaryBtn]}
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
    <ReferenceOverlay highlightRow={problem?.a}>
          <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
                <Text style={[styles.back, { color: colors.primary }]}>←</Text>
              </TouchableOpacity>

              {timed && (
                <View style={[styles.timerPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text
                    style={[
                      styles.timerText,
                      { color: colors.text },
                      timer <= 3 && { color: colors.error },
                    ]}
                  >
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
                  {problem.displayMode === 'divide'
                    ? `${problem.dividend} ÷ ${problem.divisor}`
                    : problem.displayMode === 'square'
                    ? `${problem.base}²`
                    : problem.displayMode === 'root'
                    ? `√${problem.radicand}`
                    : problem.displayMode === 'cube'
                    ? `${problem.base}³`
                    : problem.displayMode === 'cuberoot'
                    ? `∛${problem.radicand}`
                    : `${problem.a} × ${problem.b}`}
                </Text>
              </Animated.View>

              {feedback === 'correct' && (
                <Text style={[styles.correctHint, { color: colors.correct }]}>= {problem.answer}</Text>
              )}
              {feedback === 'wrong' && (
                <>
                  {selectedOption !== null && (
                    <Text style={[styles.correctHint, { color: colors.error }]}>✗ {selectedOption}</Text>
                  )}
                  <Text style={[styles.correctHint, { color: colors.correct }]}>= {problem.answer}</Text>
                </>
              )}
            </View>

            {/* Answer area */}
            <View style={styles.answerArea}>
              {multipleChoice ? (
                <View style={styles.mcGrid}>
                  {problem.options.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.mcBtn,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        feedback === 'correct' && opt === problem.answer && { borderColor: colors.correct, backgroundColor: colors.background },
                        feedback === 'wrong' && opt === problem.answer && { borderColor: colors.error, backgroundColor: colors.background },
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
  loadingText: { ...Font.h3 },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  back: { fontSize: 28, fontWeight: '700' },
  headerLabel: { ...Font.h3 },
  timerPill: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
  },
  timerText: { ...Font.h3 },
  streakBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakNum: { ...Font.h2 },
  streakLabel: { fontSize: 22 },

  // problem
  problemArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  problemText: {
    fontSize: 56,
    fontWeight: '800',
  },
  correctHint: {
    ...Font.h2,
    marginTop: Spacing.sm,
  },

  // answers
  answerArea: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  display: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  displayText: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },

  nextBtn: {
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 4,
  },
  nextText: { fontSize: 28, fontWeight: '800', color: '#FFF' },

  navRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  repeatBtn: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20, borderWidth: 2, borderBottomWidth: 4 },
  repeatText: { fontSize: 24, fontWeight: '700' },

  mcGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  mcBtn: {
    width: '45%',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  mcText: { ...Font.h2 },

  // footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  footerText: { ...Font.body, fontWeight: '600' },

  // game over
  gameOverTitle: { ...Font.h1, marginBottom: Spacing.md },
  gameOverStat: { ...Font.h2, marginBottom: Spacing.xl },
  primaryBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 16,
    borderRadius: 16,
    borderBottomWidth: 4,
  },
  primaryBtnText: { ...Font.h3, color: '#FFF' },
  secondaryBtn: {
    marginTop: Spacing.md,
    paddingVertical: 12,
  },
  secondaryBtnText: { ...Font.body, fontWeight: '600' },
});

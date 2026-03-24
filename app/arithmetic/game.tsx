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
import NumberPad from '../../components/NumberPad';
import PeekHint from '../../components/PeekHint';
import SpreadsheetChrome from '../../components/SpreadsheetChrome';
import { Font, Spacing } from '../../constants/Theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useInlinePeek } from '../../hooks/useInlinePeek';
import { useWebShortcuts } from '../../hooks/useWebShortcuts';
import {
    DEFAULT_MODE_SETTINGS,
    GameType,
    History,
    ModeSettings,
    ankiWeight,
    loadHistory,
    loadModeSettings,
    recordByKey,
} from '../../store/HistoryStore';
import {
    adjacentSquares,
    buildOptions,
    digitSwap,
    offByN,
    offByOne,
    rootConfusion,
    squarePlusMinusN,
} from '../../utils/distractors';


type Feedback = 'none' | 'correct' | 'wrong';
type ProblemType = 'square' | 'root';

interface ArithProblem {
  display: string;
  answer: number;
  type: ProblemType;
  historyKey: string;
  options: number[];
}

// Squares: n² for n = 2-25
// Roots: √(n²) for n = 2-25

function buildPool(history: History) {
  const pool: { gen: () => ArithProblem; weight: number }[] = [];

  for (let n = 2; n <= 25; n++) {
    // Square: "n² = ?"
    const sqKey = `arith:sq${n}`;
    pool.push({
      weight: ankiWeight(history[sqKey]),
      gen: () => ({
        display: `${n}²`,
        answer: n * n,
        type: 'square',
        historyKey: sqKey,
        options: [],
      }),
    });

    // Root: "√(n²) = ?"
    const rtKey = `arith:rt${n * n}`;
    pool.push({
      weight: ankiWeight(history[rtKey]),
      gen: () => ({
        display: `√${n * n}`,
        answer: n,
        type: 'root',
        historyKey: rtKey,
        options: [],
      }),
    });
  }

  return pool;
}

function generateDistractors(answer: number, type: ProblemType, avoidAnswerAt?: number): number[] {
  if (type === 'square') {
    // n² mode: derive n from answer
    const n = Math.round(Math.sqrt(answer));
    return buildOptions({
      answer,
      count: 3,
      candidates: [
        adjacentSquares(n),           // (n±1)², (n±2)² — most confusable
        squarePlusMinusN(n),          // n²+n, n²-n (confusing n² with n(n+1))
        digitSwap(answer),            // e.g. 169 → 196
        offByOne(answer),             // answer ± 1
      ],
      namespace: 'arith-square',
      filter: (v) => v >= 4, // minimum square is 2²=4
    }, avoidAnswerAt);
  }
  // root mode: answer IS n; the number under the radical is n²
  const n = answer;
  const square = n * n;
  return buildOptions({
    answer,
    count: 3,
    candidates: [
      offByOne(answer),               // n±1 — always plausible
      rootConfusion(answer, square),   // factors of n², half/double
      offByN(answer, 2),              // n±2
    ],
    namespace: 'arith-root',
    filter: (v) => v >= 2,
  }, avoidAnswerAt);
}

const SURVIVAL_START = 3;

export default function ArithmeticGameScreen() {
  const router = useRouter();
  const { colors, timed, multipleChoice, isWork } = useTheme();
  const { type } = useLocalSearchParams<{ type: string }>();
  const gameType = (type || 'arith-survival') as GameType;

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

  const [problem, setProblem] = useState<ArithProblem | null>(null);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<Feedback>('none');
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [awaitingNext, setAwaitingNext] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const { peekVisible, peekUsed, showPeek, hidePeek, resetPeek, panHandlers } = useInlinePeek();

  // Survival timer — stored in seconds, counts down
  const [timer, setTimer] = useState(SURVIVAL_START);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerValueRef = useRef(SURVIVAL_START);
  const lastTickRef = useRef(0);
  const pausedRef = useRef(false);
  const problemStartRef = useRef(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const submittedRef = useRef(false);
  const graceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceReadyRef = useRef(0);

  const generate = useCallback((): ArithProblem => {
    const pool = buildPool(historyRef.current);
    const totalWeight = pool.reduce((s, p) => s + p.weight, 0);
    let rand = Math.random() * totalWeight;
    let chosen = pool[0];
    for (const p of pool) {
      rand -= p.weight;
      if (rand <= 0) { chosen = p; break; }
    }
    const prob = chosen.gen();
    prob.options = generateDistractors(prob.answer, prob.type);
    return prob;
  }, []);

  // ── start ──
  useEffect(() => {
    if (!ready) return;
    const p = generate();
    setProblem(p);
    problemStartRef.current = Date.now();

    if (timed) {
      timerValueRef.current = SURVIVAL_START;
      setTimer(SURVIVAL_START);
      lastTickRef.current = Date.now();
      pausedRef.current = false;
      submittedRef.current = false;
      if (graceTimeoutRef.current) { clearTimeout(graceTimeoutRef.current); graceTimeoutRef.current = null; }
      timerRef.current = setInterval(() => {
        if (pausedRef.current) { lastTickRef.current = Date.now(); return; }
        const now = Date.now();
        const dt = (now - lastTickRef.current) / 1000;
        lastTickRef.current = now;
        timerValueRef.current = Math.max(0, timerValueRef.current - dt);
        if (timerValueRef.current <= 0) {
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
          setTimer(timerValueRef.current);
        }
      }, 100);
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

  const submit = useCallback(
    async (value: number) => {
      if (!problem || feedback !== 'none' || gameOver) return;
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSelectedOption(value);
      const elapsed = Date.now() - problemStartRef.current;
      const isCorrect = value === problem.answer;

      // Stop timer immediately
      pausedRef.current = true;
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
        if (timed) {
          timerValueRef.current += 1;
          setTimer(timerValueRef.current);
        }
        advanceReadyRef.current = Date.now() + 500;
        setAwaitingNext(true);
      } else {
        setFeedback('wrong');
        triggerShake();
        setStreak(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        advanceReadyRef.current = Date.now() + 500;
        setAwaitingNext(true);
      }
    },
    [problem, feedback, gameOver, generate, triggerShake, timed, hidePeek, peekUsed],
  );

  const handleInputSubmit = useCallback(() => {
    const n = parseInt(input, 10);
    if (!isNaN(n)) submit(n);
  }, [input, submit]);

  const handleWebInputKey = useCallback((key: string) => {
    if (!/^\d$/.test(key)) return;
    setInput((prev) => prev + key);
  }, []);

  const handleWebBackspace = useCallback(() => {
    setInput((prev) => prev.slice(0, -1));
  }, []);

  const advanceNext = useCallback(() => {
    if (Date.now() < advanceReadyRef.current) return;
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
    resetPeek();
    submittedRef.current = false;
    pausedRef.current = false;
    lastTickRef.current = Date.now();
  }, [generate, answered, settings.problemCount, resetPeek]);

  const repeatQuestion = useCallback(() => {
    if (problem) {
      const prevIdx = problem.options.indexOf(problem.answer);
      setProblem({ ...problem, options: generateDistractors(problem.answer, problem.type, prevIdx) });
    }
    setFeedback('none');
    setAwaitingNext(false);
    setInput('');
    setSelectedOption(null);
    resetPeek();
    submittedRef.current = false;
    problemStartRef.current = Date.now();
    pausedRef.current = false;
    lastTickRef.current = Date.now();
  }, [problem, resetPeek]);

  const feedbackColor =
    feedback === 'correct' ? colors.correct
      : feedback === 'wrong' ? colors.error
        : colors.text;

  const workFormula = problem
    ? problem.display
    : '';

  useWebShortcuts(
    problem && multipleChoice
      ? problem.options.map(opt =>
          feedback !== 'none' && opt === problem.answer ? advanceNext
          : feedback !== 'none' ? null
          : () => submit(opt))
      : [],
    awaitingNext ? advanceNext : undefined,
    !multipleChoice && !awaitingNext ? handleInputSubmit : undefined,
    !multipleChoice && !awaitingNext && feedback === 'none' ? handleWebInputKey : undefined,
    !multipleChoice && !awaitingNext && feedback === 'none' ? handleWebBackspace : undefined,
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
      setInput('');
      setFeedback('none');
      setAwaitingNext(false);
      resetPeek();
      submittedRef.current = false;
      const p = generate();
      setProblem(p);
      problemStartRef.current = Date.now();
      if (timed) {
        timerValueRef.current = SURVIVAL_START;
        setTimer(SURVIVAL_START);
        lastTickRef.current = Date.now();
        pausedRef.current = false;
      }
    };
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={[styles.gameOverTitle, { color: colors.correct }]}>Session Complete!</Text>
          <Text style={[styles.stat, { color: colors.text }]}>
            {pct}% · {correctCount}/{answered} correct
          </Text>
          <Text style={[styles.statSub, { color: colors.muted }]}>
            Best streak: {streak}
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
      cellRef="D5"
      options={multipleChoice ? problem.options.map((opt) => ({
        label: String(opt),
        onPress: () => submit(opt),
      })) : undefined}
      inputValue={!multipleChoice ? input : undefined}
      onInputChange={!multipleChoice ? (v) => setInput(v) : undefined}
      onInputSubmit={!multipleChoice ? handleInputSubmit : undefined}
      feedbackState={feedback === 'none' ? null : feedback}
      correctAnswer={String(problem.answer)}
      peekValue={String(problem.answer)}
      peekVisible={peekVisible && feedback === 'none'}
      selectedValue={selectedOption !== null ? String(selectedOption) : undefined}
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
            <Text style={[styles.timerText, { color: colors.text }, timer <= 1.5 && { color: colors.error }]}>
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
        <View style={styles.problemInlineRow}>
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
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
            = {String(problem.answer)}
          </Text>
        </View>
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
                onPress={feedback !== 'none' && opt === problem.answer ? advanceNext : () => submit(opt)}
                disabled={feedback !== 'none' && opt !== problem.answer}
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
  problemInlineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  problemText: { fontSize: 48, fontWeight: '900', letterSpacing: -1 },
  inlineReveal: { ...Font.h2, minWidth: 40, textAlign: 'left' },

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
  statSub: { ...Font.body, marginBottom: Spacing.xl },

  gameOverTitle: { ...Font.h1, marginBottom: Spacing.md },
  stat: { ...Font.h2, marginBottom: Spacing.sm },
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

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
import { Problem, useProblemGenerator } from '../../hooks/useProblemGenerator';
import { useWebShortcuts } from '../../hooks/useWebShortcuts';
import {
    DEFAULT_MODE_SETTINGS,
    GameType,
    loadModeSettings,
    ModeSettings,
} from '../../store/HistoryStore';


type Feedback = 'none' | 'correct' | 'wrong';

function formatOptionHint(problem: Problem, option: number): string | null {
  if (problem.displayMode === 'multiply') {
    const divisors: number[] = [];
    if (option % problem.a === 0) divisors.push(problem.a);
    if (problem.b !== problem.a && option % problem.b === 0) divisors.push(problem.b);
    if (divisors.length === 0) {
      return problem.a === problem.b
        ? `(not divisible by ${problem.a}!)`
        : `(not divisible by ${problem.a} or ${problem.b}!)`;
    }
    const preferredFactor = divisors.includes(problem.a) ? problem.a : divisors[0];
    return `(${preferredFactor} × ${option / preferredFactor})`;
  }

  if (problem.displayMode === 'divide' && problem.dividend && problem.divisor) {
    if (option !== 0 && problem.dividend % option === 0) {
      return `(${problem.dividend} ÷ ${problem.dividend / option})`;
    }
    return `(${option} doesn't divide evenly into ${problem.dividend})`;
  }

  if (problem.displayMode === 'square' && problem.base != null) {
    if (option % problem.base === 0) {
      return `(${problem.base} × ${option / problem.base})`;
    }
    return `(not a multiple of ${problem.base})`;
  }

  if (problem.displayMode === 'root') {
    return `(${option}² = ${option * option})`;
  }

  if (problem.displayMode === 'cube' && problem.base != null) {
    const sq = problem.base * problem.base;
    if (option % sq === 0) {
      return `(${problem.base}² × ${option / sq})`;
    }
    if (option % problem.base === 0) {
      return `(${problem.base} × ${option / problem.base})`;
    }
    return `(not a multiple of ${problem.base})`;
  }

  if (problem.displayMode === 'cuberoot') {
    return `(${option}³ = ${option ** 3})`;
  }

  return null;
}

function formatProblemPrompt(problem: Problem): string {
  return problem.displayMode === 'divide'
    ? `${problem.dividend} ÷ ${problem.divisor}`
    : problem.displayMode === 'square'
    ? `${problem.base}²`
    : problem.displayMode === 'root'
    ? `√${problem.radicand}`
    : problem.displayMode === 'cube'
    ? `${problem.base}³`
    : problem.displayMode === 'cuberoot'
    ? `∛${problem.radicand}`
    : `${problem.a} × ${problem.b}`;
}

export default function GameScreen() {
  const router = useRouter();
  const { colors, timed, multipleChoice, isWork } = useTheme();
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
  }, [gameType]);

  // ── problem generator ──
  const { generate, record, reshuffleOptions } = useProblemGenerator(
    settings.maxNumber,
    settings.anchor,
    settings.minNumber,
    settings.questionStyle,
    settings.operationType,
    settings.excludedNumbers,
    settings.excludeSquarePairs,
    settings.shuffleOrder,
  );

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
  const { peekVisible, peekUsed, showPeek, hidePeek, togglePeek, resetPeek, panHandlers } = useInlinePeek();

  // ── refs for per-problem timer ──
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const problemStartRef = useRef(0);
  const pausedRef = useRef(false);  // true when awaiting next / showing feedback
  const remainingRef = useRef(0);   // remaining seconds at pause time
  const submittedRef = useRef(false); // prevents timer/submit race
  const graceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceReadyRef = useRef(0);

  // ── animations ──
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const selectedOptionTranslateX = useRef(new Animated.Value(0)).current;
  const selectedOptionTranslateY = useRef(new Animated.Value(0)).current;
  const selectedOptionScale = useRef(new Animated.Value(1)).current;

  // ── start per-problem timer ──
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

  // ── first problem ──
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

  // ── shake animation ──
  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const resetSelectedOptionAnimation = useCallback(() => {
    selectedOptionTranslateX.stopAnimation();
    selectedOptionTranslateY.stopAnimation();
    selectedOptionScale.stopAnimation();
    selectedOptionTranslateX.setValue(0);
    selectedOptionTranslateY.setValue(0);
    selectedOptionScale.setValue(1);
  }, [selectedOptionScale, selectedOptionTranslateX, selectedOptionTranslateY]);

  const animateSelectedOption = useCallback((isCorrect: boolean) => {
    resetSelectedOptionAnimation();

    if (isCorrect) {
      Animated.sequence([
        Animated.timing(selectedOptionScale, {
          toValue: 1.035,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.spring(selectedOptionScale, {
          toValue: 1,
          friction: 7,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.sequence([
      Animated.timing(selectedOptionTranslateX, { toValue: 12, duration: 45, useNativeDriver: true }),
      Animated.timing(selectedOptionTranslateX, { toValue: -12, duration: 45, useNativeDriver: true }),
      Animated.timing(selectedOptionTranslateX, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(selectedOptionTranslateX, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(selectedOptionTranslateX, { toValue: 0, duration: 35, useNativeDriver: true }),
    ]).start();
  }, [resetSelectedOptionAnimation, selectedOptionScale, selectedOptionTranslateX, selectedOptionTranslateY]);

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
      if (graceTimeoutRef.current) { clearTimeout(graceTimeoutRef.current); graceTimeoutRef.current = null; }
      hidePeek();

      const recordedCorrect = isCorrect && !peekUsed;
      await record(problem.a, problem.b, recordedCorrect, elapsed);
      setAnswered((c) => c + 1);

      if (isCorrect) {
        if (multipleChoice) animateSelectedOption(true);
        setFeedback('correct');
        if (peekUsed) { setStreak(0); } else { setStreak((s) => s + 1); }
        if (!peekUsed) setCorrectCount((c) => c + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (multipleChoice) {
          // MC mode: linger to show correct answer
          advanceReadyRef.current = Date.now() + 500;
          setAwaitingNext(true);
        } else {
          // Manual entry: auto-advance on correct
          setTimeout(() => {
            if (settings.problemCount > 0 && answered + 1 >= settings.problemCount) {
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
            submittedRef.current = false;
            if (timed) startProblemTimer();
          }, 300);
        }
      } else {
        if (multipleChoice) animateSelectedOption(false);
        setFeedback('wrong');
        triggerShake();
        setStreak(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        if (multipleChoice) {
          advanceReadyRef.current = Date.now() + 500;
          setAwaitingNext(true);
        } else {
          // Manual entry: stay put, let user retry
          setTimeout(() => {
            setInput('');
            setFeedback('none');
            setSelectedOption(null);
            submittedRef.current = false;
          }, 800);
        }
      }
    },
    [problem, feedback, gameOver, record, generate, triggerShake, multipleChoice, animateSelectedOption, hidePeek, peekUsed],
  );

  // ── input submit handler ──
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

  // ── advance to next problem ──
  const advanceNext = useCallback(() => {
    if (Date.now() < advanceReadyRef.current) return;
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
    resetSelectedOptionAnimation();
    resetPeek();
    submittedRef.current = false;
    if (timed) startProblemTimer();
  }, [generate, answered, settings.problemCount, timed, startProblemTimer, resetSelectedOptionAnimation, resetPeek]);

  const repeatQuestion = useCallback(() => {
    if (problem) setProblem({ ...problem, options: reshuffleOptions(problem) });
    setFeedback('none');
    setAwaitingNext(false);
    setInput('');
    setSelectedOption(null);
    resetSelectedOptionAnimation();
    resetPeek();
    submittedRef.current = false;
    problemStartRef.current = Date.now();
    if (timed) startProblemTimer();
  }, [timed, startProblemTimer, problem, reshuffleOptions, resetSelectedOptionAnimation, resetPeek]);

  // ── render helpers ──

  const feedbackColor =
    feedback === 'correct'
      ? colors.correct
      : feedback === 'wrong'
        ? colors.error
        : colors.text;

  // ── work-mode formula text ──
  const workFormula = problem
    ? formatProblemPrompt(problem)
    : '';

  const completionAnswer = problem ? String(problem.answer) : '';
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
          <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} {...panHandlers}> 
          <SpreadsheetChrome
            panHandlers={panHandlers}
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
            revealedAnswer={completionAnswer}
            peekValue={completionAnswer}
            peekVisible={peekVisible && feedback === 'none'}
            selectedValue={selectedOption !== null ? String(selectedOption) : undefined}
            selectedOptionTranslateX={selectedOptionTranslateX}
            selectedOptionTranslateY={selectedOptionTranslateY}
            selectedOptionScale={selectedOptionScale}
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
                  {formatProblemPrompt(problem)}
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
                  = {completionAnswer}
                </Text>
              )}

              {problem.resurfacing && (
                <View style={[styles.reviewPill, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                  <Text style={[styles.reviewPillText, { color: colors.muted }]}>
                    {problem.resurfacing === 'retry' ? '↺ Retry' : '↺ Review'}
                  </Text>
                </View>
              )}
            </View>

            {/* Answer area */}
            <View style={styles.answerArea}>
              {multipleChoice ? (
                <View style={styles.mcGrid}>
                  {problem.options.map((opt, index) => {
                    const optionHint = formatOptionHint(problem, opt);
                    const isSelected = selectedOption === opt;
                    return (
                    <Animated.View
                      key={opt}
                      style={[
                        styles.mcBtnWrap,
                        isSelected
                          ? {
                              transform: [
                                { translateX: selectedOptionTranslateX },
                                { translateY: selectedOptionTranslateY },
                                { scale: selectedOptionScale },
                              ],
                            }
                          : undefined,
                      ]}
                    >
                      <TouchableOpacity
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
                        <View style={[styles.optionKeyPill, { backgroundColor: colors.background, borderColor: colors.border }]}> 
                          <Text style={[styles.optionKeyText, { color: colors.muted }]}>{index + 1}</Text>
                        </View>
                        <Text style={[styles.mcText, { color: colors.text }]}>{opt}</Text>
                        {optionHint && (
                          <Text
                            style={[
                              styles.mcHintText,
                              { color: colors.muted, opacity: feedback !== 'none' ? 0.85 : 0 },
                            ]}
                            numberOfLines={1}
                          >
                            {optionHint}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                    );
                  })}
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
              <View
                style={[styles.navRow, !awaitingNext && styles.navRowHidden]}
                pointerEvents={awaitingNext ? 'auto' : 'none'}
              >
                <TouchableOpacity
                  style={[styles.repeatBtn, { borderColor: colors.border }]}
                  activeOpacity={0.7}
                  onPress={repeatQuestion}
                  disabled={!awaitingNext}
                >
                  <Text style={[styles.repeatText, { color: colors.muted }]}>↺</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.nextBtn, { flex: 1, backgroundColor: colors.primary, borderBottomColor: colors.primaryDark }]}
                  activeOpacity={0.85}
                  onPress={advanceNext}
                  disabled={!awaitingNext}
                >
                  <Text style={styles.nextText}>→</Text>
                </TouchableOpacity>
              </View>
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
    paddingHorizontal: Spacing.xl,
  },
  problemText: {
    fontSize: 56,
    fontWeight: '800',
  },
  inlineReveal: {
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  reviewPill: {
    marginTop: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  reviewPillText: {
    ...Font.caption,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
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
  navRowHidden: {
    opacity: 0,
  },
  repeatBtn: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20, borderWidth: 2, borderBottomWidth: 4 },
  repeatText: { fontSize: 24, fontWeight: '700' },

  mcGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  mcBtnWrap: {
    width: '45%',
  },
  mcBtn: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  mcText: { ...Font.h2 },
  mcHintText: {
    ...Font.caption,
    marginTop: 4,
    opacity: 0.85,
  },
  optionKeyPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionKeyText: {
    ...Font.caption,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

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

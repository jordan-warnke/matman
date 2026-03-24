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
import MathText from '../../components/MathText';
import PeekHint from '../../components/PeekHint';
import SpreadsheetChrome from '../../components/SpreadsheetChrome';
import { Font, Spacing } from '../../constants/Theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useInlinePeek } from '../../hooks/useInlinePeek';
import { useWebShortcuts } from '../../hooks/useWebShortcuts';
import { AlgebraProblem, ALL_ALGEBRA_PROBLEMS, shuffleOptions } from '../../data/algebra';
import { ALL_WORD_PROBLEMS, shuffleWordOptions, WordProblem } from '../../data/wordprob';
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

interface Problem {
  display: string;
  question: string;
  answer: string;
  options: string[];
  hint: string;
  historyKey: string;
  category: string;
}

export default function AlgebraGameScreen() {
  const router = useRouter();
  const { colors, timed, isWork } = useTheme();
  const { type } = useLocalSearchParams<{ type: string }>();
  const gameType = (type || 'algebra-drill') as GameType;
  const isAlgebra = gameType === 'algebra-drill';

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
    const pool = isAlgebra ? ALL_ALGEBRA_PROBLEMS : ALL_WORD_PROBLEMS;
    const recent = new Set(recentRef.current);

    // Filter out recently-seen problems, but keep at least 1
    const eligible = pool.filter(p => !recent.has(p.historyKey));
    const candidates = eligible.length > 0 ? eligible : pool;

    // Pick from candidates weighted by ankiWeight (with jitter)
    let best: typeof candidates[0] = candidates[0];
    let bestW = -1;
    for (const item of candidates) {
      const w = ankiWeight(history[item.historyKey]) * (0.5 + Math.random());
      if (w > bestW) { bestW = w; best = item; }
    }

    // Track recent to prevent repeats
    recentRef.current = [...recentRef.current, best.historyKey].slice(-3);

    // Shuffle options
    const shuffled = isAlgebra
      ? shuffleOptions(best as AlgebraProblem)
      : shuffleWordOptions(best as WordProblem);

    return shuffled;
  }, [isAlgebra]);

  const [problem, setProblem] = useState<Problem | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('none');
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [awaitingNext, setAwaitingNext] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
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
    popIn();
    if (timed) startProblemTimer();
  }, [generate, answered, settings.problemCount, timed, startProblemTimer, popIn, resetPeek]);

  const repeatQuestion = useCallback(() => {
    if (problem) {
      const prevIdx = problem.options.indexOf(problem.answer);
      const pool = isAlgebra ? ALL_ALGEBRA_PROBLEMS : ALL_WORD_PROBLEMS;
      const original = pool.find(p => p.historyKey === problem.historyKey);
      if (original) {
        const reshuffled = isAlgebra
          ? shuffleOptions(original as AlgebraProblem, prevIdx)
          : shuffleWordOptions(original as WordProblem, prevIdx);
        setProblem(reshuffled);
      }
    }
    setFeedback('none');
    setAwaitingNext(false);
    setSelectedOption(null);
    resetPeek();
    submittedRef.current = false;
    problemStartRef.current = Date.now();
    if (timed) startProblemTimer();
  }, [timed, startProblemTimer, problem, isAlgebra, resetPeek]);

  const feedbackColor =
    feedback === 'correct' ? colors.correct
      : feedback === 'wrong' ? colors.error
        : colors.text;

  const workFormula = problem
    ? problem.display
    : '';

  useWebShortcuts(
    problem
      ? problem.options.map(opt =>
          feedback !== 'none' && opt === problem.answer ? advanceNext
          : feedback !== 'none' ? null
          : () => answer(opt))
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
      setSelectedOption(null);
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
            style={[styles.primaryBtn, { backgroundColor: colors.purple, borderBottomColor: colors.purpleDark }]}
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
      cellRef="B5"
      options={problem.options.map((opt) => ({
        label: String(opt),
        onPress: () => answer(opt),
      }))}
      feedbackState={feedback === 'none' ? null : feedback}
      correctAnswer={String(problem.answer)}
      peekValue={String(problem.answer)}
      peekVisible={peekVisible && feedback === 'none'}
      selectedValue={selectedOption ? String(selectedOption) : undefined}
      onBack={() => router.back()}
      onNext={awaitingNext ? advanceNext : undefined}
      onRepeat={awaitingNext ? repeatQuestion : undefined}
      onPeek={!awaitingNext && feedback === 'none' ? showPeek : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.back, { color: colors.purple }]}>←</Text>
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
        <View style={styles.problemInlineRow}>
          <View style={styles.promptBlock}>
            <Animated.View style={{ transform: [{ translateX: shakeAnim }, { scale: scaleAnim }] }}>
              <MathText text={problem.display} style={[styles.displayText, { color: feedbackColor }]} />
              <Text style={[styles.questionText, { color: colors.text }]}> 
                {problem.question}
              </Text>
            </Animated.View>
          </View>
          <MathText
            text={`= ${problem.answer}`}
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
          />
        </View>
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
              onPress={feedback !== 'none' && isCorrectOption ? advanceNext : () => answer(option)}
              disabled={feedback !== 'none' && !isCorrectOption}
            >
              <MathText
                text={option}
                style={[styles.optionText, { color: textColor }]}
                containerStyle={styles.optionContent}
                compact
                numberOfLines={2}
              />
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
              style={[styles.nextBtn, { flex: 1, backgroundColor: colors.purple, borderBottomColor: colors.purpleDark }]}
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
  promptBlock: {
    alignItems: 'center',
    flexShrink: 1,
  },
  categoryLabel: { ...Font.caption, marginBottom: Spacing.sm },
  displayText: { fontSize: 30, fontWeight: '900', textAlign: 'center', marginBottom: Spacing.md },
  questionText: { ...Font.h3, textAlign: 'center', marginBottom: Spacing.sm },
  inlineReveal: { ...Font.h2, minWidth: 72, textAlign: 'left' },
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
  optionContent: { width: '100%', justifyContent: 'center' },

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

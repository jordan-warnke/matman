import { useCallback, useEffect, useRef } from 'react';
import {
    getReviewPriority,
    History,
    loadHistory,
    recordByKey,
} from '../store/HistoryStore';
import {
    buildOptions,
    digitSwap,
    neighborProducts,
    offByN,
    offByOne,
} from '../utils/distractors';

export interface LDProblem {
  a: number;
  b: number;
  answer: number;
  options: number[];
  displayMode: 'multiply' | 'divide';
  resurfacing?: 'retry' | 'review';
  /** For divide mode: the dividend (a*b) */
  dividend?: number;
  /** For divide mode: the divisor */
  divisor?: number;
}

const RECENT_QUEUE_SIZE = 16;
const RETRY_MIN_GAP = 3;
const RETRY_MAX_GAP = 6;
const RETRY_MAX_WINDOW_MS = 15 * 60 * 1000;
const REVIEW_INJECTION_RATE = 0.4;

interface RetryEntry {
  key: string;
  gap: number;
  consecutiveCorrect: number;
}

function randomRetryGap(): number {
  return Math.floor(Math.random() * (RETRY_MAX_GAP - RETRY_MIN_GAP + 1)) + RETRY_MIN_GAP;
}

function pickWeighted<T>(pool: T[], getWeight: (entry: T) => number): T {
  const totalWeight = pool.reduce((sum, entry) => sum + Math.max(0, getWeight(entry)), 0);
  if (totalWeight <= 0) {
    return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
  }
  let rand = Math.random() * totalWeight;
  for (const entry of pool) {
    rand -= Math.max(0, getWeight(entry));
    if (rand <= 0) return entry;
  }
  return pool[pool.length - 1] ?? pool[0];
}

/**
 * Long Division problem generator — 3-digit multiplication/division.
 *
 * Supports:
 * - 3×1: 3-digit × 1-digit (100–999 × 2–12)
 * - 2×2: 2-digit × 2-digit (10–99 × 10–99)
 * - both: union of above pools
 *
 * Uses the same spaced repetition engine as useProblemGenerator.
 */
export function useLongDivGenerator(
  operandMode: '3x1' | '2x2' | 'both' = '3x1',
  questionStyle: 'standard' | 'reverse' | 'mix' = 'standard',
  anchor: number | null = null,
  minNumber = 2,
  maxNumber = 12,
  excludedNumbers: number[] = [],
  shuffleOrder = false,
) {
  const historyRef = useRef<History>({});
  const recentRef = useRef<string[]>([]);
  const retryQueueRef = useRef<RetryEntry[]>([]);

  const refreshHistory = useCallback(async () => {
    historyRef.current = await loadHistory();
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const generate = useCallback((): LDProblem => {
    const history = historyRef.current;
    const recentSet = new Set(recentRef.current);
    const excludedSet = new Set(excludedNumbers);

    retryQueueRef.current = retryQueueRef.current
      .map((entry) => ({ ...entry, gap: entry.gap - 1 }))
      .filter((entry) => {
        const record = history[entry.key];
        return record?.lastWrong != null && Date.now() - record.lastWrong <= RETRY_MAX_WINDOW_MS;
      });
    const readyRetryKeys = new Set(
      retryQueueRef.current.filter((entry) => entry.gap <= 0).map((entry) => entry.key),
    );

    // Build candidate pool
    const pool: {
      a: number;
      b: number;
      key: string;
      weight: number;
      reviewWeight: number;
      retryWeight: number;
      isDue: boolean;
      hasHistory: boolean;
      isRetryReady: boolean;
    }[] = [];

    // 3×1: a is a 3-digit number, b in [minNumber..maxNumber] (single digit range)
    // We sample a subset of 3-digit numbers to keep pool manageable
    if (operandMode === '3x1' || operandMode === 'both') {
      // Use a deterministic set of representative 3-digit numbers biased toward GMAT-relevant ranges
      const threeDigitBases = generateThreeDigitPool();

      if (anchor && anchor >= 2 && anchor <= 12) {
        // Anchor mode: b is fixed, a varies
        for (const a of threeDigitBases) {
          const key = `ld:${a}x${anchor}`;
          const priority = getReviewPriority(history[key]);
          let weight = priority.weight;
          if (recentSet.has(key)) weight = 0;
          const wrongCount = history[key]?.wrong ?? 0;
          pool.push({
            a, b: anchor, key, weight,
            reviewWeight: priority.weight,
            retryWeight: Math.max(1, priority.weight) * (1 + wrongCount),
            isDue: priority.isDue,
            hasHistory: !!history[key],
            isRetryReady: readyRetryKeys.has(key),
          });
        }
      } else {
        for (const a of threeDigitBases) {
          for (let b = minNumber; b <= maxNumber; b++) {
            if (excludedSet.has(b)) continue;
            const key = `ld:${a}x${b}`;
            const priority = getReviewPriority(history[key]);
            let weight = priority.weight;
            if (recentSet.has(key)) weight = 0;
            const wrongCount = history[key]?.wrong ?? 0;
            pool.push({
              a, b, key, weight,
              reviewWeight: priority.weight,
              retryWeight: Math.max(1, priority.weight) * (1 + wrongCount),
              isDue: priority.isDue,
              hasHistory: !!history[key],
              isRetryReady: readyRetryKeys.has(key),
            });
          }
        }
      }
    }

    // 2×2: both a and b are 2-digit numbers (10-99)
    if (operandMode === '2x2' || operandMode === 'both') {
      const twoDigitBases = generateTwoDigitPool();
      for (let i = 0; i < twoDigitBases.length; i++) {
        for (let j = i; j < twoDigitBases.length; j++) {
          const a = twoDigitBases[i];
          const b = twoDigitBases[j];
          const key = `ld:${a}x${b}`;
          const priority = getReviewPriority(history[key]);
          let weight = priority.weight;
          if (recentSet.has(key)) weight = 0;
          const wrongCount = history[key]?.wrong ?? 0;
          pool.push({
            a, b, key, weight,
            reviewWeight: priority.weight,
            retryWeight: Math.max(1, priority.weight) * (1 + wrongCount),
            isDue: priority.isDue,
            hasHistory: !!history[key],
            isRetryReady: readyRetryKeys.has(key),
          });
        }
      }
    }

    // If pool is empty (shouldn't happen), produce a fallback
    if (pool.length === 0) {
      const a = 123;
      const b = 4;
      return {
        a, b, answer: a * b, options: [a * b, a * b + 1, a * b - 1, a * b + 10],
        displayMode: 'multiply',
      };
    }

    // Scale recent queue
    const queueLimit = Math.max(2, Math.min(RECENT_QUEUE_SIZE, Math.floor(pool.length / 2) || 2));
    while (recentRef.current.length > queueLimit) recentRef.current.shift();

    const activePool = pool.filter((entry) => entry.weight > 0);
    const retryPool = pool.filter((entry) => entry.isRetryReady);
    const duePool = activePool.filter((entry) => entry.isDue);
    const shouldInjectReview = duePool.length > 0 && Math.random() < REVIEW_INJECTION_RATE;
    const standardPool = shouldInjectReview
      ? (duePool.length > 0 ? duePool : activePool)
      : activePool;
    const fallbackPool = duePool.length > 0 ? duePool : pool;
    const chosen = retryPool.length > 0
      ? pickWeighted(retryPool, (entry) => entry.retryWeight)
      : pickWeighted(
          standardPool.length > 0 ? standardPool : fallbackPool,
          (entry) => (standardPool.length > 0 ? entry.weight : entry.reviewWeight),
        );
    if (chosen.isRetryReady) {
      retryQueueRef.current = retryQueueRef.current.filter((entry) => entry.key !== chosen.key);
    }
    const resurfacing = chosen.isRetryReady
      ? 'retry'
      : chosen.hasHistory && chosen.isDue && shouldInjectReview
        ? 'review'
        : undefined;

    const product = chosen.a * chosen.b;

    // Track in recent queue
    const key = chosen.key;
    recentRef.current.push(key);

    const isReverse =
      questionStyle === 'reverse' ||
      (questionStyle === 'mix' && Math.random() < 0.5);

    if (isReverse && chosen.a !== 0 && chosen.b !== 0) {
      // Division: product ÷ divisor = ?
      const useA = Math.random() < 0.5;
      const divisor = useA ? chosen.a : chosen.b;
      const answer = useA ? chosen.b : chosen.a;

      const options = buildOptions({
        answer,
        count: 3,
        candidates: [
          offByOne(answer),
          offByN(answer, 2),
          offByN(answer, Math.max(1, Math.floor(answer * 0.1))),
          digitSwap(answer),
        ],
        namespace: 'longdiv-div',
        filter: (v) => v > 0,
      });

      return { a: chosen.a, b: chosen.b, answer, options, displayMode: 'divide', dividend: product, divisor, resurfacing };
    }

    // Multiplication: a × b = ?
    const answer = product;
    const displayA = shuffleOrder && Math.random() < 0.5 ? chosen.b : chosen.a;
    const displayB = displayA === chosen.a ? chosen.b : chosen.a;

    const options = buildOptions({
      answer,
      count: 3,
      candidates: [
        neighborProducts(answer, chosen.a, chosen.b),
        offByOne(answer),
        offByN(answer, chosen.b),
        offByN(answer, 10),
        digitSwap(answer),
      ],
      namespace: 'longdiv-mul',
      filter: (v) => v > 0,
    });

    return { a: displayA, b: displayB, answer, options, displayMode: 'multiply', resurfacing };
  }, [operandMode, questionStyle, anchor, minNumber, maxNumber, excludedNumbers, shuffleOrder]);

  const reshuffleOptions = useCallback((p: LDProblem): number[] => {
    const prevIdx = p.options.indexOf(p.answer);

    if (p.displayMode === 'divide' && p.divisor) {
      return buildOptions({
        answer: p.answer,
        count: 3,
        candidates: [
          offByOne(p.answer),
          offByN(p.answer, 2),
          offByN(p.answer, Math.max(1, Math.floor(p.answer * 0.1))),
          digitSwap(p.answer),
        ],
        namespace: 'longdiv-div',
        filter: (v) => v > 0,
      }, prevIdx);
    }

    return buildOptions({
      answer: p.answer,
      count: 3,
      candidates: [
        neighborProducts(p.answer, p.a, p.b),
        offByOne(p.answer),
        offByN(p.answer, p.b),
        offByN(p.answer, 10),
        digitSwap(p.answer),
      ],
      namespace: 'longdiv-mul',
      filter: (v) => v > 0,
    }, prevIdx);
  }, []);

  const record = useCallback(
    async (a: number, b: number, correct: boolean, timeMs: number) => {
      const key = `ld:${a}x${b}`;
      await recordByKey(key, correct, timeMs);
      historyRef.current = await loadHistory();
      if (correct) {
        const entry = retryQueueRef.current.find((e) => e.key === key);
        if (entry) {
          if (entry.consecutiveCorrect >= 1) {
            retryQueueRef.current = retryQueueRef.current.filter((e) => e.key !== key);
          } else {
            retryQueueRef.current = retryQueueRef.current.map((e) =>
              e.key === key
                ? { ...e, consecutiveCorrect: e.consecutiveCorrect + 1, gap: e.gap * 2 }
                : e,
            );
          }
        }
        return;
      }
      retryQueueRef.current = [
        ...retryQueueRef.current.filter((entry) => entry.key !== key),
        { key, gap: randomRetryGap(), consecutiveCorrect: 0 },
      ];
    },
    [],
  );

  return { generate, record, refreshHistory, reshuffleOptions };
}

// ── Pool generation helpers ────────────────────────────────

/**
 * Deterministic set of ~50 representative 3-digit numbers.
 * Focused on values commonly encountered in GMAT:
 * - Nice multiples (125, 150, 175, 200, 250, etc.)
 * - Numbers with interesting divisibility properties
 * - Random-looking numbers that require real computation
 */
function generateThreeDigitPool(): number[] {
  return [
    // Nice round numbers
    100, 125, 150, 175, 200, 225, 250, 275, 300, 350, 400, 450, 500, 600, 750, 800, 999,
    // Numbers requiring real mental math
    108, 112, 128, 132, 144, 156, 168, 192, 204, 216, 234, 252, 264, 288,
    312, 324, 336, 348, 372, 384, 396, 408, 432, 456, 468, 504, 528, 576,
    612, 648, 684, 720, 756, 792, 816, 864, 936, 972,
  ];
}

/**
 * Deterministic set of 2-digit numbers for 2×2 mode.
 * Focus on values 11-50 for reasonable product sizes.
 */
function generateTwoDigitPool(): number[] {
  return [
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 27, 28, 30, 32, 33,
    35, 36, 40, 42, 44, 45, 48, 50, 55, 60,
  ];
}

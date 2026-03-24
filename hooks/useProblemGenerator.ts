import { useCallback, useEffect, useRef } from 'react';
import { getReviewPriority, History, loadHistory, recordAttempt } from '../store/HistoryStore';
import {
    addInsteadOfMultiply,
    adjacentSquares,
    buildOptions,
    digitSwap,
    neighborProducts,
    offByN,
    offByOne,
    rootConfusion,
    sameRowProducts,
    squarePlusMinusN,
} from '../utils/distractors';

export interface Problem {
  a: number;
  b: number;
  answer: number;
  options: number[];
  displayMode: 'multiply' | 'divide' | 'square' | 'root' | 'cube' | 'cuberoot';
  resurfacing?: 'retry' | 'review';
  /** For divide mode: the dividend (a*b) */
  dividend?: number;
  /** For divide mode: the divisor */
  divisor?: number;
  /** For square/cube/root modes: the base number */
  base?: number;
  /** For root modes: the value to take root of */
  radicand?: number;
}

const RECENT_QUEUE_SIZE = 16;
const RETRY_MIN_GAP = 3;
const RETRY_MAX_GAP = 6;
const RETRY_MAX_WINDOW_MS = 15 * 60 * 1000;
const REVIEW_INJECTION_RATE = 0.4;

interface RetryEntry {
  key: string;
  gap: number;
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
 * Builds the full pool of problems.
 * - Without anchor: a ranges 1–13 freely, b ranges minNumber–maxNumber.
 * - With anchor: a is fixed to anchor, b ranges minNumber–maxNumber.
 *
 * @param anchor If set, one factor is always this number.
 */
export function useProblemGenerator(
  maxNumber: number,
  anchor?: number | null,
  minNumber = 1,
  questionStyle: 'standard' | 'reverse' | 'mix' = 'standard',
  operationType: 'multiply' | 'squares' | 'cubes' = 'multiply',
  excludedNumbers: number[] = [],
  excludeSquarePairs = false,
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

  const generate = useCallback((): Problem => {
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

    // Build candidate pool from mode filters first; review priority only ranks inside that pool.
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

    if (anchor && anchor >= 1) {
      // Anchor mode: a is fixed, b ranges minNumber–maxNumber
      for (let b = minNumber; b <= maxNumber; b++) {
        if (excludedSet.has(anchor) || excludedSet.has(b)) continue;
        if (excludeSquarePairs && operationType === 'multiply' && anchor === b) continue;
        const key = `${anchor}x${b}`;
        const priority = getReviewPriority(history[key]);
        const hasHistory = !!history[key];
        let weight = priority.weight;
        if (recentSet.has(key)) weight = 0;
        const wrongCount = history[key]?.wrong ?? 0;
        pool.push({
          a: anchor,
          b,
          key,
          weight,
          reviewWeight: priority.weight,
          retryWeight: Math.max(1, priority.weight) * (1 + wrongCount),
          isDue: priority.isDue,
          hasHistory,
          isRetryReady: readyRetryKeys.has(key),
        });
      }
    } else {
      // Free mode: both factors range minNumber–13 (capped by maxNumber for b)
      for (let a = minNumber; a <= 13; a++) {
        if (excludedSet.has(a)) continue;
        for (let b = minNumber; b <= maxNumber; b++) {
          if (excludedSet.has(b)) continue;
          if (excludeSquarePairs && operationType === 'multiply' && a === b) continue;
          const key = `${a}x${b}`;
          const priority = getReviewPriority(history[key]);
          const hasHistory = !!history[key];
          let weight = priority.weight;
          if (recentSet.has(key)) weight = 0;
          const wrongCount = history[key]?.wrong ?? 0;
          pool.push({
            a,
            b,
            key,
            weight,
            reviewWeight: priority.weight,
            retryWeight: Math.max(1, priority.weight) * (1 + wrongCount),
            isDue: priority.isDue,
            hasHistory,
            isRetryReady: readyRetryKeys.has(key),
          });
        }
      }
    }

    // Scale recent queue to pool size to avoid zeroing out small pools.
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

    // Track in recent queue (both orderings to prevent commutative repeats)
    const key = `${chosen.a}x${chosen.b}`;
    const rkey = `${chosen.b}x${chosen.a}`;
    recentRef.current.push(key);
    if (key !== rkey) recentRef.current.push(rkey);
    while (recentRef.current.length > queueLimit) recentRef.current.shift();

    const isReverse =
      questionStyle === 'reverse' ||
      (questionStyle === 'mix' && Math.random() < 0.5);

    // ── Squares mode ───────────────────────────────────────
    if (operationType === 'squares') {
      // Use factor `a` as the base (ignore b); pool still selects via weighted history
      const base = chosen.a;
      const square = base * base;

      if (isReverse && base !== 0) {
        // √square = ?
        const answer = base;
        const options = buildOptions({
          answer,
          count: 3,
          candidates: [
            offByOne(answer),
            offByN(answer, 2),
            rootConfusion(answer, square),
          ],
          namespace: 'times-tables-root',
        });
        return { a: chosen.a, b: chosen.b, answer, options, displayMode: 'root' as const, base, radicand: square, resurfacing };
      }

      // base² = ?
      const answer = square;
      const options = buildOptions({
        answer,
        count: 3,
        candidates: [
          adjacentSquares(base),
          squarePlusMinusN(base),
          offByOne(answer),
          digitSwap(answer),
        ],
        namespace: 'times-tables-sq',
      });
      return { a: chosen.a, b: chosen.b, answer, options, displayMode: 'square' as const, base, resurfacing };
    }

    // ── Cubes mode ─────────────────────────────────────────
    if (operationType === 'cubes') {
      const base = chosen.a;
      const cube = base * base * base;

      if (isReverse && base !== 0) {
        // ∛cube = ?
        const answer = base;
        const options = buildOptions({
          answer,
          count: 3,
          candidates: [
            offByOne(answer),
            offByN(answer, 2),
            [base * base], // common confusion: give the square instead
          ],
          namespace: 'times-tables-cbrt',
        });
        return { a: chosen.a, b: chosen.b, answer, options, displayMode: 'cuberoot' as const, base, radicand: cube, resurfacing };
      }

      // base³ = ?
      const answer = cube;
      const options = buildOptions({
        answer,
        count: 3,
        candidates: [
          [base * base],                       // square instead of cube
          [(base - 1) * (base - 1) * (base - 1), (base + 1) * (base + 1) * (base + 1)].filter(x => x > 0), // adjacent cubes
          offByN(answer, base),                 // n³ ± n
          offByOne(answer),
          digitSwap(answer),
        ],
        namespace: 'times-tables-cb',
      });
      return { a: chosen.a, b: chosen.b, answer, options, displayMode: 'cube' as const, base, resurfacing };
    }

    // ── Multiply / Divide mode ─────────────────────────────

    if (isReverse && chosen.a !== 0 && chosen.b !== 0) {
      // Pick which factor is the divisor (random)
      const useA = Math.random() < 0.5;
      const divisor = useA ? chosen.a : chosen.b;
      const answer = useA ? chosen.b : chosen.a;

      const options = buildOptions({
        answer,
        count: 3,
        candidates: [
          [answer + 1, answer - 1].filter(x => x > 0),
          [answer + 2, answer - 2].filter(x => x > 0),
          neighborProducts(product, chosen.a, chosen.b).map(p => Math.round(p / divisor)).filter(x => x > 0 && x !== answer),
          sameRowProducts(chosen.a, chosen.b, maxNumber).map(p => Math.round(p / divisor)).filter(x => x > 0 && x !== answer),
        ],
        namespace: 'times-tables-div',
      });

      return { a: chosen.a, b: chosen.b, answer, options, displayMode: 'divide' as const, dividend: product, divisor, resurfacing };
    }

    // Standard multiplication
    const answer = product;

    const options = buildOptions({
      answer,
      count: 3,
      candidates: [
        neighborProducts(answer, chosen.a, chosen.b),
        offByOne(answer),
        sameRowProducts(chosen.a, chosen.b, maxNumber),
        digitSwap(answer),
        addInsteadOfMultiply(chosen.a, chosen.b),
      ],
      namespace: 'times-tables',
    });

    return { a: chosen.a, b: chosen.b, answer, options, displayMode: 'multiply' as const, resurfacing };
  }, [maxNumber, anchor, minNumber, questionStyle, operationType, excludedNumbers, excludeSquarePairs]);

  const reshuffleOptions = useCallback((p: Problem): number[] => {
    const prevIdx = p.options.indexOf(p.answer);

    if (p.displayMode === 'root' && p.base) {
      return buildOptions({
        answer: p.answer,
        count: 3,
        candidates: [
          offByOne(p.answer),
          offByN(p.answer, 2),
          rootConfusion(p.answer, p.radicand!),
        ],
        namespace: 'times-tables-root',
      }, prevIdx);
    }

    if (p.displayMode === 'square' && p.base) {
      return buildOptions({
        answer: p.answer,
        count: 3,
        candidates: [
          adjacentSquares(p.base),
          squarePlusMinusN(p.base),
          offByOne(p.answer),
          digitSwap(p.answer),
        ],
        namespace: 'times-tables-sq',
      }, prevIdx);
    }

    if (p.displayMode === 'cuberoot' && p.base) {
      return buildOptions({
        answer: p.answer,
        count: 3,
        candidates: [
          offByOne(p.answer),
          offByN(p.answer, 2),
          [p.base * p.base],
        ],
        namespace: 'times-tables-cbrt',
      }, prevIdx);
    }

    if (p.displayMode === 'cube' && p.base) {
      return buildOptions({
        answer: p.answer,
        count: 3,
        candidates: [
          [p.base * p.base],
          [(p.base - 1) ** 3, (p.base + 1) ** 3].filter(x => x > 0),
          offByN(p.answer, p.base),
          offByOne(p.answer),
          digitSwap(p.answer),
        ],
        namespace: 'times-tables-cb',
      }, prevIdx);
    }

    if (p.displayMode === 'divide' && p.divisor) {
      const product = p.a * p.b;
      return buildOptions({
        answer: p.answer,
        count: 3,
        candidates: [
          [p.answer + 1, p.answer - 1].filter(x => x > 0),
          [p.answer + 2, p.answer - 2].filter(x => x > 0),
          neighborProducts(product, p.a, p.b).map(pr => Math.round(pr / p.divisor!)).filter(x => x > 0 && x !== p.answer),
          sameRowProducts(p.a, p.b, maxNumber).map(pr => Math.round(pr / p.divisor!)).filter(x => x > 0 && x !== p.answer),
        ],
        namespace: 'times-tables-div',
      }, prevIdx);
    }

    return buildOptions({
      answer: p.answer,
      count: 3,
      candidates: [
        neighborProducts(p.answer, p.a, p.b),
        offByOne(p.answer),
        sameRowProducts(p.a, p.b, maxNumber),
        digitSwap(p.answer),
        addInsteadOfMultiply(p.a, p.b),
      ],
      namespace: 'times-tables',
    }, prevIdx);
  }, [maxNumber]);

  const record = useCallback(
    async (a: number, b: number, correct: boolean, timeMs: number) => {
      await recordAttempt(a, b, correct, timeMs);
      historyRef.current = await loadHistory();
      const key = `${a}x${b}`;
      if (correct) {
        retryQueueRef.current = retryQueueRef.current.filter((entry) => entry.key !== key);
        return;
      }
      retryQueueRef.current = [
        ...retryQueueRef.current.filter((entry) => entry.key !== key),
        { key, gap: randomRetryGap() },
      ];
    },
    [],
  );

  return { generate, record, refreshHistory, reshuffleOptions };
}

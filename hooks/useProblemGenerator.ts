import { useCallback, useEffect, useRef } from 'react';
import { History, ankiWeight, loadHistory, loadKnown, loadStruggles, recordAttempt } from '../store/HistoryStore';
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
) {
  const historyRef = useRef<History>({});
  const strugglesRef = useRef<Set<string>>(new Set());
  const knownRef = useRef<Set<string>>(new Set());
  const recentRef = useRef<string[]>([]);

  const refreshHistory = useCallback(async () => {
    historyRef.current = await loadHistory();
    strugglesRef.current = await loadStruggles();
    knownRef.current = await loadKnown();
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const generate = useCallback((): Problem => {
    const history = historyRef.current;
    const struggles = strugglesRef.current;
    const known = knownRef.current;
    const recentSet = new Set(recentRef.current);

    // Build candidate pool
    const pool: { a: number; b: number; weight: number }[] = [];

    if (anchor && anchor >= 1) {
      // Anchor mode: a is fixed, b ranges minNumber–maxNumber
      for (let b = minNumber; b <= maxNumber; b++) {
        const key = `${anchor}x${b}`;
        const rkey = `${b}x${anchor}`;
        let weight = ankiWeight(history[key], struggles.has(key) || struggles.has(rkey), known.has(key) || known.has(rkey));
        if (recentSet.has(key) || recentSet.has(rkey)) weight = 0;
        pool.push({ a: anchor, b, weight });
      }
    } else {
      // Free mode: a ranges 1–13, b ranges minNumber–maxNumber
      for (let a = 1; a <= 13; a++) {
        for (let b = minNumber; b <= maxNumber; b++) {
          const key = `${a}x${b}`;
          const rkey = `${b}x${a}`;
          let weight = ankiWeight(history[key], struggles.has(key) || struggles.has(rkey), known.has(key) || known.has(rkey));
          if (recentSet.has(key) || recentSet.has(rkey)) weight = 0;
          pool.push({ a, b, weight });
        }
      }
    }

    // Weighted random selection
    let totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);

    // If all weights are 0 (tiny pool + all recent), reset weights to 1
    if (totalWeight <= 0) {
      for (const p of pool) p.weight = 1;
      totalWeight = pool.length;
    }

    let rand = Math.random() * totalWeight;
    let chosen = pool[0];
    for (const entry of pool) {
      rand -= entry.weight;
      if (rand <= 0) {
        chosen = entry;
        break;
      }
    }

    const product = chosen.a * chosen.b;

    // Track in recent queue (both orderings to prevent commutative repeats)
    const key = `${chosen.a}x${chosen.b}`;
    const rkey = `${chosen.b}x${chosen.a}`;
    recentRef.current.push(key);
    if (key !== rkey) recentRef.current.push(rkey);
    while (recentRef.current.length > RECENT_QUEUE_SIZE) recentRef.current.shift();

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
        return { a: chosen.a, b: chosen.b, answer, options, displayMode: 'root' as const, base, radicand: square };
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
      return { a: chosen.a, b: chosen.b, answer, options, displayMode: 'square' as const, base };
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
        return { a: chosen.a, b: chosen.b, answer, options, displayMode: 'cuberoot' as const, base, radicand: cube };
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
      return { a: chosen.a, b: chosen.b, answer, options, displayMode: 'cube' as const, base };
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

      return { a: chosen.a, b: chosen.b, answer, options, displayMode: 'divide' as const, dividend: product, divisor };
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

    return { a: chosen.a, b: chosen.b, answer, options, displayMode: 'multiply' as const };
  }, [maxNumber, anchor, minNumber, questionStyle, operationType]);

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
    },
    [],
  );

  return { generate, record, refreshHistory, reshuffleOptions };
}

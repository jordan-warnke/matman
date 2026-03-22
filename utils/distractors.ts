/**
 * Shared distractor generation engine for GMAT-quality multiple choice.
 *
 * Design principles (Duolingo/GMAT-inspired):
 *  - Every wrong option should be plausible — close to the correct answer
 *  - Distractors target common mental-math errors (off-by-one, neighbor products, digit swaps)
 *  - A sliding window prevents the same distractors from repeating across consecutive questions
 *  - Strategies are composable: each mode can pick the strategies that fit its domain
 */

// ── Sliding-window distractor cycling ──────────────────────

const RECENT_DISTRACTOR_WINDOW = 12; // track last ~3 problems' worth of distractors (3 × 4 options ≈ 12)
const recentDistractors = new Map<string, number[]>(); // namespace → recent values

function getRecentSet(namespace: string): Set<number> {
  return new Set(recentDistractors.get(namespace) ?? []);
}

function recordDistractors(namespace: string, values: number[]) {
  const list = recentDistractors.get(namespace) ?? [];
  list.push(...values);
  while (list.length > RECENT_DISTRACTOR_WINDOW) list.shift();
  recentDistractors.set(namespace, list);
}

// ── Strategy functions ─────────────────────────────────────
// Each returns an array of candidate distractors (may include duplicates or invalid values — filtered later)

/** answer ± 1 — the classic "almost right" trap */
export function offByOne(answer: number): number[] {
  return [answer - 1, answer + 1];
}

/** Products using neighboring factors: for a×b, try (a±1)×b and a×(b±1) */
export function neighborProducts(answer: number, a: number, b: number): number[] {
  const results: number[] = [];
  for (const da of [-1, 1]) {
    const na = a + da;
    if (na >= 1) results.push(na * b);
  }
  for (const db of [-1, 1]) {
    const nb = b + db;
    if (nb >= 1) results.push(a * nb);
  }
  return results;
}

/** Same-row products: other products in the same times-table row (same 'a', different 'b') */
export function sameRowProducts(a: number, b: number, maxNumber: number): number[] {
  const results: number[] = [];
  for (const delta of [-2, 2, -3, 3]) {
    const nb = b + delta;
    if (nb >= 1 && nb <= maxNumber) results.push(a * nb);
  }
  return results;
}

/** Swap digits of a 2+ digit number: 56 → 65 */
export function digitSwap(answer: number): number[] {
  if (answer < 10) return [];
  const s = String(answer);
  // Swap first two digits
  const swapped = Number(s[1] + s[0] + s.slice(2));
  if (swapped !== answer && swapped > 0) return [swapped];
  // For 3-digit: also try swapping last two
  if (s.length >= 3) {
    const swapped2 = Number(s.slice(0, -2) + s[s.length - 1] + s[s.length - 2]);
    if (swapped2 !== answer && swapped2 > 0) return [swapped2];
  }
  return [];
}

/** Common mistake: a + b instead of a × b */
export function addInsteadOfMultiply(a: number, b: number): number[] {
  return [a + b];
}

/** answer ± n (off-by-n trap, common in squares: n² vs n²+n) */
export function offByN(answer: number, n: number): number[] {
  return [answer - n, answer + n].filter((v) => v > 0);
}

/** Adjacent perfect squares: (n±1)², (n±2)² */
export function adjacentSquares(n: number): number[] {
  const results: number[] = [];
  for (const delta of [-2, -1, 1, 2]) {
    const adj = n + delta;
    if (adj >= 2) results.push(adj * adj);
  }
  return results;
}

/** n² ± n trap: confusing n² with n(n+1) or n(n-1) */
export function squarePlusMinusN(n: number): number[] {
  return [n * n + n, n * n - n].filter((v) => v > 0);
}

/** For root problems: factors of n² that aren't n, plus half/double */
export function rootConfusion(answer: number, square: number): number[] {
  const results: number[] = [];
  // factors of the square that aren't the answer
  for (let f = 2; f <= Math.sqrt(square); f++) {
    if (square % f === 0) {
      if (f !== answer) results.push(f);
      const pair = square / f;
      if (pair !== answer) results.push(pair);
    }
  }
  // half/double
  if (answer % 2 === 0 && answer / 2 >= 2) results.push(answer / 2);
  results.push(answer * 2);
  return results;
}

// ── Core engine ────────────────────────────────────────────

export interface DistractorConfig {
  answer: number;
  /** How many distractors needed (total options - 1, typically 3) */
  count: number;
  /** Ordered list of candidate arrays, highest priority first */
  candidates: number[][];
  /** Namespace for cycling (e.g., 'times-tables', 'arithmetic-sq') */
  namespace: string;
  /** Filter: only keep values matching this predicate (default: > 0) */
  filter?: (v: number) => boolean;
}

/**
 * Build `count` unique distractors from prioritized candidate lists.
 * - Deduplicates against answer and each other
 * - Prefers candidates not recently used (cycling)
 * - Falls back to lower-priority candidates, then answer ± offset
 */
export function buildDistractors(config: DistractorConfig): number[] {
  const { answer, count, candidates, namespace, filter = (v) => v > 0 } = config;
  const recent = getRecentSet(namespace);
  const chosen = new Set<number>();

  // Flatten all candidates into priority tiers
  const allCandidates: number[] = [];
  for (const tier of candidates) {
    for (const c of tier) {
      if (c !== answer && filter(c) && Number.isFinite(c)) {
        allCandidates.push(c);
      }
    }
  }

  // First pass: prefer candidates NOT recently used
  for (const c of allCandidates) {
    if (chosen.size >= count) break;
    if (!chosen.has(c) && !recent.has(c)) {
      chosen.add(c);
    }
  }

  // Second pass: allow recently used if we still need more
  for (const c of allCandidates) {
    if (chosen.size >= count) break;
    if (!chosen.has(c)) {
      chosen.add(c);
    }
  }

  // Final fallback: offset from answer
  let offset = 1;
  while (chosen.size < count) {
    const candidate = answer + offset;
    if (candidate !== answer && filter(candidate) && !chosen.has(candidate)) {
      chosen.add(candidate);
    }
    offset = offset > 0 ? -offset : -offset + 1; // alternate: +1, -1, +2, -2, ...
  }

  const result = Array.from(chosen);
  recordDistractors(namespace, result);
  return result;
}

/**
 * Combine correct answer + distractors and shuffle.
 * Uses Fisher-Yates for uniform distribution.
 */
export function shuffleOptions<T>(options: T[]): T[] {
  const a = [...options];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Shuffle but bias one element away from a given index.
 * ~85 % of the time the element lands in a different slot.
 */
export function shuffleAvoidIndex<T>(arr: T[], item: T, avoidIdx: number): T[] {
  for (let attempt = 0; attempt < 6; attempt++) {
    const s = shuffleOptions(arr);
    if (s.indexOf(item) !== avoidIdx) return s;
  }
  return shuffleOptions(arr);
}

/**
 * Convenience: generate distractors and return shuffled [answer, ...distractors].
 * Pass `avoidAnswerAt` (previous answer index) on repeat to bias away from that slot.
 */
export function buildOptions(config: DistractorConfig, avoidAnswerAt?: number): number[] {
  const distractors = buildDistractors(config);
  const all = [config.answer, ...distractors];
  if (avoidAnswerAt !== undefined && avoidAnswerAt >= 0) {
    return shuffleAvoidIndex(all, config.answer, avoidAnswerAt);
  }
  return shuffleOptions(all);
}

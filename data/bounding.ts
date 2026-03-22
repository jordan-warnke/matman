/**
 * Bounding & Estimation — "Lazy Math" engine.
 *
 * Problem types:
 *  1. Difference of squares:  (base ± offset) × (base ∓ offset)  vs  base²
 *  2. Near-round products:     n × m  where one factor is near a round number
 *  3. Percentage estimation:   "X% of Y" vs a benchmark
 *  4. Square proximity:        n²  vs a benchmark
 */

export type BoundOp = '<' | '>';

export interface BoundingProblem {
  /** Display string, e.g. "48 × 52" */
  display: string;
  /** Benchmark to compare against, e.g. 2500 */
  benchmark: number;
  /** Correct relation: '<' or '>' */
  answer: BoundOp;
  /** Short explanation shown after wrong answer */
  hint: string;
  /** History key for spaced repetition */
  historyKey: string;
}

// ── generators ─────────────────────────────────────────────

function diffOfSquares(): BoundingProblem {
  const base = pick([20, 25, 30, 40, 50, 60, 75, 100]);
  const offset = pick([1, 2, 3, 4, 5]);
  const a = base - offset;
  const b = base + offset;
  const product = a * b; // = base² - offset²
  const benchmark = base * base;
  return {
    display: `${a} × ${b}`,
    benchmark,
    answer: '<',
    hint: `(${base}−${offset})(${base}+${offset}) = ${base}² − ${offset}² = ${product}`,
    historyKey: `bound:ds:${base}:${offset}`,
  };
}

function nearRoundProduct(): BoundingProblem {
  const round = pick([20, 25, 30, 40, 50, 100]);
  const tweak = pick([1, 2, 3]);
  const other = pick([3, 4, 5, 6, 7, 8, 9, 12, 15]);
  // e.g. 49 × 6 vs 50 × 6
  const a = round - tweak;
  const product = a * other;
  const benchmark = round * other;
  // product is always less than benchmark (round × other)
  return {
    display: `${a} × ${other}`,
    benchmark,
    answer: '<',
    hint: `${a} × ${other} = ${product} (just under ${round} × ${other} = ${benchmark})`,
    historyKey: `bound:nr:${a}:${other}`,
  };
}

function nearRoundProductOver(): BoundingProblem {
  const round = pick([20, 25, 30, 40, 50, 100]);
  const tweak = pick([1, 2, 3]);
  const other = pick([3, 4, 5, 6, 7, 8, 9, 12, 15]);
  const a = round + tweak;
  const product = a * other;
  const benchmark = round * other;
  return {
    display: `${a} × ${other}`,
    benchmark,
    answer: '>',
    hint: `${a} × ${other} = ${product} (just over ${round} × ${other} = ${benchmark})`,
    historyKey: `bound:nro:${a}:${other}`,
  };
}

function percentEstimate(): BoundingProblem {
  const pct = pick([15, 18, 22, 33, 45, 65, 72, 85]);
  const base = pick([80, 120, 150, 200, 250, 400, 500, 800]);
  const exact = (pct / 100) * base;
  // Round the benchmark away from exact so there's a clear answer
  const benchRound = Math.round(exact / 10) * 10;
  let benchmark: number;
  let answer: BoundOp;
  if (benchRound === exact) {
    // Exact is round — shift benchmark
    benchmark = benchRound + pick([5, 10]);
    answer = '<';
  } else if (exact < benchRound) {
    benchmark = benchRound;
    answer = '<';
  } else {
    benchmark = benchRound;
    answer = '>';
  }
  return {
    display: `${pct}% of ${base}`,
    benchmark,
    answer,
    hint: `${pct}% of ${base} = ${exact}`,
    historyKey: `bound:pct:${pct}:${base}`,
  };
}

function squareProximity(): BoundingProblem {
  const n = pick([11, 13, 14, 16, 17, 19, 21, 23, 24, 26, 27, 29, 31]);
  const sq = n * n;
  // Benchmark: nearest round multiple of 10 or 25
  const anchors = [100, 150, 175, 200, 250, 300, 400, 500, 600, 625, 700, 750, 800, 900, 1000];
  let benchmark = anchors[0];
  let bestDist = Math.abs(sq - benchmark);
  for (const a of anchors) {
    const d = Math.abs(sq - a);
    if (d > 0 && d < bestDist) {
      bestDist = d;
      benchmark = a;
    }
  }
  const answer: BoundOp = sq < benchmark ? '<' : '>';
  return {
    display: `${n}²`,
    benchmark,
    answer,
    hint: `${n}² = ${sq}`,
    historyKey: `bound:sq:${n}`,
  };
}

// ── public API ─────────────────────────────────────────────

const GENERATORS = [
  diffOfSquares,
  diffOfSquares,      // weight diff-of-squares more heavily — it's the core skill
  nearRoundProduct,
  nearRoundProductOver,
  percentEstimate,
  squareProximity,
];

export function generateBoundingProblem(): BoundingProblem {
  const gen = GENERATORS[Math.floor(Math.random() * GENERATORS.length)];
  return gen();
}

// ── util ───────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

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
  /** Optional display override for benchmark (e.g. "3/5" instead of 0.6) */
  benchmarkDisplay?: string;
  /** Exact numeric value of the expression (for number line) */
  exactValue: number;
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
    exactValue: product,
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
    exactValue: product,
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
    exactValue: product,
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
    exactValue: exact,
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
    exactValue: sq,
    answer,
    hint: `${n}² = ${sq}`,
    historyKey: `bound:sq:${n}`,
  };
}

// ── Fraction generators ────────────────────────────────────

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Compare two close fractions — cross-multiplication drill */
function fractionCompare(): BoundingProblem {
  const PAIRS: { a: [number, number]; b: [number, number] }[] = [
    { a: [3, 7], b: [5, 12] },
    { a: [5, 8], b: [7, 11] },
    { a: [4, 9], b: [7, 16] },
    { a: [5, 11], b: [9, 20] },
    { a: [3, 8], b: [5, 13] },
    { a: [5, 9], b: [4, 7] },
    { a: [7, 11], b: [9, 14] },
    { a: [8, 13], b: [5, 8] },
    { a: [6, 11], b: [7, 13] },
    { a: [3, 11], b: [2, 7] },
    { a: [5, 7], b: [9, 13] },
    { a: [4, 7], b: [5, 9] },
    { a: [7, 10], b: [5, 7] },
    { a: [3, 5], b: [5, 8] },
    { a: [2, 9], b: [3, 13] },
  ];
  const pair = pick(PAIRS);
  const swap = Math.random() < 0.5;
  const [nA, dA] = swap ? pair.b : pair.a;
  const [nB, dB] = swap ? pair.a : pair.b;
  const valA = nA / dA;
  const valB = nB / dB;
  const answer: BoundOp = valA < valB ? '<' : '>';
  return {
    display: `${nA}/${dA}`,
    benchmark: valB,
    benchmarkDisplay: `${nB}/${dB}`,
    exactValue: valA,
    answer,
    hint: `Cross-multiply: ${nA}×${dB} = ${nA * dB} vs ${dA}×${nB} = ${dA * nB}`,
    historyKey: `bound:fc:${nA}${dA}:${nB}${dB}`,
  };
}

/** Add two fractions, compare to a benchmark fraction */
function fractionSum(): BoundingProblem {
  const CONFIGS: { fracs: [number, number][]; bench: [number, number] }[] = [
    { fracs: [[1, 3], [1, 4]], bench: [1, 2] },
    { fracs: [[1, 5], [1, 6]], bench: [1, 3] },
    { fracs: [[1, 3], [1, 5]], bench: [1, 2] },
    { fracs: [[2, 5], [1, 4]], bench: [2, 3] },
    { fracs: [[1, 4], [1, 6]], bench: [2, 5] },
    { fracs: [[3, 8], [1, 6]], bench: [1, 2] },
    { fracs: [[2, 7], [1, 3]], bench: [3, 5] },
    { fracs: [[1, 4], [1, 3]], bench: [3, 5] },
    { fracs: [[3, 10], [2, 5]], bench: [3, 4] },
    { fracs: [[1, 6], [1, 8]], bench: [1, 3] },
  ];
  const cfg = pick(CONFIGS);
  const [[n1, d1], [n2, d2]] = cfg.fracs;
  const [nb, db] = cfg.bench;
  const val = n1 / d1 + n2 / d2;
  const benchVal = nb / db;
  const answer: BoundOp = val < benchVal ? '<' : '>';
  const lcd = (d1 * d2) / gcd(d1, d2);
  const adj1 = n1 * (lcd / d1);
  const adj2 = n2 * (lcd / d2);
  return {
    display: `${n1}/${d1} + ${n2}/${d2}`,
    benchmark: benchVal,
    benchmarkDisplay: `${nb}/${db}`,
    exactValue: val,
    answer,
    hint: `${n1}/${d1} + ${n2}/${d2} = ${adj1}/${lcd} + ${adj2}/${lcd} = ${adj1 + adj2}/${lcd}`,
    historyKey: `bound:fs:${n1}${d1}${n2}${d2}:${nb}${db}`,
  };
}

/** Fraction of a whole number vs round benchmark */
function fractionOfWhole(): BoundingProblem {
  const FRACS: [number, number][] = [
    [2, 3], [3, 4], [5, 6], [3, 7], [4, 9], [5, 8], [7, 12],
    [3, 8], [2, 7], [5, 9], [4, 7], [7, 10], [5, 11],
  ];
  const WHOLES = [120, 150, 180, 200, 240, 250, 270, 280, 300, 350, 400, 450, 500];
  const [num, den] = pick(FRACS);
  const whole = pick(WHOLES);
  const exact = (num / den) * whole;
  const roundTo = exact >= 100 ? 10 : 5;
  let benchmark = Math.round(exact / roundTo) * roundTo;
  if (Math.abs(benchmark - exact) < 0.5) {
    benchmark += (Math.random() < 0.5 ? 1 : -1) * roundTo;
  }
  const answer: BoundOp = exact < benchmark ? '<' : '>';
  const fmtExact = exact % 1 === 0 ? String(exact) : exact.toFixed(1);
  return {
    display: `${num}/${den} of ${whole}`,
    benchmark,
    exactValue: exact,
    answer,
    hint: `${num}/${den} × ${whole} = ${fmtExact}`,
    historyKey: `bound:fw:${num}${den}:${whole}`,
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
  fractionCompare,
  fractionCompare,    // weight fractions for cross-multiplication practice
  fractionSum,
  fractionOfWhole,
];

export function generateBoundingProblem(): BoundingProblem {
  const gen = GENERATORS[Math.floor(Math.random() * GENERATORS.length)];
  return gen();
}

// ── util ───────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

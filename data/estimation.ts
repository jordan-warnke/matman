/**
 * Procedural estimation problem generator — GMAT-style numerical approximation drills.
 *
 * Each problem shows a complex expression; the user picks the closest estimate
 * from 4 multiple-choice options.
 */

export interface EstimationProblem {
  display: string;      // the expression shown (e.g. "0.789 ÷ 0.263")
  question: string;     // always "Which is closest?"
  answer: string;       // the correct MC option (string)
  options: string[];    // 4 shuffled options including answer
  hint: string;         // brief explanation of the estimation shortcut
  historyKey: string;   // deterministic key for spaced-repetition
  category: string;     // human-readable category label
}

/* ── tiny helpers ─────────────────────────────────────────── */

function randInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function round(n: number, dp: number = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  // trim trailing zeros but keep at least one decimal if needed
  return n.toFixed(4).replace(/\.?0+$/, '');
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate 3 plausible distractors around the correct value.
 * Distractors are spread so no two are too close.
 */
function makeDistractors(correct: number, count: number = 3): number[] {
  const distractors: number[] = [];
  const used = new Set<string>();
  used.add(fmt(correct));

  // Generate multipliers that create plausible wrong estimates
  const multipliers = [0.25, 0.4, 0.5, 0.6, 0.7, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0];

  let tries = 0;
  while (distractors.length < count && tries < 60) {
    tries++;
    const m = pick(multipliers);
    let d = round(correct * m);
    // For very small values ensure distractors stay positive
    if (d <= 0) d = round(correct * pick([1.5, 2.0, 2.5, 3.0]));
    const key = fmt(d);
    if (!used.has(key) && d > 0) {
      used.add(key);
      distractors.push(d);
    }
  }

  // Fallback fill if not enough distinct
  while (distractors.length < count) {
    const d = round(correct * (1 + (distractors.length + 1) * 0.5));
    distractors.push(d);
  }

  return distractors;
}

function buildProblem(
  display: string,
  correct: number,
  hint: string,
  category: string,
  keyTag: string,
): EstimationProblem {
  const correctVal = round(correct);
  const distractors = makeDistractors(correctVal);
  const options = shuffle([correctVal, ...distractors].map(fmt));
  return {
    display,
    question: 'Which is closest?',
    answer: fmt(correctVal),
    options,
    hint,
    historyKey: `est-${keyTag}`,
    category,
  };
}

/* ═══════════════════════════════════════════════════════════
   Category generators
   ═══════════════════════════════════════════════════════════ */

// 1. Decimal division  —  e.g. 0.789 ÷ 0.263 ≈ 3
function decimalDivision(): EstimationProblem {
  // Generate numerator & denominator with 2-3 decimal digits
  const nInt = randInt(10, 999);
  const dInt = randInt(10, 999);
  const nDec = nInt / 1000;
  const dDec = dInt / 1000;
  const correct = nDec / dDec;
  const display = `${nDec.toFixed(3)} ÷ ${dDec.toFixed(3)}`;
  return buildProblem(
    display,
    correct,
    `≈ ${fmt(round(nDec, 2))} ÷ ${fmt(round(dDec, 2))} ≈ ${fmt(round(correct))}`,
    'Decimal Division',
    `dd-${nInt}-${dInt}`,
  );
}

// 2. Decimal multiplication  —  e.g. 0.49 × 0.31 ≈ 0.15
function decimalMultiplication(): EstimationProblem {
  const a = randInt(11, 99) / 100;
  const b = randInt(11, 99) / 100;
  const correct = a * b;
  const display = `${a.toFixed(2)} × ${b.toFixed(2)}`;
  return buildProblem(
    display,
    correct,
    `≈ ${fmt(round(a, 1))} × ${fmt(round(b, 1))} ≈ ${fmt(round(correct))}`,
    'Decimal Multiplication',
    `dm-${Math.round(a * 100)}-${Math.round(b * 100)}`,
  );
}

// 3. Percentage of a number  —  e.g. 17% of 589 ≈ 100
function percentageOfNumber(): EstimationProblem {
  const pct = pick([3, 7, 8, 11, 13, 17, 19, 23, 27, 31, 37, 41, 43, 47]);
  const base = pick([189, 247, 312, 389, 418, 493, 527, 589, 614, 723, 789, 847, 913, 967, 1234, 1567, 1893, 2456]);
  const correct = (pct / 100) * base;
  const display = `${pct}% of ${base}`;
  return buildProblem(
    display,
    correct,
    `${pct}% ≈ ${fmt(round(pct / 100, 2))} → ${fmt(round(pct / 100, 2))} × ${base} ≈ ${fmt(round(correct))}`,
    'Percentage',
    `pn-${pct}-${base}`,
  );
}

// 4. Square root estimation  —  e.g. √50 ≈ 7.07
function squareRootEstimation(): EstimationProblem {
  // Pick non-perfect-square values that require estimation
  const candidates = [
    2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20,
    21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 37,
    38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 50, 51, 52, 53, 54,
    55, 56, 57, 58, 59, 60, 61, 62, 63, 65, 66, 67, 68, 69, 70,
    72, 73, 74, 75, 76, 77, 78, 79, 80, 82, 83, 84, 85, 86, 87,
    88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,
    101, 102, 103, 104, 105, 110, 112, 115, 117, 118, 120, 123,
    125, 127, 128, 130, 131, 133, 135, 137, 138, 140, 142, 145,
    148, 150, 153, 155, 157, 160, 162, 163, 165, 167, 170, 172,
    175, 178, 180, 182, 185, 188, 190, 192, 195, 197, 200,
  ];
  const n = pick(candidates);
  const correct = Math.sqrt(n);
  const display = `√${n}`;
  return buildProblem(
    display,
    correct,
    `√${n}: between √${Math.floor(correct) ** 2} and √${(Math.floor(correct) + 1) ** 2}`,
    'Square Root',
    `sr-${n}`,
  );
}

// 5. Large multiplication  —  e.g. 199 × 32 ≈ 6400
function largeMultiplication(): EstimationProblem {
  const aChoices = [19, 21, 23, 27, 29, 31, 33, 37, 39, 41, 43, 47, 49,
                    51, 53, 57, 59, 61, 63, 67, 69, 71, 73, 77, 79,
                    81, 83, 87, 89, 91, 93, 97, 99,
                    101, 103, 107, 109, 111, 113, 119, 121, 123, 127, 129,
                    131, 137, 139, 141, 143, 147, 149, 151, 153,
                    157, 159, 161, 163, 167, 169, 171, 173, 177, 179,
                    181, 183, 187, 189, 191, 193, 197, 199];
  const bChoices = [11, 13, 17, 19, 21, 23, 27, 29, 31, 33, 37, 39, 41, 43, 47, 49];
  const a = pick(aChoices);
  const b = pick(bChoices);
  const correct = a * b;
  const display = `${a} × ${b}`;
  // Round a and b to nearest 10 for hint
  const aRound = Math.round(a / 10) * 10;
  const bRound = Math.round(b / 10) * 10;
  return buildProblem(
    display,
    correct,
    `≈ ${aRound} × ${bRound} = ${aRound * bRound}`,
    'Large Multiplication',
    `lm-${a}-${b}`,
  );
}

// 6. Combined operations  —  e.g. (3.97 × 8.02) / 1.99 ≈ 16
function combinedOperations(): EstimationProblem {
  const templates = [
    () => {
      // (a × b) / c
      const a = round(randInt(15, 90) / 10 + (Math.random() > 0.5 ? 0.01 : -0.01) * randInt(1, 9));
      const b = round(randInt(15, 90) / 10 + (Math.random() > 0.5 ? 0.01 : -0.01) * randInt(1, 9));
      const c = round(randInt(15, 50) / 10 + (Math.random() > 0.5 ? 0.01 : -0.01) * randInt(1, 9));
      const correct = (a * b) / c;
      const display = `(${fmt(a)} × ${fmt(b)}) ÷ ${fmt(c)}`;
      const ar = round(a, 0);
      const br = round(b, 0);
      const cr = round(c, 0);
      const hint = `≈ (${ar} × ${br}) ÷ ${cr} = ${fmt(round((ar * br) / cr))}`;
      return { display, correct, hint };
    },
    () => {
      // a² + b²
      const a = round(randInt(20, 90) / 10 + (Math.random() > 0.5 ? 0.02 : -0.02) * randInt(1, 5));
      const b = round(randInt(20, 90) / 10 + (Math.random() > 0.5 ? 0.02 : -0.02) * randInt(1, 5));
      const correct = a * a + b * b;
      const display = `${fmt(a)}² + ${fmt(b)}²`;
      const ar = round(a, 0);
      const br = round(b, 0);
      const hint = `≈ ${ar}² + ${br}² = ${ar * ar + br * br}`;
      return { display, correct, hint };
    },
    () => {
      // (a + b) × c
      const a = round(randInt(10, 99) / 10 + 0.01 * randInt(1, 9));
      const b = round(randInt(10, 99) / 10 + 0.01 * randInt(1, 9));
      const c = round(randInt(15, 50) / 10 + 0.01 * randInt(1, 9));
      const correct = (a + b) * c;
      const display = `(${fmt(a)} + ${fmt(b)}) × ${fmt(c)}`;
      const ar = round(a, 0);
      const br = round(b, 0);
      const cr = round(c, 0);
      const hint = `≈ (${ar} + ${br}) × ${cr} = ${(ar + br) * cr}`;
      return { display, correct, hint };
    },
    () => {
      // a × b − c × d
      const a = randInt(11, 49);
      const b = randInt(11, 29);
      const c = randInt(11, 29);
      const d = randInt(11, 19);
      const correct = a * b - c * d;
      const display = `${a} × ${b} − ${c} × ${d}`;
      const hint = `≈ ${Math.round(a / 10) * 10} × ${Math.round(b / 10) * 10} − ${Math.round(c / 10) * 10} × ${Math.round(d / 10) * 10}`;
      return { display, correct: Math.abs(correct), hint };
    },
  ];

  const gen = pick(templates)();
  const tag = `co-${gen.display.replace(/[^0-9a-z]/gi, '').slice(0, 16)}`;
  return buildProblem(gen.display, gen.correct, gen.hint, 'Combined Operations', tag);
}

// 7. Fraction addition  —  e.g. 7/13 + 5/11 ≈ 1.0
function fractionAddition(): EstimationProblem {
  const denoms = [3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 19];
  const d1 = pick(denoms);
  const d2 = pick(denoms.filter(d => d !== d1));
  const n1 = randInt(1, d1 - 1);
  const n2 = randInt(1, d2 - 1);
  const correct = n1 / d1 + n2 / d2;
  const display = `${n1}/${d1} + ${n2}/${d2}`;
  return buildProblem(
    display,
    correct,
    `${n1}/${d1} ≈ ${fmt(round(n1 / d1, 2))}, ${n2}/${d2} ≈ ${fmt(round(n2 / d2, 2))}`,
    'Fraction Addition',
    `fa-${n1}-${d1}-${n2}-${d2}`,
  );
}

// 8. Power / exponent estimation  —  e.g. 2.98³ ≈ 27
function powerEstimation(): EstimationProblem {
  const templates = [
    () => {
      // x³ where x is near a small integer
      const base = pick([2, 3, 4, 5, 6, 7]);
      const offset = pick([-0.03, -0.02, -0.01, 0.01, 0.02, 0.03, 0.04, 0.05,
                           -0.07, -0.05, 0.07, 0.09, -0.09, 0.11, -0.11, 0.13, -0.13]);
      const x = base + offset;
      const correct = x ** 3;
      return {
        display: `${fmt(x)}³`,
        correct,
        hint: `≈ ${base}³ = ${base ** 3}`,
        tag: `pe3-${Math.round(x * 100)}`,
      };
    },
    () => {
      // x⁴ where x is near a small integer
      const base = pick([2, 3, 4, 5]);
      const offset = pick([-0.03, -0.02, -0.01, 0.01, 0.02, 0.03, 0.05, -0.05, 0.07, -0.07]);
      const x = base + offset;
      const correct = x ** 4;
      return {
        display: `${fmt(x)}⁴`,
        correct,
        hint: `≈ ${base}⁴ = ${base ** 4}`,
        tag: `pe4-${Math.round(x * 100)}`,
      };
    },
    () => {
      // x^(1/3) — cube root estimation
      const n = pick([7, 9, 10, 12, 15, 20, 25, 28, 30, 33, 35, 40, 45, 50, 55, 60, 65,
                      70, 80, 90, 100, 110, 120, 130, 150, 175, 200, 250, 300, 400, 500]);
      const correct = Math.cbrt(n);
      return {
        display: `∛${n}`,
        correct,
        hint: `∛${n}: between ${Math.floor(correct)} and ${Math.ceil(correct)}`,
        tag: `cr-${n}`,
      };
    },
  ];

  const gen = pick(templates)();
  return buildProblem(gen.display, gen.correct, gen.hint, 'Powers & Roots', gen.tag);
}

// 9. Fraction of a fraction  —  e.g. 3/7 of 5/9
function fractionOfFraction(): EstimationProblem {
  const denoms = [3, 4, 5, 6, 7, 8, 9, 11, 12, 13];
  const d1 = pick(denoms);
  const d2 = pick(denoms.filter(d => d !== d1));
  const n1 = randInt(1, d1 - 1);
  const n2 = randInt(1, d2 - 1);
  const correct = (n1 / d1) * (n2 / d2);
  const display = `${n1}/${d1} × ${n2}/${d2}`;
  return buildProblem(
    display,
    correct,
    `≈ ${fmt(round(n1 / d1, 2))} × ${fmt(round(n2 / d2, 2))} ≈ ${fmt(round(correct))}`,
    'Fraction Multiplication',
    `fm-${n1}-${d1}-${n2}-${d2}`,
  );
}

// 10. Scientific-style division  —  e.g. 47,832 ÷ 591 ≈ 81
function largeDivision(): EstimationProblem {
  const a = randInt(10000, 99999);
  const b = randInt(101, 999);
  const correct = a / b;
  const display = `${a.toLocaleString()} ÷ ${b}`;
  const aRound = Math.round(a / 1000) * 1000;
  const bRound = Math.round(b / 100) * 100;
  return buildProblem(
    display,
    correct,
    `≈ ${aRound.toLocaleString()} ÷ ${bRound} ≈ ${fmt(round(aRound / bRound))}`,
    'Large Division',
    `ld-${a}-${b}`,
  );
}

/* ═══════════════════════════════════════════════════════════
   Master generator — called by the game screen
   ═══════════════════════════════════════════════════════════ */

const generators = [
  decimalDivision,
  decimalMultiplication,
  percentageOfNumber,
  squareRootEstimation,
  largeMultiplication,
  combinedOperations,
  fractionAddition,
  powerEstimation,
  fractionOfFraction,
  largeDivision,
];

export function generateEstimation(): EstimationProblem {
  return pick(generators)();
}

/**
 * Shuffle an array but bias one element away from a given index.
 * ~85% of the time the element lands in a different slot;
 * ~15% it may stay (so it's not fully deterministic).
 */
function shuffleAvoidIndex<T>(arr: T[], avoidItem: T, avoidIdx: number): T[] {
  // Try up to 6 shuffles to move the item; accept the first one that moves it
  for (let attempt = 0; attempt < 6; attempt++) {
    const s = shuffle(arr);
    if (s.indexOf(avoidItem) !== avoidIdx) return s;
  }
  return shuffle(arr); // last-resort plain shuffle
}

/**
 * Generate with reshuffled options (same expression, new distractors).
 * Biases the correct answer away from its previous position.
 */
export function regenerateOptions(prev: EstimationProblem): EstimationProblem {
  const correctStr = prev.answer;
  const prevIdx = prev.options.indexOf(correctStr);
  const correctVal = parseFloat(correctStr);
  const distractors = makeDistractors(correctVal);
  const allOptions = [fmt(correctVal), ...distractors.map(fmt)];
  const options = shuffleAvoidIndex(allOptions, fmt(correctVal), prevIdx);
  return { ...prev, options, answer: fmt(correctVal) };
}

// ── Procedural factoring problem generator ─────────────────
// 6 GMAT-relevant factoring types with ~250+ unique problems.

export interface FactoringProblem {
  display: string;       // The expression to factor (e.g. "x² − 9")
  question: string;      // Prompt shown to user
  answer: string;        // Correct factored form
  options: string[];     // 4 MC choices (shuffled on use)
  hint: string;          // Shown after wrong answer
  historyKey: string;    // Unique key for spaced repetition
  category: string;      // Display label (e.g. "Difference of Squares")
}

export type FactoringType =
  | 'diff-squares'
  | 'perfect-sq'
  | 'trinomials'
  | 'gcf'
  | 'leading-coeff'
  | 'cubes';

export const FACTORING_GROUPS: Record<FactoringType, string> = {
  'diff-squares': 'Diff. of Squares',
  'perfect-sq': 'Perfect Sq. Tri.',
  trinomials: 'Trinomials',
  gcf: 'GCF',
  'leading-coeff': 'Leading Coeff.',
  cubes: 'Sum/Diff Cubes',
};

// ── Helpers ────────────────────────────────────────────────

/** Format a signed term like "+3x" or "−5x" or "+x" */
function signedTerm(coeff: number, variable: string): string {
  if (coeff === 0) return '';
  const abs = Math.abs(coeff);
  const sign = coeff > 0 ? ' + ' : ' − ';
  const c = abs === 1 && variable ? variable : `${abs}${variable}`;
  return `${sign}${c}`;
}

/** Format coefficient for display: 1x → x, -1x → −x */
function fmtCoeff(n: number, variable: string): string {
  if (n === 0) return '';
  if (n === 1) return variable || '1';
  if (n === -1) return variable ? `−${variable}` : '−1';
  return `${n}${variable}`;
}

function sup(base: string, exp: number): string {
  if (exp === 1) return base;
  return `${base}${exp === 2 ? '²' : '³'}`;
}

// ── Generator: Difference of Squares ───────────────────────
// x² − a²  →  (x + a)(x − a)
// (kx)² − a²  →  (kx + a)(kx − a)

function buildDiffOfSquares(): FactoringProblem[] {
  const problems: FactoringProblem[] = [];

  // Simple: x² − a² for a = 1..12
  for (let a = 1; a <= 12; a++) {
    const a2 = a * a;
    problems.push({
      display: `x² − ${a2}`,
      question: 'Factor:',
      answer: `(x + ${a})(x − ${a})`,
      options: [
        `(x + ${a})(x − ${a})`,
        `(x + ${a})²`,
        `(x − ${a})²`,
        `(x + ${a2})(x − 1)`,
      ],
      hint: `a² − b² = (a + b)(a − b), here a = x, b = ${a}`,
      historyKey: `fac:dos:1_${a}`,
      category: 'Difference of Squares',
    });
  }

  // With leading coefficient: (kx)² − a²
  for (const k of [2, 3]) {
    for (let a = 1; a <= 8; a++) {
      const k2 = k * k;
      const a2 = a * a;
      const kxStr = `${k}x`;
      problems.push({
        display: `${k2}x² − ${a2}`,
        question: 'Factor:',
        answer: `(${kxStr} + ${a})(${kxStr} − ${a})`,
        options: [
          `(${kxStr} + ${a})(${kxStr} − ${a})`,
          `(${kxStr} + ${a})²`,
          `(${kxStr} − ${a})²`,
          `(${k}x² + ${a})(${k}x² − ${a})`,
        ],
        hint: `${k2}x² − ${a2} = (${kxStr})² − ${a}²`,
        historyKey: `fac:dos:${k}_${a}`,
        category: 'Difference of Squares',
      });
    }
  }

  return problems;
}

// ── Generator: Perfect Square Trinomials ───────────────────
// x² + 2ax + a²  →  (x + a)²
// x² − 2ax + a²  →  (x − a)²

function buildPerfectSquare(): FactoringProblem[] {
  const problems: FactoringProblem[] = [];

  for (let a = 1; a <= 12; a++) {
    const a2 = a * a;
    const twoA = 2 * a;

    // Positive middle term
    problems.push({
      display: `x² + ${twoA}x + ${a2}`,
      question: 'Factor:',
      answer: `(x + ${a})²`,
      options: [
        `(x + ${a})²`,
        `(x − ${a})²`,
        `(x + ${a})(x − ${a})`,
        `(x + ${twoA})(x + 1)`,
      ],
      hint: `x² + 2(${a})x + ${a}² = (x + ${a})²`,
      historyKey: `fac:pst:${a}_p`,
      category: 'Perfect Square Trinomial',
    });

    // Negative middle term
    problems.push({
      display: `x² − ${twoA}x + ${a2}`,
      question: 'Factor:',
      answer: `(x − ${a})²`,
      options: [
        `(x − ${a})²`,
        `(x + ${a})²`,
        `(x + ${a})(x − ${a})`,
        `(x − ${twoA})(x − 1)`,
      ],
      hint: `x² − 2(${a})x + ${a}² = (x − ${a})²`,
      historyKey: `fac:pst:${a}_n`,
      category: 'Perfect Square Trinomial',
    });
  }

  return problems;
}

// ── Generator: Simple Trinomials ───────────────────────────
// x² + bx + c  →  (x + p)(x + q)  where p + q = b, p × q = c

function buildSimpleTrinomials(): FactoringProblem[] {
  const problems: FactoringProblem[] = [];
  const seen = new Set<string>();

  for (let p = -12; p <= 12; p++) {
    if (p === 0) continue;
    for (let q = p; q <= 12; q++) {
      if (q === 0) continue;
      // Skip perfect squares (handled above)
      if (p === q && p > 0) continue;
      if (p === -q) continue; // This gives x² − a², handled in diff-of-squares

      const b = p + q;
      const c = p * q;
      const key = `${b}_${c}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Display: x² + bx + c
      const bTerm = b === 0 ? '' : (b === 1 ? ' + x' : b === -1 ? ' − x' : b > 0 ? ` + ${b}x` : ` − ${Math.abs(b)}x`);
      const cTerm = c > 0 ? ` + ${c}` : ` − ${Math.abs(c)}`;
      const display = `x²${bTerm}${cTerm}`;

      // Answer: (x + p)(x + q) — canonical with smaller first
      const [s, t] = p <= q ? [p, q] : [q, p];
      const sFmt = s > 0 ? `x + ${s}` : `x − ${Math.abs(s)}`;
      const tFmt = t > 0 ? `x + ${t}` : `x − ${Math.abs(t)}`;
      const answer = `(${sFmt})(${tFmt})`;

      // Build distractors: wrong factor pairs
      const distractors = new Set<string>();

      // Sign error: flip one sign
      const sFlip = s > 0 ? `x − ${s}` : `x + ${Math.abs(s)}`;
      const tFlip = t > 0 ? `x − ${t}` : `x + ${Math.abs(t)}`;
      distractors.add(`(${sFlip})(${tFmt})`);
      distractors.add(`(${sFmt})(${tFlip})`);

      // Adjacent factor pair: try (s±1, adjusted)
      for (const delta of [-1, 1]) {
        const altS = s + delta;
        if (altS === 0) continue;
        const altT = b - altS;
        if (altT === 0 || altT === altS) continue;
        const asFmt = altS > 0 ? `x + ${altS}` : `x − ${Math.abs(altS)}`;
        const atFmt = altT > 0 ? `x + ${altT}` : `x − ${Math.abs(altT)}`;
        distractors.add(`(${asFmt})(${atFmt})`);
      }

      // Swap product/sum confusion
      if (c !== b) {
        const confFmt1 = c > 0 ? `x + ${c}` : `x − ${Math.abs(c)}`;
        distractors.add(`(${confFmt1})(x + 1)`);
      }

      // Remove answer from distractors
      distractors.delete(answer);
      const distArr = [...distractors].slice(0, 3);
      // Pad if needed
      while (distArr.length < 3) {
        const pad = s + distArr.length + 1;
        const padStr = `(x + ${pad})(x − ${pad + 1})`;
        if (padStr !== answer && !distArr.includes(padStr)) distArr.push(padStr);
        else distArr.push(`(x + ${Math.abs(c) + distArr.length})(x + 1)`);
      }

      problems.push({
        display,
        question: 'Factor:',
        answer,
        options: [answer, ...distArr.slice(0, 3)],
        hint: `Find p, q where p + q = ${b} and p × q = ${c}`,
        historyKey: `fac:tri:${b}_${c}`,
        category: 'Trinomial',
      });
    }
  }

  return problems;
}

// ── Generator: GCF Factoring ───────────────────────────────
// e.g. 6x³ + 9x²  →  3x²(2x + 3)

function buildGCF(): FactoringProblem[] {
  const problems: FactoringProblem[] = [];

  // Two-term GCF problems
  const configs: { gcf: number; terms: [number, number]; powers: [number, number] }[] = [];
  for (const g of [2, 3, 4, 5, 6]) {
    for (const [a, b] of [[1, 2], [1, 3], [2, 3], [2, 5], [3, 4], [1, 4], [3, 5], [1, 5]]) {
      configs.push({ gcf: g, terms: [a, b], powers: [3, 2] });
      configs.push({ gcf: g, terms: [a, b], powers: [2, 1] });
    }
  }

  for (const { gcf, terms: [a, b], powers: [p1, p2] } of configs) {
    const c1 = gcf * a;
    const c2 = gcf * b;
    const display = `${c1}${sup('x', p1)} + ${c2}${sup('x', p2)}`;
    const innerA = fmtCoeff(a, p1 - p2 > 0 ? sup('x', p1 - p2) : '');
    const innerB = b.toString();
    const outer = `${gcf}${sup('x', p2)}`;
    const answer = `${outer}(${innerA} + ${innerB})`;

    // Distractors
    const d1 = `${gcf}(${fmtCoeff(a, sup('x', p1))} + ${fmtCoeff(b, sup('x', p2))})`;
    const d2 = `${sup('x', p2)}(${c1}${p1 - p2 > 1 ? sup('x', p1 - p2) : p1 - p2 === 1 ? 'x' : ''} + ${c2})`;
    const wrongGcf = gcf === 2 ? 4 : gcf - 1;
    const d3 = `${wrongGcf}${sup('x', p2)}(${Math.round(c1 / wrongGcf)}${sup('x', p1 - p2)} + ${Math.round(c2 / wrongGcf)})`;

    const opts = [answer];
    for (const d of [d1, d2, d3]) {
      if (d !== answer && !opts.includes(d)) opts.push(d);
    }
    while (opts.length < 4) {
      opts.push(`${gcf + 1}${sup('x', p2)}(${a}${sup('x', p1 - p2)} + ${b})`);
    }

    problems.push({
      display,
      question: 'Factor completely:',
      answer,
      options: opts.slice(0, 4),
      hint: `GCF is ${outer}`,
      historyKey: `fac:gcf:${gcf}_${a}_${b}_${p1}${p2}`,
      category: 'GCF Factoring',
    });
  }

  // Deduplicate by historyKey
  const seen = new Set<string>();
  return problems.filter(p => {
    if (seen.has(p.historyKey)) return false;
    seen.add(p.historyKey);
    return true;
  });
}

// ── Generator: Leading Coefficient Trinomials ──────────────
// ax² + bx + c  →  (mx + p)(nx + q) where m*n = a, p*q = c, mq + np = b

function buildLeadingCoeff(): FactoringProblem[] {
  const problems: FactoringProblem[] = [];
  const seen = new Set<string>();

  for (const a of [2, 3, 5]) {
    // Factor pairs for a: (1, a) and (a, 1) — same since a is prime
    const m = 1;
    const n = a;

    for (let p = -8; p <= 8; p++) {
      if (p === 0) continue;
      for (let q = -8; q <= 8; q++) {
        if (q === 0) continue;

        const bCoeff = m * q + n * p; // coefficient of x
        const cCoeff = p * q;         // constant term

        const key = `${a}_${bCoeff}_${cCoeff}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // Display: ax² + bx + c
        const bTerm = bCoeff === 0 ? ''
          : bCoeff === 1 ? ' + x'
          : bCoeff === -1 ? ' − x'
          : bCoeff > 0 ? ` + ${bCoeff}x`
          : ` − ${Math.abs(bCoeff)}x`;
        const cTerm = cCoeff > 0 ? ` + ${cCoeff}` : ` − ${Math.abs(cCoeff)}`;
        const display = `${a}x²${bTerm}${cTerm}`;

        // Answer: (x + p)(ax + q) — canonical
        const pFmt = p > 0 ? `x + ${p}` : `x − ${Math.abs(p)}`;
        const qFmt = q > 0 ? `${a}x + ${q}` : `${a}x − ${Math.abs(q)}`;
        const answer = `(${pFmt})(${qFmt})`;

        // Distractors
        const distractors = new Set<string>();

        // Sign flip on p
        const pFlip = p > 0 ? `x − ${p}` : `x + ${Math.abs(p)}`;
        distractors.add(`(${pFlip})(${qFmt})`);

        // Sign flip on q
        const qFlip = q > 0 ? `${a}x − ${q}` : `${a}x + ${Math.abs(q)}`;
        distractors.add(`(${pFmt})(${qFlip})`);

        // Wrong leading coefficient split
        if (a !== 2) {
          const altQ = q > 0 ? `2x + ${q}` : `2x − ${Math.abs(q)}`;
          distractors.add(`(${pFmt})(${altQ})`);
        } else {
          const altQ = q > 0 ? `3x + ${q}` : `3x − ${Math.abs(q)}`;
          distractors.add(`(${pFmt})(${altQ})`);
        }

        // Swapped factor pair
        const swapP = q > 0 ? `x + ${q}` : `x − ${Math.abs(q)}`;
        const swapQ = p > 0 ? `${a}x + ${p}` : `${a}x − ${Math.abs(p)}`;
        if (`(${swapP})(${swapQ})` !== answer) {
          distractors.add(`(${swapP})(${swapQ})`);
        }

        distractors.delete(answer);
        const distArr = [...distractors].slice(0, 3);
        while (distArr.length < 3) {
          distArr.push(`(x + ${Math.abs(p) + distArr.length + 1})(${a}x + 1)`);
        }

        problems.push({
          display,
          question: 'Factor:',
          answer,
          options: [answer, ...distArr.slice(0, 3)],
          hint: `Leading coeff ${a} = ${m} × ${n}. Find p, q where c = p × q and ${m}q + ${n}p = ${bCoeff}`,
          historyKey: `fac:lct:${a}_${p}_${q}`,
          category: 'Leading Coefficient',
        });
      }
    }
  }

  return problems;
}

// ── Generator: Sum/Difference of Cubes ─────────────────────
// x³ + a³  →  (x + a)(x² − ax + a²)
// x³ − a³  →  (x − a)(x² + ax + a²)

function buildCubes(): FactoringProblem[] {
  const problems: FactoringProblem[] = [];

  // Simple: x³ ± a³ for a = 1..10
  for (let a = 1; a <= 10; a++) {
    const a3 = a * a * a;
    const a2 = a * a;

    // Sum of cubes: x³ + a³
    problems.push({
      display: `x³ + ${a3}`,
      question: 'Factor:',
      answer: `(x + ${a})(x² − ${a}x + ${a2})`,
      options: [
        `(x + ${a})(x² − ${a}x + ${a2})`,
        `(x + ${a})(x² + ${a}x + ${a2})`,
        `(x − ${a})(x² + ${a}x + ${a2})`,
        `(x + ${a})³`,
      ],
      hint: `a³ + b³ = (a + b)(a² − ab + b²)`,
      historyKey: `fac:cub:${a}_p`,
      category: 'Sum of Cubes',
    });

    // Difference of cubes: x³ − a³
    problems.push({
      display: `x³ − ${a3}`,
      question: 'Factor:',
      answer: `(x − ${a})(x² + ${a}x + ${a2})`,
      options: [
        `(x − ${a})(x² + ${a}x + ${a2})`,
        `(x − ${a})(x² − ${a}x + ${a2})`,
        `(x + ${a})(x² − ${a}x + ${a2})`,
        `(x − ${a})³`,
      ],
      hint: `a³ − b³ = (a − b)(a² + ab + b²)`,
      historyKey: `fac:cub:${a}_n`,
      category: 'Difference of Cubes',
    });
  }

  // Leading coefficient cubes: (kx)³ ± a³
  for (const k of [2, 3]) {
    const k3 = k * k * k;
    const k2 = k * k;
    for (let a = 1; a <= 5; a++) {
      const a3 = a * a * a;
      const a2 = a * a;
      const kxStr = `${k}x`;

      // (kx)³ + a³
      problems.push({
        display: `${k3}x³ + ${a3}`,
        question: 'Factor:',
        answer: `(${kxStr} + ${a})(${k2}x² − ${k * a}x + ${a2})`,
        options: [
          `(${kxStr} + ${a})(${k2}x² − ${k * a}x + ${a2})`,
          `(${kxStr} + ${a})(${k2}x² + ${k * a}x + ${a2})`,
          `(${kxStr} − ${a})(${k2}x² + ${k * a}x + ${a2})`,
          `(${kxStr} + ${a})³`,
        ],
        hint: `${k3}x³ + ${a3} = (${kxStr})³ + ${a}³`,
        historyKey: `fac:cub:${k}_${a}_p`,
        category: 'Sum of Cubes',
      });

      // (kx)³ − a³
      problems.push({
        display: `${k3}x³ − ${a3}`,
        question: 'Factor:',
        answer: `(${kxStr} − ${a})(${k2}x² + ${k * a}x + ${a2})`,
        options: [
          `(${kxStr} − ${a})(${k2}x² + ${k * a}x + ${a2})`,
          `(${kxStr} − ${a})(${k2}x² − ${k * a}x + ${a2})`,
          `(${kxStr} + ${a})(${k2}x² − ${k * a}x + ${a2})`,
          `(${kxStr} − ${a})³`,
        ],
        hint: `${k3}x³ − ${a3} = (${kxStr})³ − ${a}³`,
        historyKey: `fac:cub:${k}_${a}_n`,
        category: 'Difference of Cubes',
      });
    }
  }

  return problems;
}

// ── Build all pools ────────────────────────────────────────

const ALL_DIFF_SQUARES = buildDiffOfSquares();
const ALL_PERFECT_SQ = buildPerfectSquare();
const ALL_TRINOMIALS = buildSimpleTrinomials();
const ALL_GCF = buildGCF();
const ALL_LEADING_COEFF = buildLeadingCoeff();
const ALL_CUBES = buildCubes();

const POOL_MAP: Record<FactoringType, FactoringProblem[]> = {
  'diff-squares': ALL_DIFF_SQUARES,
  'perfect-sq': ALL_PERFECT_SQ,
  trinomials: ALL_TRINOMIALS,
  gcf: ALL_GCF,
  'leading-coeff': ALL_LEADING_COEFF,
  cubes: ALL_CUBES,
};

export const ALL_FACTORING_PROBLEMS: FactoringProblem[] = [
  ...ALL_DIFF_SQUARES,
  ...ALL_PERFECT_SQ,
  ...ALL_TRINOMIALS,
  ...ALL_GCF,
  ...ALL_LEADING_COEFF,
  ...ALL_CUBES,
];

/**
 * Build a filtered pool based on selected factoring categories.
 */
export function buildFactoringPool(categories: string[]): FactoringProblem[] {
  const cats = new Set(categories);
  const pool: FactoringProblem[] = [];
  for (const [type, problems] of Object.entries(POOL_MAP)) {
    if (cats.has(type)) pool.push(...problems);
  }
  return pool.length > 0 ? pool : ALL_FACTORING_PROBLEMS;
}

/**
 * Shuffle MC options for a factoring problem, ensuring the answer
 * moves to a different position if avoidIdx is specified.
 */
export function shuffleFactoringOptions(
  problem: FactoringProblem,
  avoidIdx?: number,
): FactoringProblem {
  const { answer, options } = problem;

  for (let attempt = 0; attempt < 8; attempt++) {
    const wrong = options.filter(o => o !== answer);
    // Pick 3 unique wrong answers
    const shuffledWrong: string[] = [];
    const pool = [...wrong];
    while (shuffledWrong.length < 3 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      shuffledWrong.push(pool.splice(idx, 1)[0]);
    }

    const newOpts = [answer, ...shuffledWrong];
    // Fisher-Yates shuffle
    for (let i = newOpts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newOpts[i], newOpts[j]] = [newOpts[j], newOpts[i]];
    }

    const newIdx = newOpts.indexOf(answer);
    if (avoidIdx == null || newIdx !== avoidIdx || attempt >= 6) {
      return { ...problem, options: newOpts };
    }
  }

  return { ...problem, options: [...problem.options].reverse() };
}

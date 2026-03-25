/**
 * Algebraic Identities & Exponent Rules — GMAT drill bank.
 *
 * Categories:
 *  1. Difference of Squares
 *  2. Binomial Squares (perfect square trinomials)
 *  3. Exponent Rules
 *  4. Sum-of-Squares Trap
 *  5. Factoring by Grouping
 *  6. Fraction Split
 *  7. Perfect Square Recognition
 */

export interface AlgebraProblem {
  /** Unique id for stable ordering */
  id: string;
  /** Category label for display */
  category: string;
  /** Gauntlet group for category filtering */
  group: 'identities' | 'exponents' | 'quadratics' | 'inequalities';
  /** Expression shown to user (Unicode-formatted) */
  display: string;
  /** Question prompt */
  question: string;
  /** Correct answer string (must match one of options) */
  answer: string;
  /** Four MC options */
  options: string[];
  /** Hint shown after wrong answer */
  hint: string;
  /** History key for spaced repetition */
  historyKey: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick 3 random wrong options + the correct answer, then shuffle.
 *  Pass `avoidIdx` (previous answer index) on repeat to bias away from that slot.
 */
export function shuffleOptions(p: AlgebraProblem, avoidIdx?: number): AlgebraProblem {
  const wrong = shuffle(p.options.filter((o) => o !== p.answer)).slice(0, 3);
  const all = [p.answer, ...wrong];
  if (avoidIdx !== undefined && avoidIdx >= 0) {
    // Try up to 6 shuffles to move the answer away from its old slot
    for (let attempt = 0; attempt < 6; attempt++) {
      const s = shuffle(all);
      if (s.indexOf(p.answer) !== avoidIdx) return { ...p, options: s };
    }
  }
  return { ...p, options: shuffle(all) };
}

// ── 1. Difference of Squares ───────────────────────────────

const diffOfSquares: AlgebraProblem[] = [
  {
    id: 'ds01', category: 'Difference of Squares', group: 'identities',
    display: 'a² − b²',
    question: 'Which factoring is correct?',
    answer: '(a + b)(a − b)',
    options: ['(a + b)(a − b)', '(a − b)²', '(a + b)²', 'a² + b²', 'a(a − b²)', '(a − b)(a − b)'],
    hint: 'a² − b² = (a + b)(a − b)',
    historyKey: 'alg:ds:identity',
  },
  {
    id: 'ds02', category: 'Difference of Squares', group: 'identities',
    display: 'x² − 49',
    question: 'Factor completely:',
    answer: '(x + 7)(x − 7)',
    options: ['(x + 7)(x − 7)', '(x − 7)²', '(x + 7)²', '(x − 49)(x + 1)', '(x + 49)(x − 1)', '(x − 7)(x − 7)'],
    hint: 'x² − 49 = x² − 7² = (x + 7)(x − 7)',
    historyKey: 'alg:ds:x2-49',
  },
  {
    id: 'ds03', category: 'Difference of Squares', group: 'identities',
    display: '9x² − 16',
    question: 'Factor completely:',
    answer: '(3x + 4)(3x − 4)',
    options: ['(3x + 4)(3x − 4)', '(9x + 16)(x − 1)', '(3x − 4)²', '(3x + 4)²', '(9x − 4)(x + 4)', '(3x − 16)(3x + 1)'],
    hint: '9x² − 16 = (3x)² − 4² = (3x + 4)(3x − 4)',
    historyKey: 'alg:ds:9x2-16',
  },
  {
    id: 'ds04', category: 'Difference of Squares', group: 'identities',
    display: '25 − y²',
    question: 'Factor completely:',
    answer: '(5 + y)(5 − y)',
    options: ['(5 + y)(5 − y)', '(y + 5)(y − 5)', '(5 − y)²', '(y − 5)²', '(25 − y)(1 + y)', '(5 − y)(5 − y)'],
    hint: '25 − y² = 5² − y² = (5 + y)(5 − y)',
    historyKey: 'alg:ds:25-y2',
  },
  {
    id: 'ds07', category: 'Difference of Squares', group: 'identities',
    display: '4a² − 9b²',
    question: 'Factor completely:',
    answer: '(2a + 3b)(2a − 3b)',
    options: ['(2a + 3b)(2a − 3b)', '(4a + 9b)(a − b)', '(2a − 3b)²', '(2a + 3b)²', '(4a − 9b)(a + b)', '(2a + 9b)(2a − 1)'],
    hint: '4a² − 9b² = (2a)² − (3b)² = (2a + 3b)(2a − 3b)',
    historyKey: 'alg:ds:4a2-9b2',
  },
];

// ── 2. Binomial Squares ────────────────────────────────────

const binomialSquares: AlgebraProblem[] = [
  {
    id: 'bs01', category: 'Binomial Squares', group: 'identities',
    display: '(a + b)²',
    question: 'Expand:',
    answer: 'a² + 2ab + b²',
    options: ['a² + 2ab + b²', 'a² + ab + b²', 'a² + b²', '2a² + 2b²', '(a + b)(a − b)', 'a² + 2ab − b²'],
    hint: '(a + b)² = a² + 2ab + b²',
    historyKey: 'alg:bs:apb-sq',
  },
  {
    id: 'bs02', category: 'Binomial Squares', group: 'identities',
    display: '(a − b)²',
    question: 'Expand:',
    answer: 'a² − 2ab + b²',
    options: ['a² − 2ab + b²', 'a² − ab + b²', 'a² − b²', 'a² + 2ab − b²', '−a² + 2ab − b²', '2a² − 2b²'],
    hint: '(a − b)² = a² − 2ab + b²',
    historyKey: 'alg:bs:amb-sq',
  },
  {
    id: 'bs03', category: 'Binomial Squares', group: 'identities',
    display: 'x² + 6x + 9',
    question: 'Factor:',
    answer: '(x + 3)²',
    options: ['(x + 3)²', '(x + 9)²', '(x + 3)(x − 3)', '(x + 6)(x + 1)', '(x + 1)(x + 9)', '(x + 2)(x + 3)'],
    hint: 'x² + 6x + 9 = x² + 2(3)x + 3² = (x + 3)²',
    historyKey: 'alg:bs:x2+6x+9',
  },
  {
    id: 'bs04', category: 'Binomial Squares', group: 'identities',
    display: 'x² − 10x + 25',
    question: 'Factor:',
    answer: '(x − 5)²',
    options: ['(x − 5)²', '(x + 5)²', '(x − 5)(x + 5)', '(x − 25)(x + 1)', '(x − 10)(x + 1)', '(x − 1)(x − 25)'],
    hint: 'x² − 10x + 25 = x² − 2(5)x + 5² = (x − 5)²',
    historyKey: 'alg:bs:x2-10x+25',
  },
  {
    id: 'bs05', category: 'Binomial Squares', group: 'identities',
    display: '4x² + 12x + 9',
    question: 'Factor:',
    answer: '(2x + 3)²',
    options: ['(2x + 3)²', '(4x + 9)²', '(2x + 3)(2x − 3)', '(4x + 3)(x + 3)', '(2x + 9)(2x + 1)', '(4x + 9)(x + 1)'],
    hint: '4x² + 12x + 9 = (2x)² + 2(2x)(3) + 3² = (2x + 3)²',
    historyKey: 'alg:bs:4x2+12x+9',
  },
  {
    id: 'bs06', category: 'Binomial Squares', group: 'identities',
    display: '(a + b)² − (a − b)²',
    question: 'Simplify:',
    answer: '4ab',
    options: ['4ab', '2ab', '2a² + 2b²', '0', '2(a² − b²)', 'a² − b²'],
    hint: '(a+b)² − (a−b)² = (a²+2ab+b²) − (a²−2ab+b²) = 4ab',
    historyKey: 'alg:bs:diff-binom',
  },
  {
    id: 'bs07', category: 'Binomial Squares', group: 'identities',
    display: '(a + b)² + (a − b)²',
    question: 'Simplify:',
    answer: '2a² + 2b²',
    options: ['2a² + 2b²', '2a² − 2b²', '4ab', '(a² + b²)', '2(a + b)²', '4a² + 4b²'],
    hint: '(a+b)² + (a−b)² = (a²+2ab+b²) + (a²−2ab+b²) = 2a² + 2b²',
    historyKey: 'alg:bs:sum-binom',
  },
  {
    id: 'bs10', category: 'Binomial Squares', group: 'identities',
    display: 'x² + 14x + 49',
    question: 'Factor:',
    answer: '(x + 7)²',
    options: ['(x + 7)²', '(x + 49)²', '(x + 7)(x − 7)', '(x + 14)(x + 1)', '(x + 2)(x + 7)', '(x + 14)²'],
    hint: 'x² + 14x + 49 = x² + 2(7)x + 7² = (x + 7)²',
    historyKey: 'alg:bs:x2+14x+49',
  },
];

// ── 3. Exponent Rules ──────────────────────────────────────

const exponentRules: AlgebraProblem[] = [
  {
    id: 'ex01', category: 'Exponent Rules', group: 'exponents',
    display: 'xᵃ · xᵇ',
    question: 'Simplify:',
    answer: 'x⁽ᵃ⁺ᵇ⁾',
    options: ['x⁽ᵃ⁺ᵇ⁾', 'x⁽ᵃᵇ⁾', '(2x)⁽ᵃ⁺ᵇ⁾', 'x⁽ᵃ⁻ᵇ⁾', '(x²)⁽ᵃᵇ⁾', 'xᵃ + xᵇ'],
    hint: 'When multiplying same base, add exponents: xᵃ · xᵇ = x⁽ᵃ⁺ᵇ⁾',
    historyKey: 'alg:ex:mult-same',
  },
  {
    id: 'ex02', category: 'Exponent Rules', group: 'exponents',
    display: 'xᵃ / xᵇ',
    question: 'Simplify:',
    answer: 'x⁽ᵃ⁻ᵇ⁾',
    options: ['x⁽ᵃ⁻ᵇ⁾', 'x⁽ᵃ⁺ᵇ⁾', 'x⁽ᵃ/ᵇ⁾', '(x/x)⁽ᵃᵇ⁾', 'x⁽ᵃᵇ⁾', 'xᵃ − xᵇ'],
    hint: 'When dividing same base, subtract exponents: xᵃ / xᵇ = x⁽ᵃ⁻ᵇ⁾',
    historyKey: 'alg:ex:div-same',
  },
  {
    id: 'ex03', category: 'Exponent Rules', group: 'exponents',
    display: '(xᵃ)ᵇ',
    question: 'Simplify:',
    answer: 'x⁽ᵃᵇ⁾',
    options: ['x⁽ᵃᵇ⁾', 'x⁽ᵃ⁺ᵇ⁾', 'xᵃ · xᵇ', 'bxᵃ', 'x⁽ᵃ⁻ᵇ⁾', 'x⁽ᵃ/ᵇ⁾'],
    hint: 'Power of a power: multiply exponents. (xᵃ)ᵇ = x⁽ᵃᵇ⁾',
    historyKey: 'alg:ex:pow-pow',
  },
  {
    id: 'ex04', category: 'Exponent Rules', group: 'exponents',
    display: '(xy)ⁿ',
    question: 'Simplify:',
    answer: 'xⁿyⁿ',
    options: ['xⁿyⁿ', 'xyⁿ', '(xy)ⁿ = xⁿ + yⁿ', 'nxy', 'xⁿ · y', '(x + y)ⁿ'],
    hint: 'Power of a product: (xy)ⁿ = xⁿyⁿ',
    historyKey: 'alg:ex:prod-pow',
  },
  {
    id: 'ex05', category: 'Exponent Rules', group: 'exponents',
    display: 'x⁰',
    question: 'Evaluate (x ≠ 0):',
    answer: '1',
    options: ['1', '0', 'x', 'undefined', '−1', '∞'],
    hint: 'Any nonzero number raised to 0 equals 1.',
    historyKey: 'alg:ex:zero-pow',
  },
  {
    id: 'ex06', category: 'Exponent Rules', group: 'exponents',
    display: 'x⁻ⁿ',
    question: 'Rewrite as a fraction:',
    answer: '1/xⁿ',
    options: ['1/xⁿ', '−xⁿ', 'x/n', '(−x)ⁿ', '−1/xⁿ', 'xⁿ/1'],
    hint: 'Negative exponent means reciprocal: x⁻ⁿ = 1/xⁿ',
    historyKey: 'alg:ex:neg-exp',
  },
  {
    id: 'ex07', category: 'Exponent Rules', group: 'exponents',
    display: '(x/y)ⁿ',
    question: 'Simplify:',
    answer: 'xⁿ/yⁿ',
    options: ['xⁿ/yⁿ', '(xⁿ)(yⁿ)', 'x/(yⁿ)', 'xⁿ − yⁿ', '(x − y)ⁿ', 'x/yⁿ'],
    hint: 'Power of a quotient: (x/y)ⁿ = xⁿ/yⁿ',
    historyKey: 'alg:ex:quot-pow',
  },
  {
    id: 'ex08', category: 'Exponent Rules', group: 'exponents',
    display: '2³ · 2⁵',
    question: 'Simplify:',
    answer: '2⁸',
    options: ['2⁸', '2¹⁵', '4⁸', '2³', '10⁵', '6⁸'],
    hint: 'Same base → add exponents: 2³ · 2⁵ = 2⁸ = 256',
    historyKey: 'alg:ex:2p3-2p5',
  },
  {
    id: 'ex09', category: 'Exponent Rules', group: 'exponents',
    display: '(3²)³',
    question: 'Simplify:',
    answer: '3⁶',
    options: ['3⁶', '3⁵', '9³', '3⁸', '3²', '27²'],
    hint: 'Power of a power → multiply exponents: (3²)³ = 3⁶ = 729',
    historyKey: 'alg:ex:3sq-cubed',
  },
  {
    id: 'ex10', category: 'Exponent Rules', group: 'exponents',
    display: '5⁴ / 5²',
    question: 'Simplify:',
    answer: '5²',
    options: ['5²', '5⁶', '5⁸', '5½', '25²', '1'],
    hint: 'Same base → subtract exponents: 5⁴ / 5² = 5² = 25',
    historyKey: 'alg:ex:5p4-div-5p2',
  },
  {
    id: 'ex11', category: 'Exponent Rules', group: 'exponents',
    display: '(−2)⁴',
    question: 'Evaluate:',
    answer: '16',
    options: ['16', '−16', '8', '−8', '32', '−32'],
    hint: '(−2)⁴ = 16 because even exponent makes result positive.',
    historyKey: 'alg:ex:neg2p4',
  },
  {
    id: 'ex12', category: 'Exponent Rules', group: 'exponents',
    display: '−2⁴',
    question: 'Evaluate (note: no parentheses):',
    answer: '−16',
    options: ['−16', '16', '−8', '8', '−32', '−4'],
    hint: '−2⁴ = −(2⁴) = −16. Without parentheses, exponent applies only to 2.',
    historyKey: 'alg:ex:minus-2p4',
  },
  {
    id: 'ex13', category: 'Exponent Rules', group: 'exponents',
    display: '2ⁿ + 2ⁿ',
    question: 'Simplify:',
    answer: '2ⁿ⁺¹',
    options: ['2ⁿ⁺¹', '4ⁿ', '2²ⁿ', '2ⁿ', '2ⁿ · 2ⁿ', '2 · 4ⁿ'],
    hint: '2ⁿ + 2ⁿ = 2·2ⁿ = 2ⁿ⁺¹. Adding a number to itself = multiplying by 2.',
    historyKey: 'alg:ex:2n-plus-2n',
  },
  {
    id: 'ex14', category: 'Exponent Rules', group: 'exponents',
    display: '3ⁿ + 3ⁿ + 3ⁿ',
    question: 'Simplify:',
    answer: '3ⁿ⁺¹',
    options: ['3ⁿ⁺¹', '9ⁿ', '3³ⁿ', '3ⁿ', '3ⁿ · 3', '9 · 3ⁿ'],
    hint: '3ⁿ + 3ⁿ + 3ⁿ = 3·3ⁿ = 3ⁿ⁺¹. Adding k copies of kⁿ = kⁿ⁺¹.',
    historyKey: 'alg:ex:3n-times-3',
  },
  {
    id: 'ex15', category: 'Exponent Rules', group: 'exponents',
    display: '2¹⁰ + 2¹¹ + 2¹²',
    question: 'Simplify:',
    answer: '7 · 2¹⁰',
    options: ['7 · 2¹⁰', '2³³', '6 · 2¹⁰', '3 · 2¹⁰', '3 · 2¹²', '3 · 2¹¹'],
    hint: 'Factor out smallest power: 2¹⁰(1 + 2 + 4) = 7 · 2¹⁰.',
    historyKey: 'alg:ex:factor-sum',
  },
  {
    id: 'ex16', category: 'Exponent Rules', group: 'exponents',
    display: '√x',
    question: 'Rewrite in exponential form:',
    answer: 'x^(1/2)',
    options: ['x^(1/2)', 'x²', '2x', 'x⁻²', 'x^(2)', 'x^(−1/2)'],
    hint: 'Radicals are fractional exponents: √x = x^(1/2). ∛x = x^(1/3).',
    historyKey: 'alg:ex:radical-exp',
  },
];

// ── 4. Sum-of-Squares Trap ─────────────────────────────────

const sumOfSquaresTrap: AlgebraProblem[] = [
  {
    id: 'ss01', category: 'Sum of Squares Trap', group: 'identities',
    display: 'a² + b²',
    question: 'Can this be factored over the reals?',
    answer: 'No — it is irreducible',
    options: ['No — it is irreducible', '(a + b)(a − b)', '(a + b)²', '(a − b)²', '(a + b)(a + b)', 'a(a + b²)'],
    hint: 'a² + b² cannot be factored over real numbers. Common GMAT trap!',
    historyKey: 'alg:ss:no-factor',
  },
  {
    id: 'ss02', category: 'Sum of Squares Trap', group: 'identities',
    display: 'x² + 4',
    question: 'Can this be factored over the reals?',
    answer: 'No — irreducible',
    options: ['No — irreducible', '(x + 2)(x − 2)', '(x + 2)²', '(x − 2)²', '(x + 4)(x − 1)', '(x + 1)(x + 4)'],
    hint: 'x² + 4 ≠ (x + 2)(x − 2). That equals x² − 4. Sum of squares doesn\'t factor!',
    historyKey: 'alg:ss:x2+4',
  },
  {
    id: 'ss03', category: 'Sum of Squares Trap', group: 'identities',
    display: 'a² + 2ab + b²',
    question: 'Factor:',
    answer: '(a + b)²',
    options: ['(a + b)²', 'a² + b²', '(a + b)(a − b)', '(a − b)²', 'Cannot be factored', '2(a + b)'],
    hint: 'a² + 2ab + b² = (a + b)². It\'s a perfect square trinomial, NOT sum of squares.',
    historyKey: 'alg:ss:pst-trap',
  },
  {
    id: 'ss04', category: 'Sum of Squares Trap', group: 'identities',
    display: 'x² + y² = 25, xy = 12',
    question: 'Which identity finds (x + y)²?',
    answer: '(x+y)² = x² + 2xy + y²',
    options: ['(x+y)² = x² + 2xy + y²', '(x+y)² = x² + y²', '(x+y)² = (xy)²', '(x+y)² = x² − 2xy + y²', '(x+y)² = 2(x² + y²)', 'Cannot be determined'],
    hint: '(x+y)² = x² + 2xy + y² = 25 + 24 = 49. Know the identity!',
    historyKey: 'alg:ss:system',
  },
  {
    id: 'ss05', category: 'Sum of Squares Trap', group: 'identities',
    display: '9 + y²',
    question: 'Can this be factored over the reals?',
    answer: 'No — sum of squares is irreducible',
    options: ['No — sum of squares is irreducible', '(3 + y)(3 − y)', '(3 + y)²', '(y + 3)(y − 3)', '(y + 9)(y − 1)', '(3 − y)²'],
    hint: '9 + y² = 3² + y². Sum of squares — not factorable over the reals.',
    historyKey: 'alg:ss:9+y2',
  },
  {
    id: 'ss06', category: 'Sum of Squares Trap', group: 'identities',
    display: 'a² − 2ab + b²',
    question: 'This is:',
    answer: '(a − b)² — a perfect square trinomial',
    options: ['(a − b)² — a perfect square trinomial', 'Sum of squares', '(a + b)(a − b)', 'Irreducible', '(a − b)(a + b)', 'a² + b²'],
    hint: 'a² − 2ab + b² = (a − b)². Don\'t confuse with a² + b² (which IS irreducible).',
    historyKey: 'alg:ss:pst-neg',
  },
  {
    id: 'ss07', category: 'Sum of Squares Trap', group: 'identities',
    display: '(x + y)² − 2xy',
    question: 'Simplify:',
    answer: 'x² + y²',
    options: ['x² + y²', '(x − y)²', 'x² − y²', '(x + y)(x − y)', '2xy', 'x² + 2xy + y²'],
    hint: '(x + y)² − 2xy = x² + 2xy + y² − 2xy = x² + y². Useful identity rearrangement.',
    historyKey: 'alg:ss:rearrange',
  },
  {
    id: 'ss08', category: 'Sum of Squares Trap', group: 'identities',
    display: '4a² + 9b²',
    question: 'Can this be factored over the reals?',
    answer: 'No — sum of squares doesn\'t factor',
    options: ['No — sum of squares doesn\'t factor', '(2a + 3b)(2a − 3b)', '(2a + 3b)²', '(2a − 3b)²', '(4a + 9b)(a + b)', '2a(2a + 9b)'],
    hint: '4a² + 9b² = (2a)² + (3b)². Sum of squares — irreducible over the reals.',
    historyKey: 'alg:ss:4a2+9b2',
  },
];

// ── 5. Factoring by Grouping ───────────────────────────────

const factoringGrouping: AlgebraProblem[] = [
  {
    id: 'fg01', category: 'Factoring by Grouping', group: 'quadratics',
    display: 'ax + ay + bx + by',
    question: 'Factor:',
    answer: '(a + b)(x + y)',
    options: ['(a + b)(x + y)', '(ax)(by)', 'ab + xy', '(a + x)(b + y)', '(a − b)(x − y)', 'a(x + y) + b'],
    hint: 'ax + ay + bx + by = a(x + y) + b(x + y) = (a + b)(x + y)',
    historyKey: 'alg:fg:abxy',
  },
  {
    id: 'fg02', category: 'Factoring by Grouping', group: 'quadratics',
    display: 'x³ + x² + x + 1',
    question: 'Factor:',
    answer: '(x² + 1)(x + 1)',
    options: ['(x² + 1)(x + 1)', '(x + 1)³', 'x(x² + 1) + 1', '(x³ + 1)(x + 1)', '(x + 1)(x − 1)(x + 1)', '(x² − 1)(x + 1)'],
    hint: 'x³ + x² + x + 1 = x²(x + 1) + 1(x + 1) = (x² + 1)(x + 1)',
    historyKey: 'alg:fg:x3+x2+x+1',
  },
  {
    id: 'fg05', category: 'Factoring by Grouping', group: 'quadratics',
    display: 'x² − 5x + 6',
    question: 'Factor:',
    answer: '(x − 2)(x − 3)',
    options: ['(x − 2)(x − 3)', '(x + 2)(x + 3)', '(x − 1)(x − 6)', '(x + 6)(x − 1)', '(x − 2)(x + 3)', '(x + 2)(x − 3)'],
    hint: 'Find two numbers that multiply to 6 and add to −5: −2 and −3.',
    historyKey: 'alg:fg:x2-5x+6',
  },
  {
    id: 'fg06', category: 'Factoring by Grouping', group: 'quadratics',
    display: 'x² + 7x + 12',
    question: 'Factor:',
    answer: '(x + 3)(x + 4)',
    options: ['(x + 3)(x + 4)', '(x + 2)(x + 6)', '(x + 1)(x + 12)', '(x + 7)(x + 1)', '(x − 3)(x − 4)', '(x + 4)(x − 3)'],
    hint: 'Find two numbers that multiply to 12 and add to 7: 3 and 4.',
    historyKey: 'alg:fg:x2+7x+12',
  },
];

// ── 6. Fraction Split ──────────────────────────────────────

const fractionSplit: AlgebraProblem[] = [
  {
    id: 'fs01', category: 'Fraction Split', group: 'exponents',
    display: '(a + b) / c',
    question: 'Which split is valid?',
    answer: 'a/c + b/c',
    options: ['a/c + b/c', 'a + b/c', '(a/c)(b/c)', 'a/(b + c)', 'a/c − b/c', '(a · b)/c'],
    hint: 'Numerator can be split: (a + b)/c = a/c + b/c',
    historyKey: 'alg:fs:num-split',
  },
  {
    id: 'fs02', category: 'Fraction Split', group: 'exponents',
    display: 'a / (b + c)',
    question: 'Can this be split as a/b + a/c?',
    answer: 'No — denominator can\'t be split',
    options: ['No — denominator can\'t be split', 'Yes, a/b + a/c', 'Yes, a/(b·c)', 'Yes, (a/b)(a/c)', 'Yes, a/b − a/c', 'Yes, (a − b)/c'],
    hint: 'a/(b + c) ≠ a/b + a/c. You can split the numerator, NEVER the denominator!',
    historyKey: 'alg:fs:denom-trap',
  },
  {
    id: 'fs03', category: 'Fraction Split', group: 'exponents',
    display: '(3x + 6) / 3',
    question: 'Simplify:',
    answer: 'x + 2',
    options: ['x + 2', '3x + 2', 'x + 6', '(x + 6)/3', 'x + 3', '3x + 6'],
    hint: '(3x + 6)/3 = 3x/3 + 6/3 = x + 2',
    historyKey: 'alg:fs:3x+6-over-3',
  },
  {
    id: 'fs04', category: 'Fraction Split', group: 'exponents',
    display: '(x² + x) / x',
    question: 'Simplify (x ≠ 0):',
    answer: 'x + 1',
    options: ['x + 1', 'x² + 1', 'x', '2x', 'x − 1', 'x² − 1'],
    hint: '(x² + x)/x = x²/x + x/x = x + 1',
    historyKey: 'alg:fs:x2+x-over-x',
  },
  {
    id: 'fs05', category: 'Fraction Split', group: 'exponents',
    display: '(2a − 4b) / 2',
    question: 'Simplify:',
    answer: 'a − 2b',
    options: ['a − 2b', '2a − 2b', 'a − 4b', '2(a − 2b)', 'a + 2b', '(a − b)/2'],
    hint: '(2a − 4b)/2 = 2a/2 − 4b/2 = a − 2b. Split the numerator, divide each term.',
    historyKey: 'alg:fs:2a-4b-over-2',
  },
  {
    id: 'fs06', category: 'Fraction Split', group: 'exponents',
    display: '3 / (x + y)',
    question: 'Can this be split as 3/x + 3/y?',
    answer: 'No — denominator can\'t be split',
    options: ['No — denominator can\'t be split', 'Yes, 3/x + 3/y', 'Yes, 3/(xy)', 'Yes, (3x + 3y)/xy', 'Yes, 3/x − 3/y', 'Yes, 1/x + 1/y'],
    hint: '3/(x + y) ≠ 3/x + 3/y. The denominator can NEVER be split. Common GMAT trap!',
    historyKey: 'alg:fs:3-over-sum',
  },
  {
    id: 'fs07', category: 'Fraction Split', group: 'exponents',
    display: '(x³ + x²) / x²',
    question: 'Simplify (x ≠ 0):',
    answer: 'x + 1',
    options: ['x + 1', 'x³ + 1', 'x² + 1', 'x', 'x³/x²', '1 + x²'],
    hint: '(x³ + x²)/x² = x³/x² + x²/x² = x + 1',
    historyKey: 'alg:fs:x3+x2-over-x2',
  },
  {
    id: 'fs08', category: 'Fraction Split', group: 'exponents',
    display: '(ab + ac) / a',
    question: 'Simplify (a ≠ 0):',
    answer: 'b + c',
    options: ['b + c', 'abc/a', 'ab + c', 'b + ac', 'a(b + c)', 'bc'],
    hint: '(ab + ac)/a = ab/a + ac/a = b + c. Factor numerator first: a(b+c)/a = b+c.',
    historyKey: 'alg:fs:ab+ac-over-a',
  },
];

// ── 7. Perfect Square Recognition ──────────────────────────

const perfectSquare: AlgebraProblem[] = [
  {
    id: 'ps01', category: 'Perfect Square Recognition', group: 'identities',
    display: 'x² + 8x + 16',
    question: 'Is this a perfect square trinomial?',
    answer: 'Yes — (x + 4)²',
    options: ['Yes — (x + 4)²', 'Yes — (x + 8)²', 'No — not a perfect square', 'Yes — (x + 16)²', 'Yes — (x + 2)²', 'No — factors as (x + 2)(x + 8)'],
    hint: 'x² + 8x + 16 = x² + 2(4)x + 4² = (x + 4)²',
    historyKey: 'alg:ps:x2+8x+16',
  },
  {
    id: 'ps02', category: 'Perfect Square Recognition', group: 'identities',
    display: 'x² + 6x + 8',
    question: 'Is this a perfect square trinomial?',
    answer: 'No — factors as (x + 2)(x + 4)',
    options: ['No — factors as (x + 2)(x + 4)', 'Yes — (x + 3)²', 'Yes — (x + 4)²', 'No — it\'s prime', 'Yes — (x + 2)²', 'No — factors as (x + 1)(x + 8)'],
    hint: '(x + 3)² = x² + 6x + 9, not 8. This factors as (x + 2)(x + 4).',
    historyKey: 'alg:ps:x2+6x+8',
  },
  {
    id: 'ps03', category: 'Perfect Square Recognition', group: 'identities',
    display: '9x² − 12x + 4',
    question: 'Is this a perfect square trinomial?',
    answer: 'Yes — (3x − 2)²',
    options: ['Yes — (3x − 2)²', 'Yes — (9x − 4)²', 'No — not a perfect square', 'Yes — (3x + 2)²', 'Yes — (3x − 4)²', 'No — factors as (3x − 1)(3x − 4)'],
    hint: '9x² − 12x + 4 = (3x)² − 2(3x)(2) + 2² = (3x − 2)²',
    historyKey: 'alg:ps:9x2-12x+4',
  },
  {
    id: 'ps04', category: 'Perfect Square Recognition', group: 'identities',
    display: 'x² − 2x + 1',
    question: 'Factor:',
    answer: '(x − 1)²',
    options: ['(x − 1)²', '(x + 1)²', '(x − 1)(x + 1)', 'x(x − 2) + 1', '(x − 2)²', '(x + 1)(x − 2)'],
    hint: 'x² − 2x + 1 = (x − 1)²',
    historyKey: 'alg:ps:x2-2x+1',
  },
  {
    id: 'ps05', category: 'Perfect Square Recognition', group: 'identities',
    display: '4x² + 12x + 9',
    question: 'Is this a perfect square trinomial?',
    answer: 'Yes — (2x + 3)²',
    options: ['Yes — (2x + 3)²', 'Yes — (4x + 3)²', 'No — not a perfect square', 'Yes — (2x + 9)²', 'Yes — (x + 3)²', 'No — factors as (2x + 1)(2x + 9)'],
    hint: '4x² + 12x + 9 = (2x)² + 2(2x)(3) + 3² = (2x + 3)²',
    historyKey: 'alg:ps:4x2+12x+9',
  },
  {
    id: 'ps06', category: 'Perfect Square Recognition', group: 'identities',
    display: 'x² + 10x + 24',
    question: 'Is this a perfect square trinomial?',
    answer: 'No — factors as (x + 4)(x + 6)',
    options: ['No — factors as (x + 4)(x + 6)', 'Yes — (x + 5)²', 'Yes — (x + 12)²', 'No — it\'s prime', 'Yes — (x + 24)²', 'No — factors as (x + 3)(x + 8)'],
    hint: '(x + 5)² = x² + 10x + 25, not 24. This factors as (x + 4)(x + 6).',
    historyKey: 'alg:ps:x2+10x+24',
  },
  {
    id: 'ps07', category: 'Perfect Square Recognition', group: 'identities',
    display: '25x² − 30x + 9',
    question: 'Is this a perfect square trinomial?',
    answer: 'Yes — (5x − 3)²',
    options: ['Yes — (5x − 3)²', 'Yes — (5x + 3)²', 'No — not a perfect square', 'Yes — (25x − 9)²', 'Yes — (5x − 9)²', 'No — factors as (5x − 1)(5x − 9)'],
    hint: '25x² − 30x + 9 = (5x)² − 2(5x)(3) + 3² = (5x − 3)²',
    historyKey: 'alg:ps:25x2-30x+9',
  },
  {
    id: 'ps08', category: 'Perfect Square Recognition', group: 'identities',
    display: 'x² − 14x + 49',
    question: 'Factor:',
    answer: '(x − 7)²',
    options: ['(x − 7)²', '(x + 7)²', '(x − 7)(x + 7)', 'No — not a perfect square', '(x − 49)²', '(x − 14)²'],
    hint: 'x² − 14x + 49 = x² − 2(7)x + 7² = (x − 7)²',
    historyKey: 'alg:ps:x2-14x+49',
  },
];

// ── 8. Spot the Identity ───────────────────────────────────

const spotTheIdentity: AlgebraProblem[] = [
  {
    id: 'si01', category: 'Spot the Identity', group: 'identities',
    display: '997 × 1003',
    question: 'Which identity does this use?',
    answer: 'Difference of Squares: (1000 − 3)(1000 + 3)',
    options: ['Difference of Squares: (1000 − 3)(1000 + 3)', 'Binomial Square: (1000 − 3)²', 'Sum of Squares', 'None — just multiply', 'Binomial Square: (1000 + 3)²', 'Factoring by Grouping'],
    hint: '997 × 1003 = (1000 − 3)(1000 + 3) = 1000² − 9 = 999991',
    historyKey: 'alg:si:997x1003',
  },
  {
    id: 'si02', category: 'Spot the Identity', group: 'identities',
    display: '(x − 4)²',
    question: 'Which identity?',
    answer: 'Binomial Square: (a − b)² = a² − 2ab + b²',
    options: ['Binomial Square: (a − b)² = a² − 2ab + b²', 'Difference of Squares: (a − b)(a + b)', 'Perfect Square: a² + b²', 'Factoring by Grouping', 'Binomial Square: (a + b)² = a² + 2ab + b²', 'Exponent Rule: x⁽ᵃᵇ⁾'],
    hint: '(x − 4)² = x² − 8x + 16 — classic (a − b)² pattern',
    historyKey: 'alg:si:x-4-sq',
  },
  {
    id: 'si03', category: 'Spot the Identity', group: 'identities',
    display: '36 − 25',
    question: 'Which identity can evaluate this quickly?',
    answer: 'Difference of Squares: 6² − 5² = (6−5)(6+5)',
    options: ['Difference of Squares: 6² − 5² = (6−5)(6+5)', 'Binomial Square: (6 − 5)²', 'Sum of Squares', 'Exponent Rule', 'Factoring by Grouping', 'None — just subtract'],
    hint: '36 − 25 = 6² − 5² = (6 − 5)(6 + 5) = 1 × 11 = 11',
    historyKey: 'alg:si:36-25',
  },
  {
    id: 'si04', category: 'Spot the Identity', group: 'identities',
    display: 'x⁴ − 1',
    question: 'Factor completely:',
    answer: '(x² − 1)(x² + 1) = (x−1)(x+1)(x²+1)',
    options: ['(x² − 1)(x² + 1) = (x−1)(x+1)(x²+1)', '(x² − 1)²', '(x − 1)⁴', '(x⁴ − 1) is prime', '(x − 1)(x + 1)(x − 1)(x + 1)', '(x² + 1)²'],
    hint: 'x⁴ − 1 = (x²)² − 1² → Difference of Squares, then factor x² − 1 again',
    historyKey: 'alg:si:x4-1',
  },
  {
    id: 'si05', category: 'Spot the Identity', group: 'identities',
    display: '(2x + 3)(2x − 3)',
    question: 'Which identity?',
    answer: 'Difference of Squares: 4x² − 9',
    options: ['Difference of Squares: 4x² − 9', 'Binomial Square: (2x)² + 9', 'FOIL only — no identity', 'Sum of Squares', 'Binomial Square: 4x² + 12x + 9', 'Difference of Squares: 4x² + 9'],
    hint: '(a + b)(a − b) = a² − b² → (2x)² − 3² = 4x² − 9',
    historyKey: 'alg:si:2x+3-2x-3',
  },
  {
    id: 'si06', category: 'Spot the Identity', group: 'identities',
    display: 'x² + 10x + 25',
    question: 'Which identity?',
    answer: 'Perfect Square: (x + 5)²',
    options: ['Perfect Square: (x + 5)²', 'Difference of Squares', 'Sum of Squares', 'Not factorable', 'Perfect Square: (x + 10)²', 'Factoring by Grouping'],
    hint: 'x² + 10x + 25 = x² + 2(5)x + 5² = (x + 5)²',
    historyKey: 'alg:si:x2+10x+25',
  },
  {
    id: 'si07', category: 'Spot the Identity', group: 'identities',
    display: '49 − x²',
    question: 'Factor:',
    answer: '(7 − x)(7 + x)',
    options: ['(7 − x)(7 + x)', '(7 − x)²', '(x − 7)(x + 7)', 'Not factorable', '(7 + x)²', '(49 − x)(1 + x)'],
    hint: '49 − x² = 7² − x² = (7 − x)(7 + x)',
    historyKey: 'alg:si:49-x2',
  },
  {
    id: 'si08', category: 'Spot the Identity', group: 'identities',
    display: '101²',
    question: 'Which identity computes this quickly?',
    answer: 'Binomial Square: (100 + 1)² = 10201',
    options: ['Binomial Square: (100 + 1)² = 10201', 'Difference of Squares', 'Exponent Rule', 'None — must multiply out', '(100 − 1)(100 + 1)', 'Sum of Squares'],
    hint: '101² = (100 + 1)² = 10000 + 200 + 1 = 10201',
    historyKey: 'alg:si:101sq',
  },
  {
    id: 'si09', category: 'Spot the Identity', group: 'identities',
    display: '16x² − 24x + 9',
    question: 'Which identity?',
    answer: 'Perfect Square: (4x − 3)²',
    options: ['Perfect Square: (4x − 3)²', 'Difference of Squares', '(4x + 3)²', 'Not a perfect square', '(4x − 9)²', 'Factoring by Grouping'],
    hint: '16x² − 24x + 9 = (4x)² − 2(4x)(3) + 3² = (4x − 3)²',
    historyKey: 'alg:si:16x2-24x+9',
  },
  {
    id: 'si10', category: 'Spot the Identity', group: 'identities',
    display: '98 × 102',
    question: 'Which identity?',
    answer: 'Difference of Squares: (100 − 2)(100 + 2) = 9996',
    options: ['Difference of Squares: (100 − 2)(100 + 2) = 9996', 'Binomial Square: (100 − 2)²', 'No identity applies', 'Exponent Rule', 'Binomial Square: (100 + 2)²', 'Sum of Squares'],
    hint: '98 × 102 = (100 − 2)(100 + 2) = 10000 − 4 = 9996',
    historyKey: 'alg:si:98x102',
  },
  {
    id: 'si11', category: 'Spot the Identity', group: 'identities',
    display: 'x² + 4',
    question: 'Can this be factored over the reals?',
    answer: 'No — sum of squares doesn\'t factor',
    options: ['No — sum of squares doesn\'t factor', 'Yes — (x + 2)²', 'Yes — (x + 2)(x − 2)', 'Yes — (x + 2i)(x − 2i)', 'Yes — (x + 4)(x − 1)', 'No — but x² − 4 does'],
    hint: 'x² + 4 ≠ (x + 2)(x − 2). That gives x² − 4. Sum of squares is NOT factorable over reals!',
    historyKey: 'alg:si:x2+4',
  },
  {
    id: 'si12', category: 'Spot the Identity', group: 'identities',
    display: '99²',
    question: 'Which identity computes this quickly?',
    answer: 'Binomial Square: (100 − 1)² = 9801',
    options: ['Binomial Square: (100 − 1)² = 9801', 'Difference of Squares', '(100 − 1)(100 + 1)', 'None — just multiply', 'Exponent Rule', 'Binomial Square: (99 + 1)² = 10000'],
    hint: '99² = (100 − 1)² = 10000 − 200 + 1 = 9801',
    historyKey: 'alg:si:99sq',
  },
];

// ── 9. Absolute Value Equations ─────────────────────────────

const absoluteValue: AlgebraProblem[] = [
  {
    id: 'av01', category: 'Absolute Value', group: 'inequalities',
    display: '|x − 3| = 7',
    question: 'Solutions:',
    answer: 'x = 10 or x = −4',
    options: ['x = 10 or x = −4', 'x = 10 only', 'x = 4 or x = −10', 'x = 7 or x = 3', 'x = −4 only', 'No solution'],
    hint: '|x − 3| = 7 → x − 3 = 7 or x − 3 = −7 → x = 10 or x = −4. Always two cases!',
    historyKey: 'alg:av:basic',
  },
  {
    id: 'av02', category: 'Absolute Value', group: 'inequalities',
    display: '|2x + 1| = −5',
    question: 'Solutions:',
    answer: 'No solution — absolute value can\'t be negative',
    options: ['No solution — absolute value can\'t be negative', 'x = −3', 'x = 2 or x = −3', 'x = −2', 'x = 3 or x = −3', 'x = 2'],
    hint: 'Absolute value is always ≥ 0. Equals −5? Impossible → no solution.',
    historyKey: 'alg:av:no-solution',
  },
  {
    id: 'av03', category: 'Absolute Value', group: 'inequalities',
    display: '|x| = |y|',
    question: 'This means:',
    answer: 'x = y or x = −y',
    options: ['x = y or x = −y', 'x = y only', 'x² = y only', 'x = −y only', 'x = y²', 'x + y = 0'],
    hint: '|x| = |y| means they\'re equal in magnitude. Either x = y (same) or x = −y (opposite).',
    historyKey: 'alg:av:equal-abs',
  },
  {
    id: 'av04', category: 'Absolute Value', group: 'inequalities',
    display: '|x − 5| < 3',
    question: 'Solution set:',
    answer: '2 < x < 8',
    options: ['2 < x < 8', 'x < 8', 'x > 2', 'x < 2 or x > 8', '−3 < x < 3', '5 < x < 8'],
    hint: '|x − 5| < 3 → −3 < x − 5 < 3 → 2 < x < 8. Absolute value inequality → "sandwich."',
    historyKey: 'alg:av:inequality',
  },
];

// ── 10. Sum & Difference of Cubes ──────────────────────────

const cubes: AlgebraProblem[] = [
  {
    id: 'sc01', category: 'Sum & Difference of Cubes', group: 'identities',
    display: 'a³ + b³',
    question: 'Factor:',
    answer: '(a + b)(a² − ab + b²)',
    options: ['(a + b)(a² − ab + b²)', '(a + b)³', '(a + b)(a² + ab + b²)', '(a − b)(a² + ab + b²)', '(a + b)(a − b)²', 'Not factorable'],
    hint: 'Sum of cubes: a³ + b³ = (a + b)(a² − ab + b²). "SOAP" signs: Same, Opposite, Always Positive.',
    historyKey: 'alg:sc:sum-cubes',
  },
  {
    id: 'sc02', category: 'Sum & Difference of Cubes', group: 'identities',
    display: 'a³ − b³',
    question: 'Factor:',
    answer: '(a − b)(a² + ab + b²)',
    options: ['(a − b)(a² + ab + b²)', '(a − b)³', '(a − b)(a² − ab + b²)', '(a + b)(a² − ab + b²)', '(a − b)(a + b)²', 'Not factorable'],
    hint: 'Diff of cubes: a³ − b³ = (a − b)(a² + ab + b²). Middle term is POSITIVE for difference.',
    historyKey: 'alg:sc:diff-cubes',
  },
  {
    id: 'sc03', category: 'Sum & Difference of Cubes', group: 'identities',
    display: '8x³ + 27',
    question: 'Factor:',
    answer: '(2x + 3)(4x² − 6x + 9)',
    options: ['(2x + 3)(4x² − 6x + 9)', '(2x + 3)³', '(2x + 27)(4x² − 1)', '(8x + 27)(x² − 1)', '(2x − 3)(4x² + 6x + 9)', '(2x + 3)(4x² + 6x + 9)'],
    hint: '8x³ + 27 = (2x)³ + 3³. Sum of cubes: (2x + 3)((2x)² − (2x)(3) + 3²).',
    historyKey: 'alg:sc:8x3+27',
  },
  {
    id: 'sc04', category: 'Sum & Difference of Cubes', group: 'identities',
    display: 'x³ − 64',
    question: 'Factor:',
    answer: '(x − 4)(x² + 4x + 16)',
    options: ['(x − 4)(x² + 4x + 16)', '(x − 4)³', '(x − 4)(x² − 4x + 16)', '(x + 4)(x² − 4x + 16)', '(x − 8)(x² + 8)', '(x − 4)(x + 4)²'],
    hint: 'x³ − 64 = x³ − 4³. Diff of cubes: (x − 4)(x² + 4x + 16).',
    historyKey: 'alg:sc:x3-64',
  },
];

// ── 11. Quadratic Discriminant ─────────────────────────────

const discriminant: AlgebraProblem[] = [
  {
    id: 'qd01', category: 'Quadratic Discriminant', group: 'quadratics',
    display: 'ax² + bx + c = 0',
    question: 'The discriminant is:',
    answer: 'b² − 4ac',
    options: ['b² − 4ac', 'b² + 4ac', '4ac − b²', '√(b² − 4ac)', '−b ± √(b² − 4ac)', 'b² − 2ac'],
    hint: 'D = b² − 4ac. This determines the nature of the roots.',
    historyKey: 'alg:qd:formula',
  },
  {
    id: 'qd02', category: 'Quadratic Discriminant', group: 'quadratics',
    display: 'D = b² − 4ac > 0',
    question: 'The quadratic has:',
    answer: 'Two distinct real roots',
    options: ['Two distinct real roots', 'One repeated real root', 'No real roots', 'Infinitely many roots', 'One real, one complex', 'Cannot determine'],
    hint: 'D > 0 → two distinct real roots. D = 0 → one repeated. D < 0 → no real roots.',
    historyKey: 'alg:qd:positive',
  },
  {
    id: 'qd03', category: 'Quadratic Discriminant', group: 'quadratics',
    display: 'x² + 4x + 4 = 0',
    question: 'How many real solutions?',
    answer: 'One (repeated root)',
    options: ['One (repeated root)', 'Two distinct roots', 'No real roots', 'Infinitely many', 'Cannot determine', 'Zero or one'],
    hint: 'D = 16 − 16 = 0 → one repeated root. (x + 2)² = 0 → x = −2.',
    historyKey: 'alg:qd:zero-disc',
  },
  {
    id: 'qd04', category: 'Quadratic Discriminant', group: 'quadratics',
    display: '2x² + x + 3 = 0',
    question: 'How many real solutions?',
    answer: 'None — D < 0',
    options: ['None — D < 0', 'Two distinct roots', 'One repeated root', 'Infinitely many', 'One real root', 'Cannot determine'],
    hint: 'D = 1 − 24 = −23 < 0 → no real roots. The parabola doesn\'t cross the x-axis.',
    historyKey: 'alg:qd:negative',
  },
];

// ── 12. Algebraic Manipulation ─────────────────────────────

const algebraicManipulation: AlgebraProblem[] = [
  {
    id: 'am01', category: 'Algebraic Manipulation', group: 'quadratics',
    display: 'x + 1/x = k',
    question: 'What is x² + 1/x²?',
    answer: 'k² − 2',
    options: ['k² − 2', 'k²', 'k² + 2', '2k − 1', 'k² − 1', '(k − 1)²'],
    hint: 'Square both sides: (x + 1/x)² = x² + 2 + 1/x². So x² + 1/x² = k² − 2.',
    historyKey: 'alg:am:x+1overx',
  },
  {
    id: 'am02', category: 'Algebraic Manipulation', group: 'quadratics',
    display: 'Given (a + b) and (a − b)',
    question: 'How to find ab?',
    answer: '(a+b)² − (a−b)² = 4ab',
    options: ['(a+b)² − (a−b)² = 4ab', '(a+b)(a−b) = ab', '(a+b) + (a−b) = 2ab', 'ab = (a+b)/(a−b)', '(a+b)² + (a−b)² = 4ab', 'ab = (a² − b²)/2'],
    hint: 'Expand: (a+b)² − (a−b)² = 4ab. So ab = [(a+b)² − (a−b)²] / 4.',
    historyKey: 'alg:am:sum-diff',
  },
  {
    id: 'am03', category: 'Algebraic Manipulation', group: 'quadratics',
    display: 'x² − y² = 24, x − y = 4',
    question: 'Which identity finds x + y?',
    answer: 'x² − y² = (x−y)(x+y)',
    options: ['x² − y² = (x−y)(x+y)', '(x+y)² = x² − y²', '(x−y)² = x² − y²', 'x + y = √(x² − y²)', 'x² − y² = x−y + x+y', '(x−y)(x−y) = x² − y²'],
    hint: 'Factor: 24 = 4(x+y) → x+y = 6. Key: recognize difference of squares.',
    historyKey: 'alg:am:diff-sq-system',
  },
  {
    id: 'am04', category: 'Algebraic Manipulation', group: 'quadratics',
    display: 'If a/b = 3/4',
    question: '(a + b) / (a − b) = ?',
    answer: '−7',
    options: ['−7', '7', '7/1', '1/7', '12', '−1/7'],
    hint: 'Let a = 3k, b = 4k. (3k+4k)/(3k−4k) = 7k/(−k) = −7.',
    historyKey: 'alg:am:ratio-manip',
  },
  {
    id: 'am05', category: 'Algebraic Manipulation', group: 'quadratics',
    display: 'x(x + 5) = 0',
    question: 'Solutions:',
    answer: 'x = 0 or x = −5',
    options: ['x = 0 or x = −5', 'x = −5 only', 'x = 5 only', 'x = 0 only', 'x = 5 or x = −5', 'No solution'],
    hint: 'Zero Product Property: if ab = 0, then a = 0 or b = 0. Don\'t divide by x — you lose x = 0!',
    historyKey: 'alg:am:zero-product',
  },
];

// ── 13. Function Notation ──────────────────────────────────

const functionNotation: AlgebraProblem[] = [
  {
    id: 'fn01', category: 'Function Notation', group: 'quadratics',
    display: 'f(x) = 2x + 3',
    question: 'f(5) = ?',
    answer: '13',
    options: ['13', '10', '8', '15', '11', '16'],
    hint: 'f(5) = 2(5) + 3 = 10 + 3 = 13. Substitute x = 5.',
    historyKey: 'alg:fn:basic-eval',
  },
  {
    id: 'fn02', category: 'Function Notation', group: 'quadratics',
    display: 'f(x) = x² − 1',
    question: 'f(a + 1) = ?',
    answer: 'a² + 2a',
    options: ['a² + 2a', 'a² + 1', 'a² − 1', 'a² + 2a + 1', 'a² + 2a − 1', '(a+1)²'],
    hint: 'f(a+1) = (a+1)² − 1 = a² + 2a + 1 − 1 = a² + 2a.',
    historyKey: 'alg:fn:composite-input',
  },
  {
    id: 'fn03', category: 'Function Notation', group: 'quadratics',
    display: 'f(x) = 3x, g(x) = x + 2',
    question: 'f(g(x)) = ?',
    answer: '3x + 6',
    options: ['3x + 6', '3x + 2', 'x + 6', '3(x + 2x)', '3x² + 6', '9x + 2'],
    hint: 'f(g(x)) = f(x + 2) = 3(x + 2) = 3x + 6. Substitute g(x) into f.',
    historyKey: 'alg:fn:composition',
  },
  {
    id: 'fn04', category: 'Function Notation', group: 'quadratics',
    display: 'f(x) = x² + 1',
    question: 'f(−x) = ?',
    answer: 'x² + 1 (same as f(x))',
    options: ['x² + 1 (same as f(x))', '−x² + 1', '−x² − 1', 'x² − 1', '−(x² + 1)', '1 − x²'],
    hint: 'f(−x) = (−x)² + 1 = x² + 1 = f(x). This means f is an even function.',
    historyKey: 'alg:fn:even-function',
  },
];

// ── 14. Inequalities ─────────────────────────────────────

const inequalities: AlgebraProblem[] = [
  {
    id: 'iq01', category: 'Inequalities', group: 'inequalities',
    display: 'x² − 5x + 6 > 0',
    question: 'What is the solution set?',
    answer: 'x < 2 or x > 3',
    options: ['x < 2 or x > 3', '2 < x < 3', 'x > 2', 'x < 3', 'x > 6', 'x ≤ 2 or x ≥ 3'],
    hint: 'Factor: (x − 2)(x − 3) > 0. Both factors same sign ⇒ x < 2 or x > 3.',
    historyKey: 'alg:iq:quad-gt',
  },
  {
    id: 'iq02', category: 'Inequalities', group: 'inequalities',
    display: 'x² − 4x − 5 ≤ 0',
    question: 'What is the solution set?',
    answer: '−1 ≤ x ≤ 5',
    options: ['−1 ≤ x ≤ 5', 'x ≤ −1 or x ≥ 5', '0 ≤ x ≤ 5', '−5 ≤ x ≤ 1', 'x < −1 or x > 5', '−1 < x < 5'],
    hint: 'Factor: (x − 5)(x + 1) ≤ 0. Product ≤ 0 ⇒ −1 ≤ x ≤ 5.',
    historyKey: 'alg:iq:quad-leq',
  },
  {
    id: 'iq03', category: 'Inequalities', group: 'inequalities',
    display: '(x − 1)(x + 3) < 0',
    question: 'What is the solution set?',
    answer: '−3 < x < 1',
    options: ['−3 < x < 1', 'x < −3 or x > 1', '−1 < x < 3', 'x > 1', 'x < −3', '−3 ≤ x ≤ 1'],
    hint: 'Product < 0 ⇒ factors have opposite signs ⇒ −3 < x < 1.',
    historyKey: 'alg:iq:factor-lt',
  },
  {
    id: 'iq04', category: 'Inequalities', group: 'inequalities',
    display: '|2x − 3| > 5',
    question: 'What is the solution set?',
    answer: 'x < −1 or x > 4',
    options: ['x < −1 or x > 4', '−1 < x < 4', 'x > 4', 'x < −1', '−4 < x < 1', 'x ≤ −1 or x ≥ 4'],
    hint: '|2x − 3| > 5 ⇒ 2x − 3 > 5 or 2x − 3 < −5 ⇒ x > 4 or x < −1.',
    historyKey: 'alg:iq:abs-gt',
  },
  {
    id: 'iq05', category: 'Inequalities', group: 'inequalities',
    display: '|x + 2| ≤ 4',
    question: 'What is the solution set?',
    answer: '−6 ≤ x ≤ 2',
    options: ['−6 ≤ x ≤ 2', 'x ≤ −6 or x ≥ 2', '−2 ≤ x ≤ 4', '−4 ≤ x ≤ 2', '−6 < x < 2', 'x ≥ −6'],
    hint: '|x + 2| ≤ 4 ⇒ −4 ≤ x + 2 ≤ 4 ⇒ −6 ≤ x ≤ 2.',
    historyKey: 'alg:iq:abs-leq',
  },
  {
    id: 'iq06', category: 'Inequalities', group: 'inequalities',
    display: '3x − 7 < 2x + 5',
    question: 'What is the solution set?',
    answer: 'x < 12',
    options: ['x < 12', 'x > 12', 'x < 2', 'x > 2', 'x ≤ 12', 'x < −12'],
    hint: '3x − 2x < 5 + 7 ⇒ x < 12.',
    historyKey: 'alg:iq:linear',
  },
  {
    id: 'iq07', category: 'Inequalities', group: 'inequalities',
    display: '−2x + 1 > 7',
    question: 'What is the solution set?',
    answer: 'x < −3',
    options: ['x < −3', 'x > −3', 'x < 3', 'x > 3', 'x ≤ −3', 'x < −4'],
    hint: '−2x > 6 ⇒ x < −3 (flip inequality when dividing by negative).',
    historyKey: 'alg:iq:neg-coeff',
  },
  {
    id: 'iq08', category: 'Inequalities', group: 'inequalities',
    display: 'x/3 + 1 < x/2 − 2',
    question: 'What is the solution set?',
    answer: 'x > 18',
    options: ['x > 18', 'x < 18', 'x > 6', 'x < 6', 'x ≥ 18', 'x > 9'],
    hint: 'Multiply by 6: 2x + 6 < 3x − 12 ⇒ 18 < x.',
    historyKey: 'alg:iq:frac-ineq',
  },
  {
    id: 'iq09', category: 'Inequalities', group: 'inequalities',
    display: 'x² ≥ 16',
    question: 'What is the solution set?',
    answer: 'x ≤ −4 or x ≥ 4',
    options: ['x ≤ −4 or x ≥ 4', 'x ≥ 4', '−4 ≤ x ≤ 4', 'x ≤ −4', 'x > 4', 'x ≥ 16'],
    hint: 'x² ≥ 16 ⇒ |x| ≥ 4 ⇒ x ≤ −4 or x ≥ 4.',
    historyKey: 'alg:iq:sq-geq',
  },
  {
    id: 'iq10', category: 'Inequalities', group: 'inequalities',
    display: '(x + 1)/(x − 2) > 0',
    question: 'What is the solution set?',
    answer: 'x < −1 or x > 2',
    options: ['x < −1 or x > 2', '−1 < x < 2', 'x > 2', 'x > −1', 'x < −1', '−2 < x < 1'],
    hint: 'Sign chart: both factors same sign ⇒ x < −1 or x > 2. (x ≠ 2)',
    historyKey: 'alg:iq:rational',
  },
  {
    id: 'iq11', category: 'Inequalities', group: 'inequalities',
    display: '1/x < 3, x > 0',
    question: 'What is the solution set?',
    answer: 'x > 1/3',
    options: ['x > 1/3', 'x < 1/3', 'x > 3', 'x < 3', '0 < x < 1/3', 'x ≥ 1/3'],
    hint: 'x > 0, so multiply both sides by x: 1 < 3x ⇒ x > 1/3.',
    historyKey: 'alg:iq:recip',
  },
  {
    id: 'iq12', category: 'Inequalities', group: 'inequalities',
    display: 'If −3 < x < 5 and −2 < y < 4',
    question: 'What is the range of x − y?',
    answer: '−7 < x − y < 7',
    options: ['−7 < x − y < 7', '−5 < x − y < 3', '−1 < x − y < 9', '−7 < x − y < 3', '−5 < x − y < 7', '−3 < x − y < 5'],
    hint: 'x − y range: min(x) − max(y) to max(x) − min(y) = −3 − 4 to 5 − (−2) = −7 to 7.',
    historyKey: 'alg:iq:range-diff',
  },
];

// ── 15. Quadratic Shortcuts ──────────────────────────────

const quadraticShortcuts: AlgebraProblem[] = [
  {
    id: 'qs01', category: 'Quadratic Shortcuts', group: 'quadratics',
    display: 'x² − 7x + 12 = 0',
    question: 'What is the sum of the roots?',
    answer: '7',
    options: ['7', '12', '−7', '−12', '3', '4'],
    hint: 'By Vieta\'s: sum of roots = −(−7)/1 = 7.',
    historyKey: 'alg:qs:vieta-sum',
  },
  {
    id: 'qs02', category: 'Quadratic Shortcuts', group: 'quadratics',
    display: 'x² − 7x + 12 = 0',
    question: 'What is the product of the roots?',
    answer: '12',
    options: ['12', '7', '−12', '−7', '3', '4'],
    hint: 'By Vieta\'s: product of roots = 12/1 = 12.',
    historyKey: 'alg:qs:vieta-prod',
  },
  {
    id: 'qs03', category: 'Quadratic Shortcuts', group: 'quadratics',
    display: '2x² + 5x − 3 = 0',
    question: 'What is the sum of the roots?',
    answer: '−5/2',
    options: ['−5/2', '5/2', '−3/2', '3/2', '−5', '5'],
    hint: 'Sum of roots = −b/a = −5/2.',
    historyKey: 'alg:qs:vieta-sum2',
  },
  {
    id: 'qs04', category: 'Quadratic Shortcuts', group: 'quadratics',
    display: '2x² + 5x − 3 = 0',
    question: 'What is the product of the roots?',
    answer: '−3/2',
    options: ['−3/2', '3/2', '−5/2', '5/2', '−3', '6'],
    hint: 'Product of roots = c/a = −3/2.',
    historyKey: 'alg:qs:vieta-prod2',
  },
  {
    id: 'qs05', category: 'Quadratic Shortcuts', group: 'quadratics',
    display: 'x² + 6x + k = 0 has exactly one real root',
    question: 'What is k?',
    answer: '9',
    options: ['9', '6', '3', '36', '12', '−9'],
    hint: 'One real root ⇒ discriminant = 0: 36 − 4k = 0 ⇒ k = 9.',
    historyKey: 'alg:qs:disc-zero',
  },
  {
    id: 'qs06', category: 'Quadratic Shortcuts', group: 'quadratics',
    display: '3x² − 2x + 5 = 0',
    question: 'How many real roots?',
    answer: '0',
    options: ['0', '1', '2', '3', 'Cannot determine', 'Infinitely many'],
    hint: 'Discriminant = 4 − 60 = −56 < 0 ⇒ no real roots.',
    historyKey: 'alg:qs:disc-neg',
  },
  {
    id: 'qs07', category: 'Quadratic Shortcuts', group: 'quadratics',
    display: 'x² − 10x + 25 = 0',
    question: 'Factor this equation:',
    answer: '(x − 5)² = 0',
    options: ['(x − 5)² = 0', '(x + 5)² = 0', '(x − 5)(x + 5) = 0', '(x − 25)(x − 1) = 0', '(x + 5)(x − 5) = 0', '(x − 10)(x + 25) = 0'],
    hint: 'x² − 10x + 25 = (x − 5)². Perfect square trinomial.',
    historyKey: 'alg:qs:perf-sq-quad',
  },
  {
    id: 'qs08', category: 'Quadratic Shortcuts', group: 'quadratics',
    display: 'If r and s are roots of x² − 8x + 15 = 0',
    question: 'What is r² + s²?',
    answer: '34',
    options: ['34', '64', '49', '30', '46', '19'],
    hint: 'r² + s² = (r + s)² − 2rs = 64 − 30 = 34.',
    historyKey: 'alg:qs:sum-sq-roots',
  },
  {
    id: 'qs09', category: 'Quadratic Shortcuts', group: 'quadratics',
    display: 'x² + bx + 16 = 0 has two positive integer roots',
    question: 'How many values of b are possible?',
    answer: '3',
    options: ['3', '1', '2', '4', '5', '0'],
    hint: 'Factor pairs of 16: (1,16), (2,8), (4,4). So b = −17, −10, −8. Three values.',
    historyKey: 'alg:qs:count-b',
  },
  {
    id: 'qs10', category: 'Quadratic Shortcuts', group: 'quadratics',
    display: '(x − 3)(x − 5) = −1',
    question: 'What are the solutions?',
    answer: 'x = 4',
    options: ['x = 4', 'x = 3, x = 5', 'x = 2, x = 6', 'x = 4, x = 4', 'x = 1', 'No real solution'],
    hint: 'Expand: x² − 8x + 15 = −1 ⇒ x² − 8x + 16 = 0 ⇒ (x − 4)² = 0.',
    historyKey: 'alg:qs:clever-expand',
  },
];

// ── Export all ──────────────────────────────────────────────

export const ALL_ALGEBRA_PROBLEMS: AlgebraProblem[] = [
  ...diffOfSquares,
  ...binomialSquares,
  ...exponentRules,
  ...sumOfSquaresTrap,
  ...factoringGrouping,
  ...fractionSplit,
  ...perfectSquare,
  ...spotTheIdentity,
  ...absoluteValue,
  ...cubes,
  ...discriminant,
  ...algebraicManipulation,
  ...functionNotation,
  ...inequalities,
  ...quadraticShortcuts,
];

export type GauntletGroup = 'identities' | 'exponents' | 'quadratics' | 'inequalities';

export const GAUNTLET_GROUPS: Record<GauntletGroup, string> = {
  identities: 'Identities',
  exponents: 'Exponents',
  quadratics: 'Quadratics',
  inequalities: 'Inequalities',
};

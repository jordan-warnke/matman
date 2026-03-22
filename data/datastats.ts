/**
 * Data & Statistics — GMAT drill bank.
 *
 * Categories:
 *  1. Overlap & Sets Setups       (inclusion-exclusion, Venn diagrams)
 *  2. Counting & Probability      (combinations, permutations, complement)
 *  3. Statistics & Sequences      (sums, means, SD, percent change)
 */

export interface DataStatsProblem {
  id: string;
  category: string;
  display: string;
  question: string;
  answer: string;
  options: string[];
  hint: string;
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
export function shuffleDataStatsOptions(p: DataStatsProblem, avoidIdx?: number): DataStatsProblem {
  const wrong = shuffle(p.options.filter((o) => o !== p.answer)).slice(0, 3);
  const all = [p.answer, ...wrong];
  if (avoidIdx !== undefined && avoidIdx >= 0) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const s = shuffle(all);
      if (s.indexOf(p.answer) !== avoidIdx) return { ...p, options: s };
    }
  }
  return { ...p, options: shuffle(all) };
}

// ── 1. Overlap & Sets Setups ───────────────────────────────

const overlapFormulas: DataStatsProblem[] = [
  {
    id: 'ol01', category: 'Overlap & Sets Setups',
    display: '"a members in A, b in B, c in both. Total is T."',
    question: 'Members in A ∪ B (at least one):',
    answer: 'a + b − c',
    options: ['a + b − c', 'a + b', 'a + b + c', 'T − c', '(a + b) / 2', 'a − b + c'],
    hint: 'Inclusion-exclusion: |A ∪ B| = |A| + |B| − |A ∩ B|. Subtract overlap to avoid double-counting.',
    historyKey: 'wp:ol:inclusion-exclusion',
  },
  {
    id: 'ol02', category: 'Overlap & Sets Setups',
    display: '"T members total, a in Group A, b in Group B, c in both"',
    question: 'Members in neither group:',
    answer: 'T − a − b + c',
    options: ['T − a − b + c', 'T − a − b', 'T − a − b − c', 'T − (a + b)', 'T − c', 'a + b − c − T'],
    hint: 'Neither = T − |A ∪ B| = T − (a + b − c) = T − a − b + c.',
    historyKey: 'wp:ol:neither',
  },
  {
    id: 'ol03', category: 'Overlap & Sets Setups',
    display: '"x members total, every member in at least one of A or B. a in A, b in B."',
    question: 'Members in A ∩ B (both):',
    answer: 'a + b − x',
    options: ['a + b − x', 'x − a − b', 'a − b', '(a + b) / x', 'x − (a − b)', 'ab / x'],
    hint: 'Everyone in at least one: x = a + b − both. So both = a + b − x.',
    historyKey: 'wp:ol:find-overlap',
  },
  {
    id: 'ol04', category: 'Overlap & Sets Setups',
    display: '"Three sets A, B, C. Sizes: a, b, c. Pairwise overlaps: d, e, f. Triple overlap: g."',
    question: '|A ∪ B ∪ C| = ?',
    answer: 'a + b + c − d − e − f + g',
    options: ['a + b + c − d − e − f + g', 'a + b + c − d − e − f', 'a + b + c − d − e − f − g', 'a + b + c', 'a + b + c + g', 'a + b + c − 2(d + e + f) + g'],
    hint: '3-set inclusion-exclusion: add singles, subtract pairs, add back triple.',
    historyKey: 'wp:ol:three-sets',
  },
  {
    id: 'ol05', category: 'Overlap & Sets Setups',
    display: '"100 students: 60 take math, 50 take science, 20 take both."',
    question: 'Students taking neither:',
    answer: '10',
    options: ['10', '20', '30', '0', '40', '90'],
    hint: 'Neither = 100 − (60 + 50 − 20) = 100 − 90 = 10.',
    historyKey: 'wp:ol:concrete-neither',
  },
  {
    id: 'ol06', category: 'Overlap & Sets Setups',
    display: '"Only A" in a two-set Venn diagram means:',
    question: 'How to compute "Only A":',
    answer: '|A| − |A ∩ B|',
    options: ['|A| − |A ∩ B|', '|A| + |A ∩ B|', '|A| − |B|', '|A ∪ B| − |B|', '|A| × |B|', '|A| / |A ∩ B|'],
    hint: 'Only A = members in A but NOT in B = |A| minus those in both = |A| − |A ∩ B|.',
    historyKey: 'wp:ol:only-a',
  },
  {
    id: 'ol07', category: 'Overlap & Sets Setups',
    display: '"P(A or B) for mutually exclusive events"',
    question: 'Formula:',
    answer: 'P(A) + P(B)',
    options: ['P(A) + P(B)', 'P(A) + P(B) − P(A∩B)', 'P(A) × P(B)', 'P(A) − P(B)', '1 − P(A)P(B)', 'P(A)/P(B)'],
    hint: 'Mutually exclusive = no overlap. P(A or B) = P(A) + P(B). No subtraction needed.',
    historyKey: 'wp:ol:mutually-excl',
  },
  {
    id: 'ol08', category: 'Overlap & Sets Setups',
    display: '"P(A or B)" for general events',
    question: 'Formula:',
    answer: 'P(A) + P(B) − P(A ∩ B)',
    options: ['P(A) + P(B) − P(A ∩ B)', 'P(A) + P(B)', 'P(A) × P(B)', 'P(A) − P(B) + P(A∩B)', '1 − P(A)P(B)', 'P(A∪B) = P(A)P(B)'],
    hint: 'General addition rule: subtract intersection to avoid double counting.',
    historyKey: 'wp:ol:general-or',
  },
];

// ── 2. Counting & Probability ──────────────────────────────

const countingFormulas: DataStatsProblem[] = [
  {
    id: 'ct01', category: 'Counting & Probability',
    display: '"choose r items from n (order doesn\'t matter)"',
    question: 'Formula:',
    answer: 'n! / (r!(n − r)!)',
    options: ['n! / (r!(n − r)!)', 'n! / (n − r)!', 'n! / r!', 'nʳ', 'n² / r!', '(n − r)! / n!'],
    hint: 'Combinations: C(n,r) = n! / (r!(n−r)!). Order doesn\'t matter → divide by r!.',
    historyKey: 'wp:ct:combinations',
  },
  {
    id: 'ct02', category: 'Counting & Probability',
    display: '"arrange n distinct items in a row"',
    question: 'Number of arrangements:',
    answer: 'n!',
    options: ['n!', 'n²', '2ⁿ', 'n(n−1)', 'nⁿ', '(n+1)!'],
    hint: 'Permutations of n distinct items = n! (n choices × (n−1) × ... × 1).',
    historyKey: 'wp:ct:permutations',
  },
  {
    id: 'ct03', category: 'Counting & Probability',
    display: '"P(A and B), events are independent"',
    question: 'Formula:',
    answer: 'P(A) × P(B)',
    options: ['P(A) × P(B)', 'P(A) + P(B)', 'P(A) + P(B) − P(A)P(B)', 'P(A) / P(B)', 'P(A) × P(B|A)', 'P(A) + P(B) − P(A∩B)'],
    hint: 'Independent events: P(A and B) = P(A) × P(B). Multiply probabilities.',
    historyKey: 'wp:ct:independent',
  },
  {
    id: 'ct04', category: 'Counting & Probability',
    display: '"probability of at least one success"',
    question: 'Formula:',
    answer: '1 − P(no successes)',
    options: ['1 − P(no successes)', 'P(one) + P(two) + ...', 'n × P(one)', '1 / n', 'P(all successes)', '1 − P(all successes)'],
    hint: 'Complement trick: P(at least one) = 1 − P(none). Much easier than adding all cases.',
    historyKey: 'wp:ct:complement',
  },
  {
    id: 'ct05', category: 'Counting & Probability',
    display: '"exactly k successes in n independent trials, P(success) = p"',
    question: 'Formula:',
    answer: 'C(n,k) × pᵏ × (1−p)ⁿ⁻ᵏ',
    options: ['C(n,k) × pᵏ × (1−p)ⁿ⁻ᵏ', 'n × pᵏ', 'pᵏ × (1−p)ⁿ', 'C(n,k) × pⁿ', 'n! × pᵏ', 'C(n,k) × (1−p)ᵏ'],
    hint: 'Binomial probability: choose which k trials succeed × P(each pattern).',
    historyKey: 'wp:ct:binomial',
  },
  {
    id: 'ct06', category: 'Counting & Probability',
    display: '"arrange n items in a circle"',
    question: 'Number of arrangements:',
    answer: '(n − 1)!',
    options: ['(n − 1)!', 'n!', 'n!/2', 'n²', '(n+1)!', 'n(n−1)'],
    hint: 'Circular arrangement: fix one, arrange rest. (n−1)! distinct seatings.',
    historyKey: 'wp:ct:circular',
  },
  {
    id: 'ct07', category: 'Counting & Probability',
    display: '"arrange n items where p are identical of one type, q identical of another"',
    question: 'Formula:',
    answer: 'n! / (p! × q!)',
    options: ['n! / (p! × q!)', 'n! / (n − p)!', 'n! / p!', 'C(n,p) × C(n,q)', 'n! / (p + q)!', 'p! × q! / n!'],
    hint: 'Permutations of indistinguishable items: divide by p! and q! to remove overcounting.',
    historyKey: 'wp:ct:identical-perms',
  },
  {
    id: 'ct08', category: 'Counting & Probability',
    display: '"P(A or B) for mutually exclusive events"',
    question: 'Formula:',
    answer: 'P(A) + P(B)',
    options: ['P(A) + P(B)', 'P(A) × P(B)', 'P(A) + P(B) − P(A)P(B)', '1 − P(A)P(B)', 'P(A) / P(B)', 'P(A) + P(B) + P(A∩B)'],
    hint: 'Mutually exclusive: can\'t both occur. P(A or B) = P(A) + P(B). Just add!',
    historyKey: 'wp:ct:mutual-excl',
  },
  {
    id: 'ct09', category: 'Counting & Probability',
    display: '"choose r items from n where order matters"',
    question: 'Formula:',
    answer: 'n! / (n − r)!',
    options: ['n! / (n − r)!', 'n! / (r!(n−r)!)', 'n!', 'nʳ', 'r! / n!', 'C(n,r) × r!'],
    hint: 'Permutations P(n,r) = n!/(n−r)!. Order matters → don\'t divide by r!.',
    historyKey: 'wp:ct:perm-formula',
  },
  {
    id: 'ct10', category: 'Counting & Probability',
    display: '"probability of A given B has occurred"',
    question: 'Formula for P(A|B):',
    answer: 'P(A ∩ B) / P(B)',
    options: ['P(A ∩ B) / P(B)', 'P(A) × P(B)', 'P(A) + P(B)', 'P(B ∩ A) / P(A)', 'P(A) / P(B)', 'P(A) − P(B)'],
    hint: 'Conditional probability: P(A|B) = P(A and B) / P(B). Restrict the sample space to B.',
    historyKey: 'wp:ct:conditional',
  },
  {
    id: 'ct11', category: 'Counting & Probability',
    display: '"ways to divide n distinct items into groups of sizes a, b, c (a+b+c = n)"',
    question: 'Formula:',
    answer: 'n! / (a! × b! × c!)',
    options: ['n! / (a! × b! × c!)', 'C(n,a) × C(n,b) × C(n,c)', 'n! / (a + b + c)!', '3 × n!', 'n! / 3!', 'C(n,a) + C(n,b) + C(n,c)'],
    hint: 'Multinomial coefficient: choose a from n, then b from remaining, etc. Result: n!/(a!b!c!).',
    historyKey: 'wp:ct:multinomial',
  },
  {
    id: 'ct12', category: 'Counting & Probability',
    display: '"expected value of a random variable X with outcomes xᵢ and probabilities pᵢ"',
    question: 'E(X) = ?',
    answer: 'Σ xᵢ × pᵢ',
    options: ['Σ xᵢ × pᵢ', 'Σ xᵢ / n', 'max(xᵢ) × max(pᵢ)', 'Σ pᵢ / n', 'Σ xᵢ × (1−pᵢ)', 'Σ (xᵢ + pᵢ)'],
    hint: 'Expected value: sum of each outcome times its probability. Weighted average of outcomes.',
    historyKey: 'wp:ct:expected-value',
  },
];

// ── 3. Statistics & Sequences ──────────────────────────────

const statsFormulas: DataStatsProblem[] = [
  {
    id: 'st01', category: 'Statistics & Sequences',
    display: '"sum of the first n positive integers"',
    question: 'Formula:',
    answer: 'n(n + 1) / 2',
    options: ['n(n + 1) / 2', 'n²', 'n(n − 1) / 2', '(n + 1)² / 2', 'n(n + 1)', '2n + 1'],
    hint: '1 + 2 + 3 + ... + n = n(n+1)/2. E.g. 1+2+...+10 = 10×11/2 = 55.',
    historyKey: 'wp:st:sum-integers',
  },
  {
    id: 'st02', category: 'Statistics & Sequences',
    display: '"sum of an arithmetic sequence"',
    question: 'Formula:',
    answer: 'count × (first + last) / 2',
    options: ['count × (first + last) / 2', 'count × first × last', '(first + last) / count', 'count × (last − first)', 'count × last / 2', '(first + last) × (last − first)'],
    hint: 'Sum = number of terms × average of first and last. Works for any arithmetic sequence.',
    historyKey: 'wp:st:arith-sum',
  },
  {
    id: 'st03', category: 'Statistics & Sequences',
    display: '"number of integers from a to b inclusive"',
    question: 'Count:',
    answer: 'b − a + 1',
    options: ['b − a + 1', 'b − a', 'b − a − 1', '(a + b) / 2', 'b + a − 1', '(b − a + 1) / 2'],
    hint: 'Inclusive count = b − a + 1. The +1 catches the fencepost! E.g. 3 to 7 = 7−3+1 = 5.',
    historyKey: 'wp:st:fencepost',
  },
  {
    id: 'st04', category: 'Statistics & Sequences',
    display: '"A set of n values has mean M. One value v₁ is replaced with v₂."',
    question: 'New mean:',
    answer: 'M + (v₂ − v₁) / n',
    options: ['M + (v₂ − v₁) / n', 'M + v₂ − v₁', '(M + v₂ − v₁) / n', 'M × v₂ / v₁', '(v₂ − v₁) / n', 'M − (v₂ − v₁) / n'],
    hint: 'Sum changes by (v₂ − v₁). New mean = old mean + change/n = M + (v₂ − v₁)/n.',
    historyKey: 'wp:st:swap-mean',
  },
  {
    id: 'st05', category: 'Statistics & Sequences',
    display: '"sum of the first n consecutive positive even integers"',
    question: 'Formula:',
    answer: 'n(n + 1)',
    options: ['n(n + 1)', 'n²', '2n(n + 1)', 'n(n + 1) / 2', 'n² + n', '2n²'],
    hint: '2 + 4 + 6 + ... + 2n = 2(1+2+...+n) = 2·n(n+1)/2 = n(n+1).',
    historyKey: 'wp:st:sum-evens',
  },
  {
    id: 'st06', category: 'Statistics & Sequences',
    display: '"weighted average of two groups"',
    question: 'The weighted avg is closer to which group\'s avg?',
    answer: 'The group with more observations',
    options: ['The group with more observations', 'The group with fewer observations', 'Always exactly in the middle', 'The group with the higher average', 'The group with the lower average', 'Neither — it depends on variance'],
    hint: 'Weighted average is pulled toward the larger group. 10 students avg 80 + 2 students avg 90 → much closer to 80.',
    historyKey: 'wp:st:weighted-avg',
  },
  {
    id: 'st07', category: 'Statistics & Sequences',
    display: '"add a constant k to every term in a data set"',
    question: 'Effect on standard deviation?',
    answer: 'SD stays the same',
    options: ['SD stays the same', 'SD increases by k', 'SD doubles', 'SD decreases by k', 'SD is multiplied by k', 'SD becomes 0'],
    hint: 'Adding a constant shifts all values equally — spread doesn\'t change, so SD is unchanged.',
    historyKey: 'wp:st:sd-add-const',
  },
  {
    id: 'st08', category: 'Statistics & Sequences',
    display: '"multiply every term in a data set by constant k"',
    question: 'Effect on standard deviation?',
    answer: 'SD is multiplied by |k|',
    options: ['SD is multiplied by |k|', 'SD stays the same', 'SD is multiplied by k²', 'SD increases by k', 'SD is divided by k', 'SD is multiplied by k'],
    hint: 'Multiplying scales the spread: new SD = |k| × old SD. E.g. double all values → SD doubles.',
    historyKey: 'wp:st:sd-mult-const',
  },
  {
    id: 'st09', category: 'Statistics & Sequences',
    display: '"percent change"',
    question: 'Formula:',
    answer: '(new − old) / old × 100',
    options: ['(new − old) / old × 100', '(new − old) / new × 100', '(old − new) / old × 100', 'new / old × 100', '(new + old) / 2 × 100', 'old / new × 100'],
    hint: 'TRAP: denominator is the ORIGINAL value, not the new one. % change = (new−old)/old × 100.',
    historyKey: 'wp:st:pct-change',
  },
  {
    id: 'st10', category: 'Statistics & Sequences',
    display: '"median of an even number of values"',
    question: 'How to find:',
    answer: 'Average of the two middle values',
    options: ['Average of the two middle values', 'The smaller middle value', 'The larger middle value', 'The mode', 'Sum / count', 'The most frequent value'],
    hint: 'Even count: median = average of the n/2th and (n/2+1)th values when sorted.',
    historyKey: 'wp:st:median-even',
  },
  {
    id: 'st11', category: 'Statistics & Sequences',
    display: '"range of a data set"',
    question: 'Formula:',
    answer: 'max − min',
    options: ['max − min', '(max + min) / 2', 'max + min', 'max / min', 'max × min', 'count × (max − min)'],
    hint: 'Range = highest value minus lowest value. Simple measure of spread.',
    historyKey: 'wp:st:range',
  },
  {
    id: 'st12', category: 'Statistics & Sequences',
    display: '"geometric sequence: first term a, common ratio r"',
    question: 'nth term:',
    answer: 'a × rⁿ⁻¹',
    options: ['a × rⁿ⁻¹', 'a + (n−1)r', 'a × rⁿ', 'a × n × r', 'a / rⁿ', 'a + nr'],
    hint: 'Geometric: multiply by r each time. Term 1 = a, term 2 = ar, term n = arⁿ⁻¹.',
    historyKey: 'wp:st:geometric-nth',
  },
  {
    id: 'st13', category: 'Statistics & Sequences',
    display: '"sum of a finite geometric series (r ≠ 1)"',
    question: 'Formula:',
    answer: 'a(1 − rⁿ) / (1 − r)',
    options: ['a(1 − rⁿ) / (1 − r)', 'a × rⁿ', 'n × a × r', 'a / (1 − r)', 'a(rⁿ − 1) / r', 'na(1 + r) / 2'],
    hint: 'Finite geometric sum = a(1−rⁿ)/(1−r). For |r|<1 and infinite: a/(1−r).',
    historyKey: 'wp:st:geometric-sum',
  },
  {
    id: 'st14', category: 'Statistics & Sequences',
    display: '"sum of squares of first n positive integers"',
    question: 'Formula:',
    answer: 'n(n+1)(2n+1) / 6',
    options: ['n(n+1)(2n+1) / 6', 'n(n+1) / 2', 'n²(n+1)² / 4', 'n(n+1)', 'n² / 2', '(2n+1)! / 6'],
    hint: '1² + 2² + ... + n² = n(n+1)(2n+1)/6. E.g. 1+4+9 = 14 = 3×4×7/6.',
    historyKey: 'wp:st:sum-squares',
  },
];

// ── Export all ──────────────────────────────────────────────

export const ALL_DATASTATS_PROBLEMS: DataStatsProblem[] = [
  ...overlapFormulas,
  ...countingFormulas,
  ...statsFormulas,
];

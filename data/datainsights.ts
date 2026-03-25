/**
 * Data Insights — GMAT drill bank.
 *
 * Two sub-categories:
 *  1. DS Logic (~15) — Data Sufficiency reasoning patterns
 *  2. Percentage Shortcuts (~10) — Quick mental math for percent problems
 */

export interface DataInsightsProblem {
  id: string;
  category: string;
  group: 'ds-logic' | 'pct-shortcuts';
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

export function shuffleDIOptions(p: DataInsightsProblem, avoidIdx?: number): DataInsightsProblem {
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

// ── 1. DS Logic ────────────────────────────────────────────

const dsLogic: DataInsightsProblem[] = [
  {
    id: 'di01', category: 'DS Logic', group: 'ds-logic',
    display: 'Statement 1 gives one value. Statement 2 gives two possible values.',
    question: 'What is the DS answer?',
    answer: 'A — Statement 1 alone is sufficient',
    options: ['A — Statement 1 alone is sufficient', 'B — Statement 2 alone is sufficient', 'C — Both together are sufficient', 'D — Each alone is sufficient', 'E — Neither is sufficient', 'Cannot determine'],
    hint: 'If S1 gives exactly one answer → S1 sufficient. S2 gives two → S2 not sufficient. Answer = A.',
    historyKey: 'di:ds:answer-a',
  },
  {
    id: 'di02', category: 'DS Logic', group: 'ds-logic',
    display: 'Statement 1 is not sufficient. Statement 2 gives a unique value.',
    question: 'What is the DS answer?',
    answer: 'B — Statement 2 alone is sufficient',
    options: ['B — Statement 2 alone is sufficient', 'A — Statement 1 alone is sufficient', 'C — Both together are sufficient', 'D — Each alone is sufficient', 'E — Neither is sufficient', 'Cannot determine'],
    hint: 'S1 fails, S2 works alone → B.',
    historyKey: 'di:ds:answer-b',
  },
  {
    id: 'di03', category: 'DS Logic', group: 'ds-logic',
    display: 'Neither statement alone is sufficient. Together they give a unique answer.',
    question: 'What is the DS answer?',
    answer: 'C — Both statements together are sufficient',
    options: ['C — Both statements together are sufficient', 'A — Statement 1 alone is sufficient', 'B — Statement 2 alone is sufficient', 'D — Each alone is sufficient', 'E — Neither is sufficient', 'Cannot determine'],
    hint: 'Each alone fails, but combined they work → C.',
    historyKey: 'di:ds:answer-c',
  },
  {
    id: 'di04', category: 'DS Logic', group: 'ds-logic',
    display: 'Statement 1 alone gives a unique answer. Statement 2 alone also gives a unique answer.',
    question: 'What is the DS answer?',
    answer: 'D — Each statement alone is sufficient',
    options: ['D — Each statement alone is sufficient', 'A — Statement 1 alone is sufficient', 'C — Both together are sufficient', 'E — Neither is sufficient', 'B — Statement 2 alone is sufficient', 'Cannot determine'],
    hint: 'Both statements independently sufficient → D.',
    historyKey: 'di:ds:answer-d',
  },
  {
    id: 'di05', category: 'DS Logic', group: 'ds-logic',
    display: 'Neither statement alone, nor both together, gives enough information.',
    question: 'What is the DS answer?',
    answer: 'E — Statements together are not sufficient',
    options: ['E — Statements together are not sufficient', 'C — Both together are sufficient', 'D — Each alone is sufficient', 'A — Statement 1 alone is sufficient', 'B — Statement 2 alone is sufficient', 'Cannot determine'],
    hint: 'Even combined, still multiple answers possible → E.',
    historyKey: 'di:ds:answer-e',
  },
  {
    id: 'di06', category: 'DS Logic', group: 'ds-logic',
    display: '"Is x positive?" S1: x² > 0. S2: x³ > 0.',
    question: 'What is the DS answer?',
    answer: 'B — Statement 2 alone is sufficient',
    options: ['B — Statement 2 alone is sufficient', 'A — Statement 1 alone is sufficient', 'C — Both together are sufficient', 'D — Each alone is sufficient', 'E — Neither is sufficient', 'Cannot determine'],
    hint: 'x² > 0 means x ≠ 0 but x could be negative. x³ > 0 ⟹ x > 0. → B.',
    historyKey: 'di:ds:sq-vs-cube',
  },
  {
    id: 'di07', category: 'DS Logic', group: 'ds-logic',
    display: '"What is x?" S1: x + y = 10. S2: x − y = 4.',
    question: 'What is the DS answer?',
    answer: 'C — Both statements together are sufficient',
    options: ['C — Both statements together are sufficient', 'A — Statement 1 alone is sufficient', 'D — Each alone is sufficient', 'E — Neither is sufficient', 'B — Statement 2 alone is sufficient', 'Cannot determine'],
    hint: 'One equation, two unknowns → not sufficient alone. Two equations → solve: x = 7, y = 3. → C.',
    historyKey: 'di:ds:two-eqns',
  },
  {
    id: 'di08', category: 'DS Logic', group: 'ds-logic',
    display: 'DS: Always test the "obvious" answer and the edge cases',
    question: 'What should you test when a statement says "x is an integer"?',
    answer: 'Positive, negative, and zero',
    options: ['Positive, negative, and zero', 'Only positive integers', 'Only 1 and 2', 'Only zero', 'Only negative integers', 'Only odd integers'],
    hint: '"Integer" includes 0, negative integers, and positive. Always check all three.',
    historyKey: 'di:ds:test-cases',
  },
  {
    id: 'di09', category: 'DS Logic', group: 'ds-logic',
    display: '"Is xy > 0?" S1: x > 0. S2: y > 0.',
    question: 'What is the DS answer?',
    answer: 'C — Both statements together are sufficient',
    options: ['C — Both statements together are sufficient', 'D — Each alone is sufficient', 'E — Neither is sufficient', 'A — Statement 1 alone is sufficient', 'B — Statement 2 alone is sufficient', 'Cannot determine'],
    hint: 'x > 0 alone: y unknown. y > 0 alone: x unknown. Both: x > 0 and y > 0 ⟹ xy > 0. → C.',
    historyKey: 'di:ds:product-sign',
  },
  {
    id: 'di10', category: 'DS Logic', group: 'ds-logic',
    display: '"What is the value of |x|?" S1: x² = 25.',
    question: 'Is Statement 1 sufficient?',
    answer: 'Yes — |x| = 5 regardless of sign',
    options: ['Yes — |x| = 5 regardless of sign', 'No — x could be 5 or −5', 'Yes — x must be 5', 'No — need more information', 'Depends on whether x is an integer', 'Cannot determine'],
    hint: 'x = 5 or −5, but |x| = 5 either way. The question asks for |x|, not x! Sufficient.',
    historyKey: 'di:ds:abs-value-trap',
  },
  {
    id: 'di11', category: 'DS Logic', group: 'ds-logic',
    display: 'DS question asks "Is x > y?"',
    question: 'What type of answer is needed?',
    answer: 'Definite Yes or definite No — not a numeric value',
    options: ['Definite Yes or definite No — not a numeric value', 'The exact value of x − y', 'The values of x and y', 'A range for x and y', 'A probability estimate', 'The ratio x/y'],
    hint: 'Yes/No DS: you need a definitive answer. "Sometimes yes, sometimes no" = not sufficient.',
    historyKey: 'di:ds:yes-no-type',
  },
  {
    id: 'di12', category: 'DS Logic', group: 'ds-logic',
    display: '"Is n divisible by 6?" S1: n is divisible by 2. S2: n is divisible by 3.',
    question: 'What is the DS answer?',
    answer: 'C — Both statements together are sufficient',
    options: ['C — Both statements together are sufficient', 'D — Each alone is sufficient', 'E — Neither is sufficient', 'A — Statement 1 alone is sufficient', 'B — Statement 2 alone is sufficient', 'Cannot determine'],
    hint: 'Div by 2 alone: n = 4 (no). Div by 3 alone: n = 9 (no). Both: 2 & 3 coprime, so div by 6. → C.',
    historyKey: 'di:ds:div-by-6',
  },
  {
    id: 'di13', category: 'DS Logic', group: 'ds-logic',
    display: 'In DS, you discover S1 is sufficient.',
    question: 'What should you do next?',
    answer: 'Test S2 alone (forget S1)',
    options: ['Test S2 alone (forget S1)', 'Select answer A immediately', 'Test S1 and S2 combined', 'Recheck S1 with different values', 'Move to the next question', 'Combine both and select C'],
    hint: 'DS process: after testing S1, test S2 independently. If S2 also works → D, not A.',
    historyKey: 'di:ds:process-after-s1',
  },
  {
    id: 'di14', category: 'DS Logic', group: 'ds-logic',
    display: '"What is the area of rectangle R?" S1: perimeter = 20. S2: diagonal = √52.',
    question: 'What is the DS answer?',
    answer: 'C — Both statements together are sufficient',
    options: ['C — Both statements together are sufficient', 'D — Each alone is sufficient', 'E — Neither is sufficient', 'A — Statement 1 alone is sufficient', 'B — Statement 2 alone is sufficient', 'Cannot determine'],
    hint: 'Perimeter alone: 2(l+w)=20 → l+w=10, many (l,w). Diagonal alone: l²+w²=52, many (l,w). Together: solve both to get unique l,w. → C.',
    historyKey: 'di:ds:rect-area',
  },
  {
    id: 'di15', category: 'DS Logic', group: 'ds-logic',
    display: 'In DS, the statements never contradict each other.',
    question: 'If S1 says x > 0 and S2 says x < 0, what happened?',
    answer: 'You made an error — re-examine both',
    options: ['You made an error — re-examine both', 'The answer is E', 'The answer is C', 'S1 and S2 are both insufficient', 'Pick the statement you trust more', 'The question is flawed'],
    hint: 'GMAT DS statements are always consistent. Contradictions mean you misinterpreted something.',
    historyKey: 'di:ds:no-contradiction',
  },
];

// ── 2. Percentage Shortcuts ────────────────────────────────

const pctShortcuts: DataInsightsProblem[] = [
  {
    id: 'di16', category: 'Percentage Shortcuts', group: 'pct-shortcuts',
    display: 'Find 15% of 80',
    question: 'Fastest mental approach:',
    answer: '10% + 5% = 8 + 4 = 12',
    options: ['10% + 5% = 8 + 4 = 12', '80 × 0.15 directly', '20% − 5% = 16 − 4 = 12', '15 × 8 / 10 = 12', '1% × 15 = 1.2 × 10 = 12', '80/15 rounded'],
    hint: 'Break into easy pieces: 10% of 80 = 8, half of that = 4. Sum = 12.',
    historyKey: 'di:pct:fifteen-pct',
  },
  {
    id: 'di17', category: 'Percentage Shortcuts', group: 'pct-shortcuts',
    display: 'X is what percent of Y?',
    question: 'Formula:',
    answer: '(X / Y) × 100',
    options: ['(X / Y) × 100', '(Y / X) × 100', 'X − Y', '(X × Y) / 100', '(Y − X) / Y × 100', 'X / (X + Y) × 100'],
    hint: '"is/of × 100": X IS what percent OF Y → (X/Y) × 100.',
    historyKey: 'di:pct:is-of',
  },
  {
    id: 'di18', category: 'Percentage Shortcuts', group: 'pct-shortcuts',
    display: 'Successive discounts of 20% and then 10%',
    question: 'Equivalent single discount:',
    answer: '28%',
    options: ['28%', '30%', '20%', '18%', '32%', '25%'],
    hint: 'Multiply: 0.80 × 0.90 = 0.72. So 72% remains → 28% discount.',
    historyKey: 'di:pct:successive-disc',
  },
  {
    id: 'di19', category: 'Percentage Shortcuts', group: 'pct-shortcuts',
    display: 'Price increases 25%, then decreases 20%',
    question: 'Net effect on price:',
    answer: 'No change (back to original)',
    options: ['No change (back to original)', '5% increase', '5% decrease', '45% increase', '10% increase', '1% decrease'],
    hint: '1.25 × 0.80 = 1.00. The 20% decrease offsets the 25% increase exactly.',
    historyKey: 'di:pct:up-down',
  },
  {
    id: 'di20', category: 'Percentage Shortcuts', group: 'pct-shortcuts',
    display: 'Profit margin = (Revenue − Cost) / Cost × 100',
    question: 'If cost = 80 and selling price = 100, profit margin is:',
    answer: '25%',
    options: ['25%', '20%', '80%', '125%', '100%', '12.5%'],
    hint: 'Profit = 100 − 80 = 20. Margin = 20/80 × 100 = 25%. Base is cost, not revenue.',
    historyKey: 'di:pct:margin',
  },
  {
    id: 'di21', category: 'Percentage Shortcuts', group: 'pct-shortcuts',
    display: 'To reverse a 20% increase:',
    question: 'What percent decrease returns to the original?',
    answer: '16.67% (1/6)',
    options: ['16.67% (1/6)', '20%', '25%', '15%', '10%', '80%'],
    hint: 'New = 1.2 × Old. Old = New / 1.2 = New × 5/6. Decrease = 1/6 ≈ 16.67%.',
    historyKey: 'di:pct:reverse-inc',
  },
  {
    id: 'di22', category: 'Percentage Shortcuts', group: 'pct-shortcuts',
    display: 'Compound growth: $1000 at 10% for 2 years',
    question: 'Final amount:',
    answer: '$1,210',
    options: ['$1,210', '$1,200', '$1,100', '$1,220', '$1,300', '$1,010'],
    hint: 'Year 1: 1000 × 1.1 = 1100. Year 2: 1100 × 1.1 = 1210. Or: 1000 × 1.1² = 1210.',
    historyKey: 'di:pct:compound',
  },
  {
    id: 'di23', category: 'Percentage Shortcuts', group: 'pct-shortcuts',
    display: '8% of 25 = ?',
    question: 'Use the swap trick:',
    answer: '2 (same as 25% of 8)',
    options: ['2 (same as 25% of 8)', '0.2', '20', '200', '0.32', '3.2'],
    hint: 'a% of b = b% of a. 8% of 25 = 25% of 8 = 2. Much easier!',
    historyKey: 'di:pct:swap',
  },
  {
    id: 'di24', category: 'Percentage Shortcuts', group: 'pct-shortcuts',
    display: 'A ratio changes from 3:5 to 2:5.',
    question: 'What is the percent decrease in the ratio?',
    answer: '33.3% decrease',
    options: ['33.3% decrease', '20% decrease', '40% decrease', '50% decrease', '25% decrease', '60% decrease'],
    hint: 'Ratio was 3/5 = 0.6, now 2/5 = 0.4. Change = (0.4 − 0.6)/0.6 = −1/3 ≈ −33.3%.',
    historyKey: 'di:pct:ratio-change',
  },
  {
    id: 'di25', category: 'Percentage Shortcuts', group: 'pct-shortcuts',
    display: 'Population doubles. What is the percent increase?',
    question: 'Answer:',
    answer: '100%',
    options: ['100%', '200%', '50%', '2%', '150%', '300%'],
    hint: 'Doubling means new = 2 × old. % increase = (2x − x)/x × 100 = 100%.',
    historyKey: 'di:pct:double',
  },
];

// ── Export all ──────────────────────────────────────────────

export const ALL_DI_PROBLEMS: DataInsightsProblem[] = [
  ...dsLogic,
  ...pctShortcuts,
];

export type DIGroup = 'ds-logic' | 'pct-shortcuts';

export const DI_GROUPS: Record<DIGroup, string> = {
  'ds-logic': 'DS Logic',
  'pct-shortcuts': 'Percentage Shortcuts',
};

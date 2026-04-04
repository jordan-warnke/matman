// ── Number Sense: Tap-to-Order + Percentage Estimation ──

export interface NSExpression {
  display: string; // e.g. "3/8", "√50", "15% of 80"
  value: number;   // actual numeric value
  reveal: string;  // shown after placed, e.g. "= 0.375"
}

export interface NSOrderProblem {
  type: 'order';
  sorted: NSExpression[];   // correct order (smallest → largest)
  shuffled: NSExpression[]; // randomised presentation
  category: string;
  historyKey: string;
}

export interface NSEstimateProblem {
  type: 'estimate';
  display: string;       // scenario text
  question: string;      // e.g. "Approximate % increase?"
  options: string[];     // 4 MC choices
  correctIndex: number;
  answer: string;        // e.g. "20%"
  category: string;
  historyKey: string;
}

export type NSProblem = NSOrderProblem | NSEstimateProblem;

// ── helpers ──────────────────────────────────────────────

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(lo: number, hi: number) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function round(n: number, dp = 4) { return Math.round(n * 10 ** dp) / 10 ** dp; }
function fmtVal(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(4);
  return s.replace(/0+$/, '').replace(/\.$/, '');
}

function allDistinct(exprs: NSExpression[]): boolean {
  const vals = exprs.map((e) => e.value);
  return new Set(vals).size === vals.length;
}

// ── category generators ─────────────────────────────────

function fractionComparison(): NSExpression[] {
  const denoms = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 16, 20];
  const exprs: NSExpression[] = [];
  while (exprs.length < 4) {
    const d = pick(denoms);
    const n = randInt(1, d - 1);
    const val = round(n / d);
    if (exprs.some((e) => e.value === val)) continue;
    exprs.push({ display: `${n}/${d}`, value: val, reveal: `= ${fmtVal(val)}` });
  }
  return exprs;
}

function fractionTimesInteger(): NSExpression[] {
  const fracs: [number, number][] = [[1,2],[1,3],[2,3],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,6],[5,6],[1,8],[3,8],[5,8],[7,8]];
  const ints = [6, 8, 10, 12, 15, 18, 20, 24, 30, 36];
  const exprs: NSExpression[] = [];
  const base = pick(ints);
  while (exprs.length < 4) {
    const [n, d] = pick(fracs);
    const val = round((n / d) * base);
    if (exprs.some((e) => e.value === val)) continue;
    exprs.push({ display: `${n}/${d} × ${base}`, value: val, reveal: `= ${fmtVal(val)}` });
  }
  return exprs;
}

function powersAndRoots(): NSExpression[] {
  const candidates: NSExpression[] = [];
  // squares
  for (let b = 2; b <= 12; b++) candidates.push({ display: `${b}²`, value: b * b, reveal: `= ${b * b}` });
  // cubes
  for (let b = 2; b <= 5; b++) candidates.push({ display: `${b}³`, value: b ** 3, reveal: `= ${b ** 3}` });
  // sqrt
  for (const v of [16, 25, 36, 49, 64, 81, 100, 121, 144]) {
    const r = round(Math.sqrt(v));
    candidates.push({ display: `√${v}`, value: r, reveal: `= ${fmtVal(r)}` });
  }
  // non-perfect sqrt
  for (const v of [2, 3, 5, 7, 10, 11, 13, 15, 20, 30, 50]) {
    const r = round(Math.sqrt(v));
    candidates.push({ display: `√${v}`, value: r, reveal: `≈ ${fmtVal(r)}` });
  }
  const pool = shuffle(candidates);
  const exprs: NSExpression[] = [];
  for (const c of pool) {
    if (exprs.some((e) => e.value === c.value)) continue;
    exprs.push(c);
    if (exprs.length === 4) break;
  }
  return exprs;
}

function percentOfValue(): NSExpression[] {
  // GMAT-style: different percents × different bases — forces real estimation
  const combos: [number, number][] = [];
  const percents = [3, 5, 6, 8, 10, 12, 15, 18, 20, 25, 30, 33, 40, 45, 60, 75];
  const bases = [7, 9, 11, 13, 15, 18, 22, 24, 30, 35, 40, 48, 60, 75, 80, 90, 120, 150, 200];
  // generate a pool of combos with close-ish values
  for (let i = 0; i < 60; i++) {
    combos.push([pick(percents), pick(bases)]);
  }
  // pick 4 with distinct values
  const pool = shuffle(combos);
  const exprs: NSExpression[] = [];
  for (const [p, b] of pool) {
    const val = round((p / 100) * b);
    if (val === 0 || exprs.some((e) => e.value === val)) continue;
    exprs.push({ display: `${p}% of ${b}`, value: val, reveal: `= ${fmtVal(val)}` });
    if (exprs.length === 4) break;
  }
  return exprs;
}

function mixedOperations(): NSExpression[] {
  const ops: (() => NSExpression)[] = [
    () => { const n = randInt(1, 7); const d = pick([2,3,4,5,8]); const v = round(n / d); return { display: `${n}/${d}`, value: v, reveal: `= ${fmtVal(v)}` }; },
    () => { const b = randInt(2, 9); return { display: `${b}²`, value: b * b, reveal: `= ${b * b}` }; },
    () => { const v = pick([4, 9, 16, 25, 36, 49, 64]); const r = Math.sqrt(v); return { display: `√${v}`, value: r, reveal: `= ${fmtVal(r)}` }; },
    () => { const p = pick([5, 8, 10, 15, 20, 25, 33, 40, 50, 75]); const base = pick([9, 12, 15, 18, 24, 30, 40, 60, 80, 120]); const v = round((p / 100) * base); return { display: `${p}% of ${base}`, value: v, reveal: `= ${fmtVal(v)}` }; },
    () => { const a = randInt(2, 15); const b = randInt(2, 15); return { display: `${a} × ${b}`, value: a * b, reveal: `= ${a * b}` }; },
  ];
  const pool = shuffle(ops);
  const exprs: NSExpression[] = [];
  for (const gen of [...pool, ...pool]) {
    const e = gen();
    if (exprs.some((x) => x.value === e.value)) continue;
    exprs.push(e);
    if (exprs.length === 4) break;
  }
  return exprs;
}

function closeCalls(): NSExpression[] {
  const groups: (() => NSExpression[])[] = [
    // close fractions
    () => {
      const pairs: [string, number][] = [['1/3', 1/3], ['3/10', 0.3], ['5/16', 5/16], ['2/7', 2/7]];
      return pairs.map(([d, v]) => ({ display: d, value: round(v), reveal: `= ${fmtVal(round(v))}` }));
    },
    // near-square values
    () => {
      return [
        { display: '√48', value: round(Math.sqrt(48)), reveal: `≈ ${fmtVal(round(Math.sqrt(48)))}` },
        { display: '√50', value: round(Math.sqrt(50)), reveal: `≈ ${fmtVal(round(Math.sqrt(50)))}` },
        { display: '7', value: 7, reveal: '= 7' },
        { display: '√52', value: round(Math.sqrt(52)), reveal: `≈ ${fmtVal(round(Math.sqrt(52)))}` },
      ];
    },
    // percents vs fractions
    () => {
      return [
        { display: '1/3', value: round(1/3), reveal: `= ${fmtVal(round(1/3))}` },
        { display: '30%', value: 0.3, reveal: '= 0.3' },
        { display: '5/16', value: round(5/16), reveal: `= ${fmtVal(round(5/16))}` },
        { display: '0.34', value: 0.34, reveal: '= 0.34' },
      ];
    },
    // close powers
    () => {
      return [
        { display: '2⁵', value: 32, reveal: '= 32' },
        { display: '3³', value: 27, reveal: '= 27' },
        { display: '√900', value: 30, reveal: '= 30' },
        { display: '6²/√16', value: 9, reveal: '= 9' },
      ];
    },
  ];
  return pick(groups)();
}

function divisionComparison(): NSExpression[] {
  const divisors = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
  const exprs: NSExpression[] = [];
  const d = pick(divisors);
  while (exprs.length < 4) {
    const n = randInt(d + 1, d * 15);
    const val = round(n / d);
    if (exprs.some((e) => e.value === val)) continue;
    exprs.push({ display: `${n} ÷ ${d}`, value: val, reveal: `= ${fmtVal(val)}` });
  }
  return exprs;
}

function compoundExpressions(): NSExpression[] {
  const templates: (() => NSExpression)[] = [
    () => { const a = randInt(2, 8); const b = randInt(2, 8); const v = a * a + b; return { display: `${a}² + ${b}`, value: v, reveal: `= ${v}` }; },
    () => { const a = randInt(2, 6); const b = randInt(1, 4); const v = a * a - b; return { display: `${a}² − ${b}`, value: v, reveal: `= ${v}` }; },
    () => { const a = randInt(2, 5); const b = randInt(2, 5); const v = round(a + 1 / b); return { display: `${a} + 1/${b}`, value: v, reveal: `= ${fmtVal(v)}` }; },
    () => { const a = randInt(2, 10); const b = pick([2, 3, 4, 5]); const v = a * b; return { display: `${a} × ${b}`, value: v, reveal: `= ${v}` }; },
    () => { const b = randInt(2, 7); const v = b * b; return { display: `${b}²`, value: v, reveal: `= ${v}` }; },
  ];
  const pool = shuffle(templates);
  const exprs: NSExpression[] = [];
  for (const gen of [...pool, ...pool]) {
    const e = gen();
    if (exprs.some((x) => x.value === e.value)) continue;
    exprs.push(e);
    if (exprs.length === 4) break;
  }
  return exprs;
}

function algebraicSubstitution(): NSExpression[] {
  const x = pick([2, 3, 4, 5, 6, 7, 8]);

  // expression templates: [display using "x", evaluator]
  const templates: [string, (x: number) => number][] = [
    [`x²`,         (v) => v * v],
    [`x³`,         (v) => v * v * v],
    [`2x`,         (v) => 2 * v],
    [`3x`,         (v) => 3 * v],
    [`5x`,         (v) => 5 * v],
    [`x² + x`,     (v) => v * v + v],
    [`x² − x`,     (v) => v * v - v],
    [`2x²`,        (v) => 2 * v * v],
    [`x² + 2x`,    (v) => v * v + 2 * v],
    [`x² − 2x`,    (v) => v * v - 2 * v],
    [`x(x+1)`,     (v) => v * (v + 1)],
    [`x(x−1)`,     (v) => v * (v - 1)],
    [`(x+1)²`,     (v) => (v + 1) * (v + 1)],
    [`(x−1)²`,     (v) => (v - 1) * (v - 1)],
    [`x² / 2`,     (v) => v * v / 2],
    [`10x`,        (v) => 10 * v],
    [`x² + 1`,     (v) => v * v + 1],
    [`3x + 2`,     (v) => 3 * v + 2],
    [`4x − 1`,     (v) => 4 * v - 1],
    [`x³ / x`,     (v) => v * v], // simplifies to x² but display is different
  ];

  const pool = shuffle(templates);
  const exprs: NSExpression[] = [];
  for (const [display, fn] of pool) {
    const val = round(fn(x));
    if (val <= 0 || exprs.some((e) => e.value === val)) continue;
    exprs.push({
      display,
      value: val,
      reveal: `= ${fmtVal(val)}`,
    });
    if (exprs.length === 4) break;
  }
  // Tag each display with " (x=${x})" so it's clear — but put x value in category instead
  // Store x so we can show it in the category label
  (exprs as any).__xVal = x;
  return exprs;
}

// ── weighted category picker ────────────────────────────

interface Category {
  name: string;
  weight: number;
  gen: () => NSExpression[];
}

const CATEGORIES: Category[] = [
  { name: 'Fraction Comparison', weight: 1.5, gen: fractionComparison },
  { name: 'Fraction × Integer',  weight: 1.2, gen: fractionTimesInteger },
  { name: 'Powers & Roots',      weight: 1.3, gen: powersAndRoots },
  { name: 'Percent of Value',    weight: 1.0, gen: percentOfValue },
  { name: 'Mixed Operations',    weight: 1.5, gen: mixedOperations },
  { name: 'Close Calls',         weight: 1.8, gen: closeCalls },
  { name: 'Division Comparison', weight: 1.0, gen: divisionComparison },
  { name: 'Compound Expressions',weight: 1.0, gen: compoundExpressions },
  { name: 'Algebraic Substitution', weight: 1.4, gen: algebraicSubstitution },
];

let lastCategory = '';

// ── Percentage Estimation ───────────────────────────────

function makeEstimateOptions(correct: number): { options: string[]; correctIndex: number } {
  const offsets = shuffle([
    -Math.max(3, Math.round(correct * 0.4)),
    -Math.max(2, Math.round(correct * 0.2)),
    Math.max(2, Math.round(correct * 0.2)),
    Math.max(3, Math.round(correct * 0.4)),
    -5, 5, -3, 3, -8, 8, -10, 10, -2, 2,
  ]);
  const pool: number[] = [];
  for (const off of offsets) {
    const v = correct + off;
    if (v > 0 && v !== correct && !pool.includes(v)) {
      pool.push(v);
      if (pool.length === 3) break;
    }
  }
  let d = 1;
  while (pool.length < 3) {
    for (const s of [1, -1]) {
      const v = correct + d * s;
      if (v > 0 && v !== correct && !pool.includes(v)) { pool.push(v); if (pool.length === 3) break; }
    }
    d++;
  }
  const all = [correct, ...pool].sort((a, b) => a - b);
  return { options: all.map((v) => `${v}%`), correctIndex: all.indexOf(correct) };
}

function generateEstimateProblem(): NSEstimateProblem {
  type Template = () => { display: string; question: string; correct: number };

  const templates: Template[] = [
    // % increase
    () => {
      const base = pick([40, 50, 60, 75, 80, 90, 100, 120, 150, 200, 250, 300]);
      const pct = pick([5, 8, 10, 12, 15, 18, 20, 25, 30, 40, 50]);
      const after = Math.round(base * (1 + pct / 100));
      const ctx = pick([
        `Revenue grew from $${base}M to $${after}M.`,
        `Stock price rose from $${base} to $${after}.`,
        `Users increased from ${base}K to ${after}K.`,
      ]);
      return { display: ctx, question: 'Approximate % increase?', correct: pct };
    },
    // % decrease
    () => {
      const base = pick([60, 80, 100, 120, 150, 200, 250, 300, 400]);
      const pct = pick([5, 8, 10, 12, 15, 20, 25, 30]);
      const after = Math.round(base * (1 - pct / 100));
      const ctx = pick([
        `Costs fell from $${base}K to $${after}K.`,
        `Headcount reduced from ${base} to ${after}.`,
        `Inventory dropped from ${base} to ${after} units.`,
      ]);
      return { display: ctx, question: 'Approximate % decrease?', correct: pct };
    },
    // markup
    () => {
      const cost = pick([30, 40, 50, 60, 75, 80, 100, 120, 150, 200]);
      const pct = pick([10, 15, 20, 25, 30, 40, 50, 60, 75]);
      const price = Math.round(cost * (1 + pct / 100));
      return { display: `Product costs $${cost}, sells for $${price}.`, question: 'Approximate markup %?', correct: pct };
    },
    // discount
    () => {
      const orig = pick([25, 30, 40, 50, 60, 75, 80, 100, 120, 150, 200]);
      const pct = pick([10, 15, 20, 25, 30, 33, 40, 50]);
      const sale = Math.round(orig * (1 - pct / 100));
      return { display: `Item was $${orig}, now $${sale}.`, question: 'Approximate discount %?', correct: pct };
    },
    // share of total
    () => {
      const total = pick([200, 250, 300, 400, 500, 600, 800, 1000]);
      const pct = pick([8, 10, 12, 15, 20, 25, 30, 33, 40]);
      const part = Math.round(total * pct / 100);
      return { display: `Department spends $${part}K of $${total}K total.`, question: 'What % of total?', correct: pct };
    },
    // QoQ growth
    () => {
      const q1 = pick([50, 60, 70, 80, 90, 100, 120, 150, 200]);
      const pct = pick([5, 8, 10, 12, 15, 20, 25, 30, 40, 50]);
      const q2 = Math.round(q1 * (1 + pct / 100));
      return { display: `Q1: $${q1}M revenue. Q2: $${q2}M.`, question: 'Approximate QoQ growth?', correct: pct };
    },
    // tip
    () => {
      const bill = pick([25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120]);
      const pct = pick([10, 12, 15, 18, 20, 22, 25]);
      const tip = Math.round(bill * pct / 100);
      return { display: `Bill: $${bill}. Tip left: $${tip}.`, question: 'What tip %?', correct: pct };
    },
    // compound change
    () => {
      const up = pick([10, 15, 20, 25, 30, 40, 50]);
      const down = pick([5, 10, 15, 20]);
      const net = Math.round(((1 + up / 100) * (1 - down / 100) - 1) * 100);
      return {
        display: `Price rises ${up}%, then falls ${down}%.`,
        question: net > 0 ? 'Approximate net % gain?' : 'Approximate net % loss?',
        correct: Math.abs(net) || 1,
      };
    },
  ];

  for (let attempt = 0; attempt < 30; attempt++) {
    const { display, question, correct } = pick(templates)();
    if (correct <= 0 || correct > 100) continue;
    const { options, correctIndex } = makeEstimateOptions(correct);
    const key = `ns:pct-est:${display.replace(/[^a-zA-Z0-9]/g, '').substring(0, 40)}`;
    return { type: 'estimate', display, question, options, correctIndex, answer: `${correct}%`, category: 'Pct Estimation', historyKey: key };
  }

  return {
    type: 'estimate', display: 'Revenue grew from $100M to $120M.', question: 'Approximate % increase?',
    options: ['10%', '15%', '20%', '25%'], correctIndex: 2, answer: '20%',
    category: 'Pct Estimation', historyKey: 'ns:pct-est:fallback',
  };
}

export function generateNSProblem(): NSProblem {
  // ~25% chance of percentage estimation
  if (Math.random() < 0.25) {
    return generateEstimateProblem();
  }

  const totalWeight = CATEGORIES.reduce((s, c) => s + c.weight, 0);

  for (let attempt = 0; attempt < 20; attempt++) {
    let r = Math.random() * totalWeight;
    let cat = CATEGORIES[0];
    for (const c of CATEGORIES) {
      r -= c.weight;
      if (r <= 0) { cat = c; break; }
    }
    // avoid repeating same category twice in a row
    if (cat.name === lastCategory && attempt < 15) continue;

    const exprs = cat.gen();
    if (exprs.length < 4 || !allDistinct(exprs)) continue;

    const sorted = [...exprs].sort((a, b) => a.value - b.value);
    const shuffled = shuffle(sorted);

    // make sure shuffled isn't already in order
    const alreadySorted = shuffled.every((e, i) => e.value === sorted[i].value);
    if (alreadySorted) continue;

    lastCategory = cat.name;
    const key = `ns:${cat.name.toLowerCase().replace(/\s+/g, '-')}:${sorted.map((e) => e.display).join(',')}`;

    // For algebraic substitution, include x value in category label
    const xVal = (exprs as any).__xVal;
    const categoryLabel = xVal != null ? `x = ${xVal}` : cat.name;

    return { type: 'order' as const, sorted, shuffled, category: categoryLabel, historyKey: key };
  }

  // fallback — guaranteed to work
  const exprs: NSExpression[] = [
    { display: '1/4', value: 0.25, reveal: '= 0.25' },
    { display: '1/3', value: round(1/3), reveal: '≈ 0.3333' },
    { display: '1/2', value: 0.5, reveal: '= 0.5' },
    { display: '3/4', value: 0.75, reveal: '= 0.75' },
  ];
  const sorted = [...exprs];
  lastCategory = 'Fraction Comparison';
  return { type: 'order' as const, sorted, shuffled: shuffle(sorted), category: 'Fraction Comparison', historyKey: 'ns:fraction-comparison:fallback' };
}

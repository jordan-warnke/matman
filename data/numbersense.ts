// ── Number Sense: Tap-to-Order problems ──────────────────

export interface NSExpression {
  display: string; // e.g. "3/8", "√50", "15% of 80"
  value: number;   // actual numeric value
  reveal: string;  // shown after placed, e.g. "= 0.375"
}

export interface NSProblem {
  sorted: NSExpression[];   // correct order (smallest → largest)
  shuffled: NSExpression[]; // randomised presentation
  category: string;
  historyKey: string;
}

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
  const percents = [5, 10, 15, 20, 25, 30, 33, 40, 50, 60, 75, 80, 90];
  const bases = [40, 50, 60, 80, 100, 120, 150, 200, 250, 300];
  const exprs: NSExpression[] = [];
  const base = pick(bases);
  while (exprs.length < 4) {
    const p = pick(percents);
    const val = round((p / 100) * base);
    if (exprs.some((e) => e.value === val)) continue;
    exprs.push({ display: `${p}% of ${base}`, value: val, reveal: `= ${fmtVal(val)}` });
  }
  return exprs;
}

function mixedOperations(): NSExpression[] {
  const ops: (() => NSExpression)[] = [
    () => { const n = randInt(1, 7); const d = pick([2,3,4,5,8]); const v = round(n / d); return { display: `${n}/${d}`, value: v, reveal: `= ${fmtVal(v)}` }; },
    () => { const b = randInt(2, 9); return { display: `${b}²`, value: b * b, reveal: `= ${b * b}` }; },
    () => { const v = pick([4, 9, 16, 25, 36, 49, 64]); const r = Math.sqrt(v); return { display: `√${v}`, value: r, reveal: `= ${fmtVal(r)}` }; },
    () => { const p = pick([10, 20, 25, 50, 75]); const base = pick([40, 60, 80, 100, 200]); const v = round((p / 100) * base); return { display: `${p}% of ${base}`, value: v, reveal: `= ${fmtVal(v)}` }; },
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
];

let lastCategory = '';

export function generateNSProblem(): NSProblem {
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

    return { sorted, shuffled, category: cat.name, historyKey: key };
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
  return { sorted, shuffled: shuffle(sorted), category: 'Fraction Comparison', historyKey: 'ns:fraction-comparison:fallback' };
}

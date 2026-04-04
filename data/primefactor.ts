// ── Prime Factorization drill data ─────────────────────────

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function sup(n: number): string {
  return String(n).split('').map(d => SUP[parseInt(d)]).join('');
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

function primeFactorize(n: number): [number, number][] {
  const factors: [number, number][] = [];
  let rem = n;
  for (let p = 2; p * p <= rem; p++) {
    let count = 0;
    while (rem % p === 0) { rem /= p; count++; }
    if (count > 0) factors.push([p, count]);
  }
  if (rem > 1) factors.push([rem, 1]);
  return factors;
}

function formatFactorization(factors: [number, number][]): string {
  return factors
    .map(([p, e]) => (e === 1 ? `${p}` : `${p}${sup(e)}`))
    .join(' × ');
}

function categorize(factors: [number, number][]): string {
  const numPrimes = factors.length;
  if (numPrimes === 1) {
    return `Power of ${factors[0][0]}`;
  }
  const isSquare = factors.every((f) => f[1] % 2 === 0);
  const isCube = factors.every((f) => f[1] % 3 === 0) && factors.some((f) => f[1] >= 3);
  if (isCube) return 'Perfect Cube';
  if (isSquare) return 'Perfect Square';
  if (numPrimes >= 3) return 'Three+ Primes';
  const maxExp = Math.max(...factors.map((f) => f[1]));
  if (maxExp >= 3) return 'High Powers';
  return 'Two Primes';
}

function makeDivisionHint(n: number, factors: [number, number][]): string {
  const steps: string[] = [];
  let current = n;
  for (const [prime, exp] of factors) {
    for (let i = 0; i < exp; i++) {
      current /= prime;
      steps.push(`÷ ${prime} = ${current}`);
    }
  }
  return `${n} ${steps.join(' → ')}`;
}

// ── distractor generation ──────────────────────────────────

function generateDistractors(correct: [number, number][]): string[] {
  const correctStr = formatFactorization(correct);
  const pool = new Set<string>();

  // Shift one exponent by ±1
  for (let i = 0; i < correct.length; i++) {
    const [p, e] = correct[i];
    for (const delta of [-1, 1]) {
      const ne = e + delta;
      if (ne <= 0) continue;
      const mod = correct.map((f, j) =>
        j === i ? ([p, ne] as [number, number]) : ([...f] as [number, number]),
      );
      const s = formatFactorization(mod);
      if (s !== correctStr) pool.add(s);
    }
  }

  // Shift one exponent by ±2
  for (let i = 0; i < correct.length; i++) {
    const [p, e] = correct[i];
    for (const delta of [-2, 2]) {
      const ne = e + delta;
      if (ne <= 0) continue;
      const mod = correct.map((f, j) =>
        j === i ? ([p, ne] as [number, number]) : ([...f] as [number, number]),
      );
      const s = formatFactorization(mod);
      if (s !== correctStr) pool.add(s);
    }
  }

  // Swap exponents between two factors
  if (correct.length >= 2) {
    for (let i = 0; i < correct.length; i++) {
      for (let j = i + 1; j < correct.length; j++) {
        if (correct[i][1] !== correct[j][1]) {
          const mod = correct.map((f) => [...f] as [number, number]);
          [mod[i][1], mod[j][1]] = [mod[j][1], mod[i][1]];
          const s = formatFactorization(mod);
          if (s !== correctStr) pool.add(s);
        }
      }
    }
  }

  // Replace one prime with a neighbor
  const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23];
  for (let i = 0; i < correct.length; i++) {
    const [p, e] = correct[i];
    const pidx = PRIMES.indexOf(p);
    if (pidx < 0) continue;
    const neighbors: number[] = [];
    if (pidx > 0) neighbors.push(PRIMES[pidx - 1]);
    if (pidx < PRIMES.length - 1) neighbors.push(PRIMES[pidx + 1]);
    for (const np of neighbors) {
      if (correct.some((f) => f[0] === np)) continue;
      const mod = correct.map((f, j) =>
        j === i ? ([np, e] as [number, number]) : ([...f] as [number, number]),
      );
      mod.sort((a, b) => a[0] - b[0]);
      const s = formatFactorization(mod);
      if (s !== correctStr) pool.add(s);
    }
  }

  // Add extra small prime factor
  for (const ep of [2, 3, 5, 7]) {
    if (correct.some((f) => f[0] === ep)) continue;
    const mod = [...correct.map((f) => [...f] as [number, number]), [ep, 1] as [number, number]];
    mod.sort((a, b) => a[0] - b[0]);
    const s = formatFactorization(mod);
    if (s !== correctStr) pool.add(s);
  }

  // Remove one factor (if 2+ factors)
  if (correct.length >= 2) {
    for (let i = 0; i < correct.length; i++) {
      const mod = correct.filter((_, j) => j !== i).map((f) => [...f] as [number, number]);
      const s = formatFactorization(mod);
      if (s !== correctStr) pool.add(s);
    }
  }

  const arr = shuffle([...pool]);
  if (arr.length >= 3) return arr.slice(0, 3);

  // Fallback: tweak random exponents
  while (arr.length < 3) {
    const fakeFactors = correct.map(([p, e]) => {
      const ne = Math.max(1, e + (Math.random() > 0.5 ? 1 : -1));
      return [p, ne] as [number, number];
    });
    const s = formatFactorization(fakeFactors);
    if (s !== correctStr && !arr.includes(s)) arr.push(s);
  }
  return arr.slice(0, 3);
}

// ── problem generation ─────────────────────────────────────

export interface PFProblem {
  number: number;
  factorization: [number, number][];
  answer: string;
  options: string[];
  hint: string;
  category: string;
  historyKey: string;
}

// GMAT-favorite composites — rich factoring structure, frequently tested
const MUST_KNOW: number[] = [
  // Perfect squares
  16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225, 256, 289, 324, 400, 441, 484,
  // Perfect cubes
  27, 125, 216, 343,
  // Highly composite (many small prime factors)
  24, 48, 60, 72, 84, 90, 96, 108, 120, 132, 150, 168, 180, 192, 210, 240, 252, 270,
  288, 300, 315, 336, 360, 378, 396, 420, 432, 450, 480, 500,
  // Notable powers
  128, 243, 512, 625,
];

function pickComposite(minN: number, maxN: number): number {
  // 40 % chance to draw from GMAT must-know list (if in range)
  const eligible = MUST_KNOW.filter((n) => n >= minN && n <= maxN);
  if (eligible.length > 0 && Math.random() < 0.4) {
    return eligible[Math.floor(Math.random() * eligible.length)];
  }
  for (let attempt = 0; attempt < 200; attempt++) {
    const n = minN + Math.floor(Math.random() * (maxN - minN + 1));
    if (!isPrime(n) && n >= 4) return n;
  }
  return 12;
}

export function generatePFProblem(maxN: number = 200): PFProblem {
  const n = pickComposite(12, maxN);
  const factors = primeFactorize(n);
  const answer = formatFactorization(factors);
  const distractors = generateDistractors(factors);
  const options = shuffle([answer, ...distractors]);
  const hint = makeDivisionHint(n, factors);
  const category = categorize(factors);

  return {
    number: n,
    factorization: factors,
    answer,
    options,
    hint,
    category,
    historyKey: `pf:${n}`,
  };
}

export function regeneratePFOptions(problem: PFProblem): PFProblem {
  const distractors = generateDistractors(problem.factorization);
  const options = shuffle([problem.answer, ...distractors]);
  return { ...problem, options };
}

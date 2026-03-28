// Odd composites commonly mistaken for primes on GMAT
export const TRAP_NUMBERS = [
  51, 57, 87, 91, 111, 119, 133, 161,           // original set
  169, 171, 183, 201, 207, 213, 217, 219, 221,  // mid-range
  247, 253, 259, 267, 289, 291, 299,             // upper
  301, 303, 309, 323, 329, 341, 343, 351, 361,   // 300s
  371, 377, 391, 399,
];

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

export function primeFactors(n: number): number[] {
  const factors: number[] = [];
  let val = n;
  let d = 2;
  while (d * d <= val) {
    while (val % d === 0) {
      factors.push(d);
      val /= d;
    }
    d++;
  }
  if (val > 1) factors.push(val);
  return factors;
}

export function formatFactorization(n: number): string {
  const factors = primeFactors(n);
  return `${n} = ${factors.join(' × ')}`;
}

export const TRAP_NUMBERS = [51, 57, 87, 91, 111, 119, 133, 161];

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

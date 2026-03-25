/**
 * Units Digit Cyclicity — drill bank.
 *
 * Two problem types:
 *  1. Concrete: "2⁷ ends in?" → 8
 *  2. Pattern recall: "Cycle of 3ⁿ?" → 3, 9, 7, 1
 */

export interface CyclicityProblem {
  id: string;
  display: string;
  question: string;
  answer: string;
  options: string[];
  historyKey: string;
}

interface CycleInfo {
  base: number;
  cycle: number[];
}

const CYCLES: CycleInfo[] = [
  { base: 2, cycle: [2, 4, 8, 6] },
  { base: 3, cycle: [3, 9, 7, 1] },
  { base: 4, cycle: [4, 6] },
  { base: 5, cycle: [5] },
  { base: 6, cycle: [6] },
  { base: 7, cycle: [7, 9, 3, 1] },
  { base: 8, cycle: [8, 4, 2, 6] },
  { base: 9, cycle: [9, 1] },
];

// Bases with interesting (length > 1) cycles for concrete problems
const INTERESTING_BASES = CYCLES.filter((c) => c.cycle.length > 1);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Superscript digits for display */
const SUPER: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
};

function toSuperscript(n: number): string {
  return String(n).split('').map((d) => SUPER[d] ?? d).join('');
}

function unitsDigit(base: number, exp: number): number {
  const info = CYCLES.find((c) => c.base === base);
  if (!info) return base % 10;
  return info.cycle[(exp - 1) % info.cycle.length];
}

function formatCycleStr(cycle: number[]): string {
  return cycle.join(', ');
}

/** Generate a concrete problem: "2⁷ ends in?" → 8 */
function generateConcrete(info: CycleInfo): CyclicityProblem {
  const exp = Math.floor(Math.random() * 48) + 2; // 2–49
  const answer = unitsDigit(info.base, exp);
  const answerStr = String(answer);

  // Distractors: other digits from same cycle + random wrong digits
  const distractors = new Set<string>();
  for (const d of info.cycle) {
    if (d !== answer) distractors.add(String(d));
  }
  // Add more from 0-9 if needed
  const allDigits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(String);
  for (const d of shuffle(allDigits)) {
    if (d !== answerStr && !distractors.has(d)) distractors.add(d);
    if (distractors.size >= 3) break;
  }

  const wrongOptions = shuffle([...distractors]).slice(0, 3);
  const options = shuffle([answerStr, ...wrongOptions]);

  return {
    id: `cyc-c-${info.base}-${exp}`,
    display: `${info.base}${toSuperscript(exp)}`,
    question: 'Units digit?',
    answer: answerStr,
    options,
    historyKey: `cyc:concrete:${info.base}`,
  };
}

/** Generate a pattern recall problem: "Cycle of 3ⁿ?" → 3, 9, 7, 1 */
function generatePattern(info: CycleInfo): CyclicityProblem {
  const answerStr = formatCycleStr(info.cycle);

  // Build distractors from other bases' cycles
  const otherCycles = CYCLES.filter((c) => c.base !== info.base && c.cycle.length > 1);
  const distractors = new Set<string>();

  // Shuffled version of the correct cycle
  if (info.cycle.length > 1) {
    const reversed = [...info.cycle].reverse();
    const reversedStr = formatCycleStr(reversed);
    if (reversedStr !== answerStr) distractors.add(reversedStr);

    // Rotate by 1
    const rotated = [...info.cycle.slice(1), info.cycle[0]];
    const rotatedStr = formatCycleStr(rotated);
    if (rotatedStr !== answerStr) distractors.add(rotatedStr);
  }

  // Other base cycles
  for (const other of shuffle(otherCycles)) {
    const s = formatCycleStr(other.cycle);
    if (s !== answerStr) distractors.add(s);
    if (distractors.size >= 3) break;
  }

  const wrongOptions = shuffle([...distractors]).slice(0, 3);
  const options = shuffle([answerStr, ...wrongOptions]);

  return {
    id: `cyc-p-${info.base}`,
    display: `${info.base}ⁿ`,
    question: 'Units digit cycle?',
    answer: answerStr,
    options,
    historyKey: `cyc:pattern:${info.base}`,
  };
}

/** Shuffle options for repeat, biasing answer away from previous slot */
export function shuffleOptions(p: CyclicityProblem, avoidIdx?: number): CyclicityProblem {
  const wrong = p.options.filter((o) => o !== p.answer);
  const all = [p.answer, ...wrong];
  if (avoidIdx !== undefined && avoidIdx >= 0) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const s = shuffle(all);
      if (s.indexOf(p.answer) !== avoidIdx) return { ...p, options: s };
    }
  }
  return { ...p, options: shuffle(all) };
}

/**
 * Generate a random cyclicity problem.
 * Mix: ~70% concrete (with interesting bases), ~30% pattern recall.
 */
export function generateCyclicityProblem(minBase = 2, maxBase = 9): CyclicityProblem {
  const filteredCycles = CYCLES.filter((c) => c.base >= minBase && c.base <= maxBase);
  const filteredInteresting = filteredCycles.filter((c) => c.cycle.length > 1);
  const pool = filteredInteresting.length > 0 ? filteredInteresting : filteredCycles;

  const isConcrete = Math.random() < 0.7 && filteredInteresting.length > 0;

  if (isConcrete) {
    const info = pool[Math.floor(Math.random() * pool.length)];
    return generateConcrete(info);
  }

  // Pattern recall — all bases in range including trivial (5, 6)
  const recallPool = filteredCycles.length > 0 ? filteredCycles : CYCLES;
  const info = recallPool[Math.floor(Math.random() * recallPool.length)];
  return generatePattern(info);
}

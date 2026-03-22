/**
 * Sign & Parity Matrix.
 *
 * Two sub-modes:
 *  A. Parity — evaluate expression like "Odd + (Even × Odd)" → Odd or Even
 *  B. Sign  — evaluate expression like "Neg × Pos × Neg"    → Pos or Neg
 */

// ── types ──────────────────────────────────────────────────

export type Parity = 'Odd' | 'Even';
export type Sign = 'Pos' | 'Neg';
export type ParitySignMode = 'parity' | 'sign';

export interface ParityProblem {
  display: string;
  answer: Parity;
  historyKey: string;
}

export interface SignProblem {
  display: string;
  answer: Sign;
  historyKey: string;
}

// ── parity logic ───────────────────────────────────────────

type ParityOp = '+' | '-' | '×';
const PARITY_OPS: ParityOp[] = ['+', '-', '×'];

function evalParity(a: Parity, op: ParityOp, b: Parity): Parity {
  if (op === '×') {
    // Even if either is even
    return a === 'Even' || b === 'Even' ? 'Even' : 'Odd';
  }
  // + or -: same parity → Even, different → Odd
  return a === b ? 'Even' : 'Odd';
}

function randomParity(): Parity {
  return Math.random() < 0.5 ? 'Odd' : 'Even';
}

function randomParityOp(): ParityOp {
  return PARITY_OPS[Math.floor(Math.random() * PARITY_OPS.length)];
}

/**
 * Generate a parity expression with 2–4 terms.
 * Sometimes adds parentheses for sub-expressions to test order of operations.
 */
export function generateParityProblem(): ParityProblem {
  const termCount = 2 + Math.floor(Math.random() * 3); // 2, 3, or 4

  if (termCount === 2) {
    const a = randomParity();
    const b = randomParity();
    const op = randomParityOp();
    return {
      display: `${a} ${op} ${b}`,
      answer: evalParity(a, op, b),
      historyKey: `par:${a}:${op}:${b}`,
    };
  }

  if (termCount === 3) {
    const a = randomParity();
    const b = randomParity();
    const c = randomParity();
    const op1 = randomParityOp();
    const op2 = randomParityOp();

    // 50% chance of parenthesizing the last two terms
    if (Math.random() < 0.5) {
      const inner = evalParity(b, op2, c);
      const answer = evalParity(a, op1, inner);
      return {
        display: `${a} ${op1} (${b} ${op2} ${c})`,
        answer,
        historyKey: `par:${a}:${op1}:p:${b}:${op2}:${c}`,
      };
    } else {
      // Left-to-right
      const left = evalParity(a, op1, b);
      const answer = evalParity(left, op2, c);
      return {
        display: `${a} ${op1} ${b} ${op2} ${c}`,
        answer,
        historyKey: `par:${a}:${op1}:${b}:${op2}:${c}`,
      };
    }
  }

  // 4 terms: (A op B) op (C op D)
  const a = randomParity();
  const b = randomParity();
  const c = randomParity();
  const d = randomParity();
  const op1 = randomParityOp();
  const op2 = randomParityOp();
  const op3 = randomParityOp();
  const left = evalParity(a, op1, b);
  const right = evalParity(c, op3, d);
  const answer = evalParity(left, op2, right);
  return {
    display: `(${a} ${op1} ${b}) ${op2} (${c} ${op3} ${d})`,
    answer,
    historyKey: `par:${a}:${op1}:${b}:${op2}:${c}:${op3}:${d}`,
  };
}

// ── sign logic ─────────────────────────────────────────────

type SignOp = '×' | '÷';

function evalSign(a: Sign, b: Sign): Sign {
  // × and ÷ have the same sign rule
  return a === b ? 'Pos' : 'Neg';
}

function randomSign(): Sign {
  return Math.random() < 0.5 ? 'Pos' : 'Neg';
}

function randomSignOp(): SignOp {
  return Math.random() < 0.5 ? '×' : '÷';
}

/**
 * Generate a sign expression with 2–5 factors.
 * Uses × and ÷ (which have the same sign rule).
 * Occasionally adds exponents: x² (keeps sign), x³ (preserves sign).
 */
export function generateSignProblem(): SignProblem {
  const termCount = 2 + Math.floor(Math.random() * 4); // 2–5

  const terms: Sign[] = [];
  const ops: SignOp[] = [];
  for (let i = 0; i < termCount; i++) {
    terms.push(randomSign());
    if (i < termCount - 1) ops.push(randomSignOp());
  }

  // Optionally add an exponent to one term
  const expIdx = Math.random() < 0.4 ? Math.floor(Math.random() * termCount) : -1;
  const expPow = Math.random() < 0.5 ? 2 : 3;

  // Build display and compute answer
  let display = '';
  let result: Sign = terms[0];
  const effectiveTerms = terms.map((t, i) => {
    if (i === expIdx) {
      // x² → Pos always; x³ → same as x
      return expPow === 2 ? 'Pos' as Sign : t;
    }
    return t;
  });

  result = effectiveTerms[0];
  for (let i = 1; i < termCount; i++) {
    result = evalSign(result, effectiveTerms[i]);
  }

  // Build display string
  const parts: string[] = terms.map((t, i) => {
    let s = t;
    let label = s as string;
    if (i === expIdx) {
      label += expPow === 2 ? '²' : '³';
    }
    return label;
  });

  display = parts.join(` ${ops[0] || '×'} `);
  // Use actual alternating ops
  display = parts[0];
  for (let i = 1; i < parts.length; i++) {
    display += ` ${ops[i - 1]} ${parts[i]}`;
  }

  const keyParts = terms.map((t, i) => {
    let k = t;
    if (i === expIdx) k += (expPow === 2 ? '2' : '3') as string;
    return k;
  });

  return {
    display,
    answer: result,
    historyKey: `sign:${keyParts.join(':')}`,
  };
}

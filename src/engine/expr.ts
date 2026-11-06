/** Expression tree with variables resolved to indices (0 = first variable). */
export type Expr =
  | { kind: 'var'; index: number }
  | { kind: 'const'; value: 0 | 1 }
  | { kind: 'not'; arg: Expr }
  | { kind: 'and' | 'or' | 'xor'; args: Expr[] };

/** Truth table of an expression over n variables: result[m] is 0 or 1. */
export function evaluateAll(expr: Expr, n: number): (0 | 1)[] {
  const out: (0 | 1)[] = [];
  for (let m = 0; m < 1 << n; m++) out.push(evaluate(expr, n, m) ? 1 : 0);
  return out;
}

export function evaluate(expr: Expr, n: number, m: number): boolean {
  switch (expr.kind) {
    case 'var':
      return ((m >> (n - 1 - expr.index)) & 1) === 1;
    case 'const':
      return expr.value === 1;
    case 'not':
      return !evaluate(expr.arg, n, m);
    case 'and':
      return expr.args.every((a) => evaluate(a, n, m));
    case 'or':
      return expr.args.some((a) => evaluate(a, n, m));
    case 'xor':
      return expr.args.reduce((acc, a) => acc !== evaluate(a, n, m), false);
  }
}

/** Highest variable index used, or -1. */
export function maxVarIndex(expr: Expr): number {
  switch (expr.kind) {
    case 'var':
      return expr.index;
    case 'const':
      return -1;
    case 'not':
      return maxVarIndex(expr.arg);
    default:
      return Math.max(-1, ...expr.args.map(maxVarIndex));
  }
}

/** Print with explicit operators and full parentheses (used for round-trip tests). */
export function exprToText(expr: Expr, names: string[]): string {
  switch (expr.kind) {
    case 'var':
      return names[expr.index]!;
    case 'const':
      return String(expr.value);
    case 'not':
      return `(${exprToText(expr.arg, names)})'`;
    case 'and':
      return `(${expr.args.map((a) => exprToText(a, names)).join(' * ')})`;
    case 'or':
      return `(${expr.args.map((a) => exprToText(a, names)).join(' + ')})`;
    case 'xor':
      return `(${expr.args.map((a) => exprToText(a, names)).join(' ^ ')})`;
  }
}

export interface Literal {
  index: number;
  negated: boolean;
}

function asLiteral(e: Expr): Literal | null {
  if (e.kind === 'var') return { index: e.index, negated: false };
  if (e.kind === 'not' && e.arg.kind === 'var') return { index: e.arg.index, negated: true };
  if (e.kind === 'not' && e.arg.kind === 'not') return asLiteral(e.arg.arg);
  return null;
}

/** Flatten nested nodes of the same kind: and(a, and(b, c)) -> and(a, b, c). */
function flatten(e: Expr, kind: 'and' | 'or'): Expr[] {
  if (e.kind === kind) return e.args.flatMap((a) => flatten(a, kind));
  return [e];
}

/**
 * If the expression is a sum of products of literals, return its terms; otherwise null.
 * A constant 0 is an empty sum; a constant 1 is one empty product.
 */
export function asSumOfProducts(e: Expr): Literal[][] | null {
  if (e.kind === 'const') return e.value === 0 ? [] : [[]];
  const terms: Literal[][] = [];
  for (const t of flatten(e, 'or')) {
    const lits: Literal[] = [];
    for (const f of flatten(t, 'and')) {
      const l = asLiteral(f);
      if (!l) return null;
      lits.push(l);
    }
    terms.push(lits);
  }
  return terms;
}

/** If the expression is a product of sums of literals, return its factors; otherwise null. */
export function asProductOfSums(e: Expr): Literal[][] | null {
  if (e.kind === 'const') return e.value === 1 ? [] : [[]];
  const factors: Literal[][] = [];
  for (const f of flatten(e, 'and')) {
    const lits: Literal[] = [];
    for (const t of flatten(f, 'or')) {
      const l = asLiteral(t);
      if (!l) return null;
      lits.push(l);
    }
    factors.push(lits);
  }
  return factors;
}

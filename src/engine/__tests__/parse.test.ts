import { describe, expect, it } from 'vitest';
import { evaluateAll, exprToText, type Expr } from '../expr';
import { parseExpression } from '../parse';
import { rng } from './helpers';

const ABCD = ['A', 'B', 'C', 'D'];

function table(text: string, names = ABCD): string {
  const r = parseExpression(text, names);
  if (!r.ok) throw new Error(`${text}: ${r.error.message}`);
  return evaluateAll(r.expr, names.length).join('');
}

function errorOf(text: string, names?: string[]) {
  const r = parseExpression(text, names);
  if (r.ok) throw new Error(`expected an error for ${text}`);
  return r.error;
}

describe('parseExpression: notation', () => {
  it('treats every NOT spelling the same', () => {
    const want = table("A'");
    for (const s of ['A’', '~A', '!A', '¬A', 'NOT A', 'not A', "(A)'"]) expect(table(s)).toBe(want);
  });

  it('treats every AND spelling the same', () => {
    const want = table('AB');
    for (const s of ['A*B', 'A·B', 'A&B', 'A∧B', 'A.B', 'A AND B', 'A and B', 'A B', '(A)(B)']) {
      expect(table(s)).toBe(want);
    }
  });

  it('treats every OR spelling the same', () => {
    const want = table('A+B');
    for (const s of ['A|B', 'A∨B', 'A OR B', 'A or B']) expect(table(s)).toBe(want);
  });

  it('supports XOR', () => {
    expect(table('A^B', ['A', 'B'])).toBe('0110');
    expect(table('A⊕B', ['A', 'B'])).toBe('0110');
    expect(table('A XOR B', ['A', 'B'])).toBe('0110');
  });

  it('applies precedence NOT > AND > XOR > OR', () => {
    expect(table("A + BC'", ['A', 'B', 'C'])).toBe(table("A + (B(C'))", ['A', 'B', 'C']));
    expect(table('A ^ BC', ['A', 'B', 'C'])).toBe(table('A ^ (BC)', ['A', 'B', 'C']));
    expect(table('A + B ^ C', ['A', 'B', 'C'])).toBe(table('A + (B ^ C)', ['A', 'B', 'C']));
  });

  it('complements groups and stacks primes', () => {
    expect(table("(A+B)'", ['A', 'B'])).toBe('1000');
    expect(table("A''", ['A', 'B'])).toBe(table('A', ['A', 'B']));
  });

  it('handles constants', () => {
    expect(table('1', ['A', 'B'])).toBe('1111');
    expect(table('0', ['A', 'B'])).toBe('0000');
    expect(table('A + 1', ['A', 'B'])).toBe('1111');
  });

  it('is case-insensitive against the given names', () => {
    expect(table("a'b + c", ['A', 'B', 'C'])).toBe(table("A'B + C", ['A', 'B', 'C']));
  });

  it('reads letter+digits as one variable', () => {
    const r = parseExpression("x1x2' + x3");
    expect(r.ok && r.names).toEqual(['x1', 'x2', 'x3']);
  });

  it('does not treat letters inside a run as word operators', () => {
    // "BAND" is B·A·N·D, not B AND
    const r = parseExpression('BAND');
    expect(r.ok && r.names).toEqual(['A', 'B', 'D', 'N']);
  });

  it('infers variables in natural order when no names are given', () => {
    const r = parseExpression("z + x'y + w");
    expect(r.ok && r.names).toEqual(['w', 'x', 'y', 'z']);
    const r2 = parseExpression('x10 + x2');
    expect(r2.ok && r2.names).toEqual(['x2', 'x10']);
  });
});

describe('parseExpression: errors point at the problem', () => {
  it('empty input', () => {
    expect(errorOf('   ').message).toMatch(/Type an expression/);
  });

  it('dangling operator', () => {
    const e = errorOf('A +');
    expect(e.message).toMatch(/ends too early/);
    expect(e.start).toBe(3);
  });

  it('unclosed parenthesis', () => {
    const e = errorOf('(A + B');
    expect(e.message).toMatch(/Missing "\)"/);
    expect([e.start, e.end]).toEqual([0, 1]);
  });

  it('stray closing parenthesis', () => {
    const e = errorOf('A + B)');
    expect(e.message).toMatch(/without a matching/);
    expect(e.start).toBe(5);
  });

  it('empty parentheses', () => {
    expect(errorOf('A()').message).toMatch(/Empty parentheses/);
  });

  it('bad character', () => {
    const e = errorOf('A $ B');
    expect(e.message).toMatch(/Unexpected character "\$"/);
    expect(e.start).toBe(2);
  });

  it('numbers other than 0 and 1', () => {
    expect(errorOf('A + 2').message).toMatch(/Only the constants 0 and 1/);
  });

  it('unknown variable when names are given', () => {
    const e = errorOf('A + E', ABCD);
    expect(e.message).toMatch(/"E" isn't one of this function's variables/);
    expect([e.start, e.end]).toEqual([4, 5]);
  });

  it('too many variables', () => {
    expect(errorOf('ABCDEFG').message).toMatch(/maximum is 6/);
  });

  it('two operators in a row', () => {
    expect(errorOf('A + * B').message).toMatch(/Expected a variable/);
  });
});

describe('parseExpression: round trip', () => {
  function randomExpr(rand: () => number, n: number, depth: number): Expr {
    const r = rand();
    if (depth === 0 || r < 0.3) {
      return rand() < 0.05 ? { kind: 'const', value: rand() < 0.5 ? 0 : 1 } : { kind: 'var', index: Math.floor(rand() * n) };
    }
    if (r < 0.45) return { kind: 'not', arg: randomExpr(rand, n, depth - 1) };
    const kind = r < 0.7 ? 'and' : r < 0.9 ? 'or' : 'xor';
    const count = 2 + Math.floor(rand() * 3);
    return { kind, args: Array.from({ length: count }, () => randomExpr(rand, n, depth - 1)) };
  }

  it('2,000 random expressions print and parse back to the same truth table', () => {
    const rand = rng(7);
    const names = ['A', 'B', 'C', 'D', 'E'];
    for (let i = 0; i < 2_000; i++) {
      const e = randomExpr(rand, 5, 4);
      const text = exprToText(e, names);
      const back = parseExpression(text, names);
      if (!back.ok) throw new Error(`${text}: ${back.error.message}`);
      expect(evaluateAll(back.expr, 5)).toEqual(evaluateAll(e, 5));
    }
  });
});

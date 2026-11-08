import { describe, expect, it } from 'vitest';
import { detectInputKind, parseFunctionInput } from '../input';
import { fromMinterms } from './helpers';

const ABCD = ['A', 'B', 'C', 'D'];
const parse = (text: string, mode: 'auto' | 'expression' | 'minterms' | 'maxterms' = 'auto', n = 4, names = ABCD) =>
  parseFunctionInput(text, mode, n, names);

function ok(text: string, mode?: Parameters<typeof parse>[1], n?: number, names?: string[]) {
  const r = parse(text, mode, n, names);
  if (!r.ok) throw new Error(`${text}: ${r.error.message}`);
  return r;
}

function err(text: string, mode?: Parameters<typeof parse>[1], n?: number, names?: string[]) {
  const r = parse(text, mode, n, names);
  if (r.ok) throw new Error(`expected an error for ${text}`);
  return r.error;
}

describe('detectInputKind', () => {
  it.each([
    ["A'B + C", 'expression'],
    ['Σm(1, 3)', 'minterms'],
    ['∑ m(1,3)', 'minterms'],
    ['sum(1,3)', 'minterms'],
    ['m(1, 3) + d(0)', 'minterms'],
    ['ΠM(0, 4) · d(2)', 'maxterms'],
    ['∏(0,4)', 'maxterms'],
    ['M(0, 4)', 'maxterms'],
    ['1, 3, 5-7', 'minterms'],
    ['M(A + B)', 'expression'],
    ['m(a)', 'expression'],
    ['1 + A', 'expression'],
  ])('%s is %s', (text, kind) => {
    expect(detectInputKind(text)).toBe(kind);
  });
});

describe('parseFunctionInput: lists', () => {
  it('reads Σm with don\'t-cares in every common spelling', () => {
    const want = fromMinterms(4, [1, 3, 7, 11, 15], [0, 2, 5]).values;
    for (const t of [
      'Σm(1,3,7,11,15) + d(0,2,5)',
      '∑m(1, 3, 7, 11, 15) + d(0, 2, 5)',
      'm(1 3 7 11 15) d(0 2 5)',
      'm(1,3,7,11,15), d(0,2,5)',
      'sum(1,3,7,11,15) + dc(0,2,5)',
      '1, 3, 7, 11, 15 + d(0, 2, 5)',
    ]) {
      expect(ok(t).fn.values, t).toEqual(want);
    }
  });

  it('reads ΠM lists as the 0s', () => {
    const r = ok('ΠM(0, 4) · d(2)', 'auto', 3, ['A', 'B', 'C']);
    expect(r.kind).toBe('maxterms');
    expect(r.fn.values).toEqual([0, 1, 'x', 1, 0, 1, 1, 1]);
  });

  it('treats bare numbers as maxterms when that type is chosen', () => {
    expect(ok('0, 4', 'maxterms', 3, ['A', 'B', 'C']).fn.values).toEqual([0, 1, 1, 1, 0, 1, 1, 1]);
  });

  it('adds variables when a number needs them, keeping the existing names', () => {
    const r = ok('Σm(0, 20)', 'auto', 4, ['w', 'x', 'y', 'z']);
    expect(r.fn.n).toBe(5);
    expect(r.names).toEqual(['w', 'x', 'y', 'z', 'A']);
  });

  it('never shrinks the variable count', () => {
    expect(ok('m(1)', 'auto', 4).fn.n).toBe(4);
  });

  it('accepts an empty list', () => {
    expect(ok('Σm()').fn.values.every((v) => v === 0)).toBe(true);
  });

  it('rejects numbers above 63', () => {
    expect(err('m(1, 64)').message).toMatch(/64 is out of range/);
  });

  it('rejects a number that is both a term and a don\'t-care', () => {
    expect(err('m(1, 2) + d(2)').message).toMatch(/2 is listed both/);
  });

  it('points at a missing parenthesis', () => {
    const e = err('Σm(1, 3');
    expect(e.message).toMatch(/Missing "\)"/);
    expect(e.start).toBe(2);
  });

  it('points at text after the list', () => {
    const e = err('m(1, 3) + x');
    expect(e.message).toMatch(/Unexpected/);
    expect(e.start).toBe(10);
  });

  it('points at a bad number inside the list', () => {
    const e = err('m(1, a, 3)', 'minterms');
    expect(e.message).toMatch(/"a" isn't a number/);
    expect([e.start, e.end]).toEqual([2, 9]);
  });

  it('refuses a list whose symbol contradicts the chosen type', () => {
    expect(err('ΠM(0, 1)', 'minterms').message).toMatch(/maxterm list/);
    expect(err('Σm(0, 1)', 'maxterms').message).toMatch(/minterm list/);
  });
});

describe('parseFunctionInput: expressions', () => {
  it('keeps the current variables when the expression only uses them', () => {
    const r = ok("A'C");
    expect(r.kind).toBe('expression');
    expect(r.names).toEqual(ABCD);
    expect(r.fn.n).toBe(4);
  });

  it('adopts the expression\'s own variables otherwise', () => {
    const r = ok("w'x + yz");
    expect(r.names).toEqual(['w', 'x', 'y', 'z']);
  });

  it('needs at least two variables', () => {
    expect(err("q'", 'auto').message).toMatch(/at least 2 variables/);
  });

  it('reads constants over the current variables', () => {
    expect(ok('1', 'expression').fn.values.every((v) => v === 1)).toBe(true);
  });

  it('passes parser errors through with positions', () => {
    const e = err('A + (B');
    expect(e.message).toMatch(/Missing "\)"/);
    expect(e.start).toBe(4);
  });

  it('asks for input when empty', () => {
    expect(err('   ').message).toMatch(/Type a function/);
  });
});

import { describe, expect, it } from 'vitest';
import { decodeState, defaultState, encodeState, namesFor, resizeFunction, validateNames } from '../state';

describe('app state', () => {
  it('round-trips through the URL', () => {
    const s = { ...defaultState(), names: ['w', 'x', 'y', 'z'], form: 'pos' as const, solution: 1 };
    expect(decodeState('#' + encodeState(s))).toEqual(s);
  });

  it('keeps the 3-variable layout', () => {
    const s = { ...defaultState(), fn: resizeFunction(defaultState().fn, 3), names: ['A', 'B', 'C'], layout3: 'tall' as const };
    expect(decodeState(encodeState(s))!.layout3).toBe('tall');
  });

  it('rejects broken links', () => {
    expect(decodeState('')).toBeNull();
    expect(decodeState('n=7&f=0')).toBeNull();
    expect(decodeState('n=2&f=012x')).toBeNull();
    expect(decodeState('n=2&f=01x')).toBeNull();
    expect(decodeState('n=2&f=01x1&v=A,A')).toBeNull();
    expect(decodeState('n=2&f=01x1&v=AB,C')).toBeNull();
  });

  it('keeps minterm values when resizing', () => {
    const fn = { n: 2, values: [1, 'x', 0, 1] as (0 | 1 | 'x')[] };
    expect(resizeFunction(fn, 3).values).toEqual([1, 'x', 0, 1, 0, 0, 0, 0]);
    expect(resizeFunction(resizeFunction(fn, 3), 2)).toEqual(fn);
  });

  it('keeps custom names and fills new ones without clashes', () => {
    expect(namesFor(['w', 'x', 'y', 'z'], 2)).toEqual(['w', 'x']);
    expect(namesFor(['B', 'A'], 4)).toEqual(['B', 'A', 'C', 'D']);
  });

  it('validates names', () => {
    expect(validateNames(['A', 'x1'])).toBeNull();
    expect(validateNames(['A', 'a'])).toMatch(/both named/);
    expect(validateNames(['AB', 'C'])).toMatch(/isn't a valid name/);
    expect(validateNames(['', 'C'])).toMatch(/needs a name/);
  });
});

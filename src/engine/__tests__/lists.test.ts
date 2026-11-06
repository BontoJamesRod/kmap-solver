import { describe, expect, it } from 'vitest';
import { functionFromLists, parseNumberList } from '../lists';

describe('parseNumberList', () => {
  it('accepts commas, spaces, ranges, and duplicates', () => {
    expect(parseNumberList('5, 0 2-4,2', 16)).toEqual({ ok: true, values: [0, 2, 3, 4, 5] });
  });
  it('accepts pasted wrappers', () => {
    expect(parseNumberList('Σm(1, 3, 5)', 8)).toEqual({ ok: true, values: [1, 3, 5] });
    expect(parseNumberList('d(2,6)', 8)).toEqual({ ok: true, values: [2, 6] });
    expect(parseNumberList('ΠM(0,4)', 8)).toEqual({ ok: true, values: [0, 4] });
    expect(parseNumberList('m(7)', 8)).toEqual({ ok: true, values: [7] });
  });
  it('treats an empty list as no numbers', () => {
    expect(parseNumberList('  ', 8)).toEqual({ ok: true, values: [] });
  });
  it('rejects out-of-range numbers with the valid range', () => {
    const r = parseNumberList('1, 16', 16);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/16 is out of range.*0 to 15/);
    expect(parseNumberList('3-9', 8).ok).toBe(false);
  });
  it('rejects backwards ranges and junk', () => {
    expect(!parseNumberList('5-2', 8).ok && (parseNumberList('5-2', 8) as { error: string }).error).toMatch(/backwards/);
    expect(parseNumberList('1, a', 8).ok).toBe(false);
  });
});

describe('functionFromLists', () => {
  it('builds from minterms', () => {
    const r = functionFromLists(2, 'minterms', [0, 3], [1]);
    expect(r.ok && r.fn.values).toEqual([1, 'x', 0, 1]);
  });
  it('builds from maxterms', () => {
    const r = functionFromLists(2, 'maxterms', [0, 3], [1]);
    expect(r.ok && r.fn.values).toEqual([0, 'x', 1, 0]);
  });
  it('rejects a number listed twice', () => {
    const r = functionFromLists(3, 'minterms', [1, 2], [2, 5]);
    expect(!r.ok && r.error).toMatch(/2 is listed both as a minterm and as a don't-care/);
  });
});

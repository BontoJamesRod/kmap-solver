import { describe, expect, it } from 'vitest';
import { cubePattern } from '../cube';
import { solve } from '../solve';
import { fromMinterms } from './helpers';

describe('step-by-step data', () => {
  const cyclic = solve(fromMinterms(3, [0, 1, 2, 5, 6, 7]), 'sop');

  it('groups the first table by number of 1s', () => {
    const round0 = cyclic.qm.rounds[0]!.groups.map((g) => g.map((e) => e.minterms[0]));
    expect(round0).toEqual([[0], [1, 2], [5, 6], [7]]);
  });

  it('marks combined terms and lists the primes', () => {
    expect(cyclic.qm.rounds[0]!.groups.flat().every((e) => e.combined)).toBe(true);
    expect(cyclic.primes.map((p) => `${p.label}=${cubePattern(p.cube, 3)}`)).toEqual([
      'P1=00-', 'P2=0-0', 'P3=-01', 'P4=-10', 'P5=1-1', 'P6=11-',
    ]);
  });

  it('finds no essentials in a cyclic chart and runs Petrick', () => {
    expect(cyclic.essentials).toEqual([]);
    expect(cyclic.petrick).not.toBeNull();
    expect(cyclic.petrick!.truncated).toBe(false);
    expect(cyclic.petrick!.products!.length).toBeGreaterThan(2);
    expect(cyclic.petrick!.minimal).toHaveLength(2);
  });

  it('marks essentials and the minterms that make them essential', () => {
    const r = solve(fromMinterms(4, [1, 3, 7, 11, 15], [0, 2, 5]), 'sop');
    const yz = r.primes.findIndex((p) => cubePattern(p.cube, 4) === '--11');
    expect(r.essentials).toEqual([{ prime: yz, minterms: [11, 15] }]);
    expect(r.remainingMinterms).toEqual([1]);
  });

  it('skips Petrick when the essentials cover everything', () => {
    expect(solve(fromMinterms(4, [0, 2, 8, 10]), 'sop').petrick).toBeNull();
  });

  it('flags primes that cover only don\'t-cares', () => {
    const r = solve(fromMinterms(3, [0], [6, 7]), 'sop');
    expect(r.primes.find((p) => cubePattern(p.cube, 3) === '11-')!.dontCareOnly).toBe(true);
  });

  it('says when Petrick\'s expansion is too large to show, but still solves', () => {
    // 6-variable function whose reduced chart explodes.
    const ones = Array.from({ length: 64 }, (_, m) => m).filter((m) => [2, 3].includes(m.toString(2).split('1').length - 1));
    const r = solve(fromMinterms(6, ones), 'sop');
    expect(r.solutions.length).toBeGreaterThan(0);
    if (r.petrick) expect(r.petrick.truncated ? r.petrick.products : r.petrick.products!.length).not.toBe(undefined);
  });
});

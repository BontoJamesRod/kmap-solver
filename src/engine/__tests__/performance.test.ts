import { describe, expect, it } from 'vitest';
import { solve } from '../solve';
import type { BoolFunction } from '../types';
import { fromMinterms, randomFunction, rng } from './helpers';

const weight = (m: number) => m.toString(2).split('1').length - 1;
const all64 = Array.from({ length: 64 }, (_, m) => m);

function timeBoth(fn: BoolFunction): number {
  const t0 = performance.now();
  const results = [solve(fn, 'sop'), solve(fn, 'pos')];
  const ms = performance.now() - t0;
  for (const r of results) expect(r.proven).toBe(true);
  return ms;
}

describe('performance (NFR-2: under 0.5 s)', () => {
  const hard: [string, BoolFunction][] = [
    ['6-variable parity', fromMinterms(6, all64.filter((m) => weight(m) % 2 === 1))],
    ['weight 2 or 3', fromMinterms(6, all64.filter((m) => weight(m) === 2 || weight(m) === 3))],
    ['weight 1, 2, 4 or 5', fromMinterms(6, all64.filter((m) => [1, 2, 4, 5].includes(weight(m))))],
    ['weight 3 with don\'t-cares at 2 and 4', fromMinterms(6, all64.filter((m) => weight(m) === 3), all64.filter((m) => weight(m) === 2 || weight(m) === 4))],
  ];

  it.each(hard)('%s', (_, fn) => {
    expect(timeBoth(fn)).toBeLessThan(500);
  });

  it('300 random 6-variable functions, slowest under 0.5 s', () => {
    const rand = rng(66);
    let worst = 0;
    for (let i = 0; i < 300; i++) worst = Math.max(worst, timeBoth(randomFunction(6, rand, 0.4 * rand(), 0.2 + 0.6 * rand())));
    expect(worst).toBeLessThan(500);
  });
});

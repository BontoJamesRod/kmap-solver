/**
 * Exhaustive verification (NFR-1). If this fails, the engine is wrong: fix the engine,
 * never this test (CLAUDE.md rule 4).
 */
import { describe, expect, it } from 'vitest';
import { solve, type SolveResult } from '../solve';
import type { BoolFunction } from '../types';
import { assertSound, functionFromIndex, randomFunction, rng } from './helpers';
import { stepProblems } from './steps-verify';

const sorted = (xs: number[]) => xs.slice().sort((a, b) => a - b);

/** Branch-and-bound answers must equal Petrick's method answers whenever Petrick ran in full. */
function assertAlgorithmsAgree(result: SolveResult): void {
  if (!result.petrick || result.petrick.truncated || result.solutionsTruncated) return;
  const essentials = result.essentials.map((e) => e.prime);
  const fromPetrick = result.petrick.minimal.map((m) => sorted([...essentials, ...m]).join(',')).sort();
  const fromSearch = result.solutions.map((s) => sorted(s).join(',')).sort();
  expect(fromSearch).toEqual(fromPetrick);
}

function checkAll(fn: BoolFunction, steps = false): void {
  for (const form of ['sop', 'pos'] as const) {
    const r = solve(fn, form);
    assertSound(fn, r);
    assertAlgorithmsAgree(r);
    if (steps) {
      const problems = stepProblems(fn, r);
      if (problems.length) throw new Error(`${form} ${JSON.stringify(fn.values)}: ${problems.join('; ')}`);
    }
  }
}

describe('exhaustive verification', () => {
  it('every function of 2 variables, with and without don\'t-cares (81)', () => {
    for (let i = 0; i < 3 ** 4; i++) checkAll(functionFromIndex(2, i, 3), true);
  });

  it('every function of 3 variables, with and without don\'t-cares (6,561)', () => {
    for (let i = 0; i < 3 ** 8; i++) checkAll(functionFromIndex(3, i, 3), true);
  });

  it('every function of 4 variables without don\'t-cares (65,536)', () => {
    for (let i = 0; i < 2 ** 16; i++) checkAll(functionFromIndex(4, i, 2));
  });

  it('20,000 random 4-variable functions with don\'t-cares', () => {
    const rand = rng(4);
    for (let i = 0; i < 20_000; i++) checkAll(randomFunction(4, rand, 0.2 + 0.3 * rand()), i < 3_000);
  });

  it('3,000 random 5-variable functions', () => {
    const rand = rng(5);
    for (let i = 0; i < 3_000; i++) checkAll(randomFunction(5, rand, 0.25 * rand(), 0.2 + 0.6 * rand()));
  });

  it('500 random 6-variable functions', () => {
    const rand = rng(6);
    for (let i = 0; i < 500; i++) checkAll(randomFunction(6, rand, 0.25 * rand(), 0.2 + 0.6 * rand()));
  });
});

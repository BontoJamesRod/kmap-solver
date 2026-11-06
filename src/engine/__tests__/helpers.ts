import { coversMinterm, coverCost } from '../cube';
import { solutionCubes, solve, type SolveResult } from '../solve';
import type { BoolFunction, CellValue, Cube, Form } from '../types';

/** Small deterministic PRNG so random tests are reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomFunction(n: number, rand: () => number, pDc = 0.15, pOne = 0.45): BoolFunction {
  const values: CellValue[] = [];
  for (let m = 0; m < 1 << n; m++) {
    const r = rand();
    values.push(r < pDc ? 'x' : r < pDc + pOne ? 1 : 0);
  }
  return { n, values };
}

/** Function from a base-3 index: digit 0 -> 0, 1 -> 1, 2 -> x. */
export function functionFromIndex(n: number, index: number, base: 2 | 3): BoolFunction {
  const values: CellValue[] = [];
  let k = index;
  for (let m = 0; m < 1 << n; m++) {
    const d = k % base;
    k = Math.floor(k / base);
    values.push(d === 2 ? 'x' : (d as 0 | 1));
  }
  return { n, values };
}

export function fromMinterms(n: number, ones: number[], dcs: number[] = []): BoolFunction {
  const values: CellValue[] = [];
  for (let m = 0; m < 1 << n; m++) values.push(dcs.includes(m) ? 'x' : ones.includes(m) ? 1 : 0);
  return { n, values };
}

/** Throw with a readable message if a cover isn't equivalent to the function on care cells. */
export function assertEquivalent(fn: BoolFunction, cubes: Cube[], form: Form): void {
  for (let m = 0; m < 1 << fn.n; m++) {
    const v = fn.values[m];
    if (v === 'x') continue;
    const covered = cubes.some((c) => coversMinterm(c, m));
    // SOP: covered cells output 1. POS: covered cells (groups of 0s) output 0.
    const output = form === 'sop' ? (covered ? 1 : 0) : covered ? 0 : 1;
    if (output !== v) {
      throw new Error(`${form} answer gives ${output} at minterm ${m} but the function is ${v}: ${JSON.stringify(fn.values)}`);
    }
  }
}

/** Run every structural check on a solve result. */
export function assertSound(fn: BoolFunction, result: SolveResult): void {
  if (!result.proven) throw new Error(`search hit its work limit: ${JSON.stringify(fn.values)}`);
  const keys = new Set<string>();
  result.solutions.forEach((_, i) => {
    const cubes = solutionCubes(result, i);
    assertEquivalent(fn, cubes, result.form);
    const cost = coverCost(cubes, fn.n);
    if (cost.terms !== result.cost.terms || cost.literals !== result.cost.literals) {
      throw new Error(`solution ${i} costs ${JSON.stringify(cost)} but result says ${JSON.stringify(result.cost)}`);
    }
    const key = result.solutions[i]!.join(',');
    if (keys.has(key)) throw new Error(`duplicate solution ${key}`);
    keys.add(key);
  });
}

export function solveBoth(fn: BoolFunction): { sop: SolveResult; pos: SolveResult } {
  return { sop: solve(fn, 'sop'), pos: solve(fn, 'pos') };
}

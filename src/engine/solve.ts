import { analyzeCover } from './cover';
import { compareReadingOrder, cubeMinterms, fullMask } from './cube';
import { petrick, type PetrickResult } from './petrick';
import { quineMcCluskey, type QmResult } from './qm';
import type { BoolFunction, Cost, Cube, Form } from './types';

export interface PrimeInfo {
  cube: Cube;
  /** "P1", "P2", ... in sorted order. */
  label: string;
  /** Every minterm the prime covers, including don't-cares. */
  minterms: number[];
  /** Required minterms it covers. */
  covers: number[];
  /** Covers only don't-cares, so it never appears in a minimum answer. */
  dontCareOnly: boolean;
}

export interface SolveResult {
  form: Form;
  n: number;
  /** Cells to cover: the 1s for SOP, the 0s for POS. */
  required: number[];
  dontCares: number[];
  qm: QmResult;
  primes: PrimeInfo[];
  essentials: { prime: number; minterms: number[] }[];
  remainingMinterms: number[];
  remainingPrimes: number[];
  /** Petrick's method on the reduced chart, or null if the essentials already cover everything. */
  petrick: PetrickResult | null;
  /** Every minimum solution (up to MAX_SOLUTIONS), terms in reading order, as indices into `primes`. */
  solutions: number[][];
  /** True when there were more minimum solutions than are listed. */
  solutionsTruncated: boolean;
  /** False only if the search hit its safety limit (never happens in the test suite). */
  proven: boolean;
  cost: Cost;
  /** Set when the answer is a constant. */
  constant: 0 | 1 | null;
}

/** Minterms (as numbers) where the function equals `target`. */
export function mintermsWhere(fn: BoolFunction, target: 0 | 1 | 'x'): number[] {
  const out: number[] = [];
  fn.values.forEach((v, m) => {
    if (v === target) out.push(m);
  });
  return out;
}

/**
 * Minimize a function. For SOP the 1s are covered; for POS the 0s are covered and each
 * cube is read as a sum term (a variable that is 1 throughout the group appears complemented).
 */
export function solve(fn: BoolFunction, form: Form): SolveResult {
  const { n } = fn;
  const required = mintermsWhere(fn, form === 'sop' ? 1 : 0);
  const dontCares = mintermsWhere(fn, 'x');

  if (required.length === 0) {
    const qm = quineMcCluskey(n, []);
    return {
      form,
      n,
      required,
      dontCares,
      qm,
      primes: [],
      essentials: [],
      remainingMinterms: [],
      remainingPrimes: [],
      petrick: null,
      solutions: [[]],
      solutionsTruncated: false,
      proven: true,
      cost: { terms: 0, literals: 0 },
      constant: form === 'sop' ? 0 : 1,
    };
  }

  const qm = quineMcCluskey(n, [...required, ...dontCares]);
  const analysis = analyzeCover(n, qm.primes, required);

  const primes: PrimeInfo[] = qm.primes.map((cube, i) => ({
    cube,
    label: `P${i + 1}`,
    minterms: cubeMinterms(cube),
    covers: analysis.coverage[i]!,
    dontCareOnly: analysis.coverage[i]!.length === 0,
  }));

  const petrickResult =
    analysis.remainingMinterms.length > 0
      ? petrick(n, qm.primes, analysis.remainingPrimes, analysis.remainingMinterms)
      : null;

  // Terms within each answer in textbook reading order.
  const solutions = analysis.covers.map((cover) =>
    cover.slice().sort((a, b) => compareReadingOrder(qm.primes[a]!, qm.primes[b]!, n)),
  );
  const first = solutions[0]!;
  const isFull = first.length === 1 && qm.primes[first[0]!]!.dashes === fullMask(n);

  return {
    form,
    n,
    required,
    dontCares,
    qm,
    primes,
    essentials: analysis.essentials,
    remainingMinterms: analysis.remainingMinterms,
    remainingPrimes: analysis.remainingPrimes,
    petrick: petrickResult,
    solutions,
    solutionsTruncated: analysis.coversTruncated,
    proven: analysis.proven,
    cost: analysis.cost,
    constant: isFull ? (form === 'sop' ? 1 : 0) : null,
  };
}

/** The cubes of one solution. */
export function solutionCubes(result: SolveResult, index: number): Cube[] {
  return (result.solutions[index] ?? []).map((i) => result.primes[i]!.cube);
}

/** Don't-care minterms that a solution's groups cover. */
export function usedDontCares(result: SolveResult, index: number): number[] {
  const covered = new Set<number>();
  for (const i of result.solutions[index] ?? []) {
    for (const m of result.primes[i]!.minterms) covered.add(m);
  }
  return result.dontCares.filter((m) => covered.has(m));
}

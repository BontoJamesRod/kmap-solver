import { combine, compareCubes, cubeKey, cubeMinterms, popcount } from './cube';
import type { Cube } from './types';

export interface QmEntry {
  cube: Cube;
  /** Minterms (including don't-cares) this entry covers. */
  minterms: number[];
  /** True if this entry combined with another in the next round (so it is not prime). */
  combined: boolean;
}

export interface QmRound {
  /** Entries grouped by the number of 1s in their fixed bits. Index = number of 1s. */
  groups: QmEntry[][];
}

export interface QmResult {
  rounds: QmRound[];
  primes: Cube[];
}

function groupByOnes(entries: QmEntry[], n: number): QmEntry[][] {
  const groups: QmEntry[][] = Array.from({ length: n + 1 }, () => []);
  for (const e of entries) groups[popcount(e.cube.value)]!.push(e);
  for (const g of groups) g.sort((a, b) => compareCubes(a.cube, b.cube));
  return groups;
}

/**
 * Quine-McCluskey prime implicant generation.
 * `terms` is every minterm that may be covered: the required 1s plus the don't-cares.
 */
export function quineMcCluskey(n: number, terms: number[]): QmResult {
  const unique = [...new Set(terms)].sort((a, b) => a - b);
  const rounds: QmRound[] = [];
  const primes: Cube[] = [];
  const primeKeys = new Set<number>();

  let current: QmEntry[] = unique.map((m) => ({
    cube: { value: m, dashes: 0 },
    minterms: [m],
    combined: false,
  }));

  while (current.length > 0) {
    const groups = groupByOnes(current, n);
    rounds.push({ groups });

    const next = new Map<number, QmEntry>();
    for (let k = 0; k < groups.length - 1; k++) {
      for (const a of groups[k]!) {
        for (const b of groups[k + 1]!) {
          const c = combine(a.cube, b.cube);
          if (!c) continue;
          a.combined = true;
          b.combined = true;
          const key = cubeKey(c);
          if (!next.has(key)) next.set(key, { cube: c, minterms: cubeMinterms(c), combined: false });
        }
      }
    }

    for (const g of groups) {
      for (const e of g) {
        if (!e.combined && !primeKeys.has(cubeKey(e.cube))) {
          primeKeys.add(cubeKey(e.cube));
          primes.push(e.cube);
        }
      }
    }

    current = [...next.values()];
  }

  primes.sort(compareCubes);
  return { rounds, primes };
}

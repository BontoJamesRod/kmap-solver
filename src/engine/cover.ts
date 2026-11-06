import { compareCost, coversMinterm, literalCount, popcount } from './cube';
import type { Cost, Cube } from './types';

export interface CoverAnalysis {
  /** For each prime: the required minterms it covers. */
  coverage: number[][];
  /** Prime indices that cover at least one required minterm (the rows of the chart). */
  chartPrimes: number[];
  /** Essential primes, each with the minterms only it covers. */
  essentials: { prime: number; minterms: number[] }[];
  /** Required minterms not covered by the essentials. */
  remainingMinterms: number[];
  /** Non-essential primes covering at least one remaining minterm. */
  remainingPrimes: number[];
  /** Every minimum cover, as ascending prime indices (essentials included), up to MAX_SOLUTIONS. */
  covers: number[][];
  /** True when there are more than MAX_SOLUTIONS minimum covers and only the first ones are listed. */
  coversTruncated: boolean;
  /** False only if the search hit its work limit; then `cost` is the best found, not proven minimal. */
  proven: boolean;
  cost: Cost;
}

/** Most minimum answers to list. Highly symmetric 6-variable functions can have millions. */
export const MAX_SOLUTIONS = 100;

/** Safety limit on search nodes so the page can never freeze. Never reached in the test suite. */
const NODE_BUDGET = 2_000_000;

/** 64-bit set split into two 32-bit halves. */
interface Bits {
  lo: number;
  hi: number;
}

function bitOf(j: number): Bits {
  return j < 32 ? { lo: (1 << j) >>> 0, hi: 0 } : { lo: 0, hi: (1 << (j - 32)) >>> 0 };
}

/**
 * Find essential prime implicants and every minimum-cost cover of `required`
 * using `primes`, where cost is (number of terms, number of literals).
 *
 * Uses exact branch and bound. Each cover is generated exactly once: when branching on
 * the candidates for a minterm, candidates tried earlier are excluded from later branches.
 */
export function analyzeCover(n: number, primes: Cube[], required: number[]): CoverAnalysis {
  const coverage = primes.map((p) => required.filter((m) => coversMinterm(p, m)));
  const chartPrimes = primes.map((_, i) => i).filter((i) => coverage[i]!.length > 0);
  const lits = primes.map((p) => literalCount(p, n));

  // Essentials
  const essentialMap = new Map<number, number[]>();
  for (const m of required) {
    const coveringPrimes = chartPrimes.filter((i) => coversMinterm(primes[i]!, m));
    if (coveringPrimes.length === 1) {
      const p = coveringPrimes[0]!;
      if (!essentialMap.has(p)) essentialMap.set(p, []);
      essentialMap.get(p)!.push(m);
    }
  }
  const essentials = [...essentialMap.entries()]
    .map(([prime, minterms]) => ({ prime, minterms }))
    .sort((a, b) => a.prime - b.prime);
  const essentialSet = new Set(essentials.map((e) => e.prime));

  const remainingMinterms = required.filter(
    (m) => !essentials.some((e) => coversMinterm(primes[e.prime]!, m)),
  );
  const remainingPrimes = chartPrimes.filter(
    (i) => !essentialSet.has(i) && remainingMinterms.some((m) => coversMinterm(primes[i]!, m)),
  );

  const baseTerms = essentials.length;
  const baseLits = essentials.reduce((s, e) => s + lits[e.prime]!, 0);
  const essentialList = essentials.map((e) => e.prime);

  if (remainingMinterms.length === 0) {
    return {
      coverage,
      chartPrimes,
      essentials,
      remainingMinterms,
      remainingPrimes,
      covers: [essentialList.slice().sort((a, b) => a - b)],
      coversTruncated: false,
      proven: true,
      cost: { terms: baseTerms, literals: baseLits },
    };
  }

  // Set up the search over the remaining chart.
  const R = remainingMinterms.length;
  const cands = remainingPrimes;
  const candBits: Bits[] = cands.map((p) => {
    const b: Bits = { lo: 0, hi: 0 };
    remainingMinterms.forEach((m, j) => {
      if (coversMinterm(primes[p]!, m)) {
        const bit = bitOf(j);
        b.lo = (b.lo | bit.lo) >>> 0;
        b.hi = (b.hi | bit.hi) >>> 0;
      }
    });
    return b;
  });
  const candCount = candBits.map((b) => popcount(b.lo) + popcount(b.hi));
  const candLits = cands.map((p) => lits[p]!);
  const full: Bits = { lo: 0, hi: 0 };
  for (let j = 0; j < R; j++) {
    const bit = bitOf(j);
    full.lo = (full.lo | bit.lo) >>> 0;
    full.hi = (full.hi | bit.hi) >>> 0;
  }

  // For each remaining minterm, its candidates: most coverage first, then fewest literals.
  const byMinterm: number[][] = remainingMinterms.map((_, j) => {
    const bit = bitOf(j);
    return cands
      .map((_, c) => c)
      .filter((c) => (candBits[c]!.lo & bit.lo) !== 0 || (candBits[c]!.hi & bit.hi) !== 0)
      .sort((a, b) => candCount[b]! - candCount[a]! || candLits[a]! - candLits[b]! || a - b);
  });

  // Greedy upper bound so pruning starts strong.
  let best: Cost;
  const greedy: number[] = [];
  {
    let cov: Bits = { lo: 0, hi: 0 };
    let terms = baseTerms;
    let literals = baseLits;
    while (cov.lo !== full.lo || cov.hi !== full.hi) {
      let pick = -1;
      let pickGain = -1;
      for (let c = 0; c < cands.length; c++) {
        const gain =
          popcount((candBits[c]!.lo & ~cov.lo) >>> 0) + popcount((candBits[c]!.hi & ~cov.hi) >>> 0);
        if (gain > pickGain || (gain === pickGain && candLits[c]! < candLits[pick]!)) {
          pick = c;
          pickGain = gain;
        }
      }
      cov = { lo: (cov.lo | candBits[pick]!.lo) >>> 0, hi: (cov.hi | candBits[pick]!.hi) >>> 0 };
      greedy.push(pick);
      terms++;
      literals += candLits[pick]!;
    }
    best = { terms, literals };
  }

  // Minterms with few candidates first make the greedy independent set larger.
  const minOrder = remainingMinterms.map((_, j) => j).sort((a, b) => byMinterm[a]!.length - byMinterm[b]!.length || a - b);
  const blocked = new Uint8Array(cands.length);
  let nodes = 0;
  let exhausted = false;

  let results: number[][] = [];
  // Once MAX_SOLUTIONS ties are collected, only strictly cheaper covers are worth exploring.
  let capped = false;
  const excluded = new Uint8Array(cands.length);
  const chosen: number[] = [];

  const search = (covLo: number, covHi: number, terms: number, literals: number): void => {
    if (exhausted) return;
    if (covLo === full.lo && covHi === full.hi) {
      const cmp = compareCost({ terms, literals }, best);
      if (cmp < 0) {
        best = { terms, literals };
        results = [chosen.slice()];
        capped = false;
      } else if (cmp === 0) {
        if (results.length < MAX_SOLUTIONS) results.push(chosen.slice());
        else capped = true;
      }
      return;
    }

    // Lower bound: uncovered minterms that share no available candidate each need their own
    // term (a greedy independent set). Each such term costs at least its cheapest candidate.
    nodes++;
    if (nodes > NODE_BUDGET) {
      exhausted = true;
      return;
    }
    let lbTerms = 0;
    let lbLits = 0;
    blocked.fill(0);
    for (const j of minOrder) {
      const bit = bitOf(j);
      if ((covLo & bit.lo) !== 0 || (covHi & bit.hi) !== 0) continue;
      let independent = true;
      let cheapest = Infinity;
      for (const c of byMinterm[j]!) {
        if (excluded[c]) continue;
        if (blocked[c]) independent = false;
        if (candLits[c]! < cheapest) cheapest = candLits[c]!;
      }
      if (cheapest === Infinity) return; // cannot be covered in this branch
      if (!independent) continue;
      lbTerms++;
      lbLits += cheapest;
      for (const c of byMinterm[j]!) if (!excluded[c]) blocked[c] = 1;
    }
    // Second bound: cells left divided by the most any available candidate still covers.
    const uncovered = R - popcount(covLo) - popcount(covHi);
    let maxGain = 0;
    let minCandLits = Infinity;
    for (let c = 0; c < cands.length; c++) {
      if (excluded[c]) continue;
      const gain = popcount((candBits[c]!.lo & ~covLo) >>> 0) + popcount((candBits[c]!.hi & ~covHi) >>> 0);
      if (gain === 0) continue;
      if (gain > maxGain) maxGain = gain;
      if (candLits[c]! < minCandLits) minCandLits = candLits[c]!;
    }
    const ceilTerms = Math.ceil(uncovered / maxGain);
    const minTerms = terms + Math.max(lbTerms, ceilTerms);
    const minLits = literals + Math.max(lbLits, ceilTerms * minCandLits);
    if (minTerms > best.terms || (minTerms === best.terms && minLits > best.literals)) return;
    if (capped && minTerms === best.terms && minLits >= best.literals) return;

    // Branch on the uncovered minterm with the fewest available candidates.
    let branchJ = -1;
    let branchCount = Infinity;
    for (let j = 0; j < R; j++) {
      const bit = bitOf(j);
      if ((covLo & bit.lo) !== 0 || (covHi & bit.hi) !== 0) continue;
      let count = 0;
      for (const c of byMinterm[j]!) if (!excluded[c]) count++;
      if (count === 0) return; // cannot be covered in this branch
      if (count < branchCount) {
        branchCount = count;
        branchJ = j;
      }
    }

    const newlyExcluded: number[] = [];
    for (const c of byMinterm[branchJ]!) {
      if (excluded[c]) continue;
      const nt = terms + 1;
      const nl = literals + candLits[c]!;
      if (nt < best.terms || (nt === best.terms && (nl < best.literals || (!capped && nl === best.literals)))) {
        chosen.push(c);
        search((covLo | candBits[c]!.lo) >>> 0, (covHi | candBits[c]!.hi) >>> 0, nt, nl);
        chosen.pop();
      }
      excluded[c] = 1;
      newlyExcluded.push(c);
    }
    for (const c of newlyExcluded) excluded[c] = 0;
  };

  search(0, 0, baseTerms, baseLits);

  // Only possible if the work limit ran out before the search matched the greedy cover.
  if (results.length === 0) results = [greedy];
  const covers = results
    .map((set) => [...essentialList, ...set.map((c) => cands[c]!)].sort((a, b) => a - b))
    .sort(compareIndexLists);


  return {
    coverage,
    chartPrimes,
    essentials,
    remainingMinterms,
    remainingPrimes,
    covers,
    coversTruncated: capped,
    proven: !exhausted,
    cost: best,
  };
}

export function compareIndexLists(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i]! - b[i]!;
  }
  return a.length - b.length;
}

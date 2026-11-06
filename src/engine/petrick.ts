import { compareCost, coversMinterm, literalCount } from './cube';
import { compareIndexLists } from './cover';
import type { Cost, Cube } from './types';

/** Above this many products, the expansion is too large to show in full. */
export const PETRICK_LIMIT = 256;
/** Stop before absorbing a multiplication step this large (absorption is quadratic). */
const PETRICK_STEP_LIMIT = 4096;

export interface PetrickResult {
  /** Prime indices in the reduced chart; position k is labeled by primes[k] in the display. */
  primes: number[];
  /** One factor per remaining minterm: the positions (into `primes`) that cover it. */
  factors: { minterm: number; options: number[] }[];
  /** The expanded sum of products after absorption, as sorted position lists. Null if truncated. */
  products: number[][] | null;
  truncated: boolean;
  /** Products with minimum (terms, literals), as sorted prime indices (not positions). */
  minimal: number[][];
  minimalCost: Cost | null;
}

function bitCount(b: bigint): number {
  let c = 0;
  while (b) {
    b &= b - 1n;
    c++;
  }
  return c;
}

function positions(b: bigint): number[] {
  const out: number[] = [];
  let i = 0;
  while (b) {
    if (b & 1n) out.push(i);
    b >>= 1n;
    i++;
  }
  return out;
}

/** Remove duplicates and any product that is a superset of another (X + XY = X). */
function absorb(products: bigint[]): bigint[] {
  const unique = [...new Set(products)].sort((a, b) => bitCount(a) - bitCount(b));
  const kept: bigint[] = [];
  for (const p of unique) {
    if (!kept.some((k) => (k & p) === k)) kept.push(p);
  }
  return kept;
}

/**
 * Petrick's method on the reduced prime implicant chart.
 * `remainingPrimes` and `remainingMinterms` come from the cover analysis (essentials removed).
 */
export function petrick(
  n: number,
  primes: Cube[],
  remainingPrimes: number[],
  remainingMinterms: number[],
): PetrickResult {
  const factors = remainingMinterms.map((m) => ({
    minterm: m,
    options: remainingPrimes.map((p, k) => (coversMinterm(primes[p]!, m) ? k : -1)).filter((k) => k >= 0),
  }));

  let products: bigint[] = [0n];
  let truncated = false;
  for (const f of factors) {
    const next: bigint[] = [];
    for (const p of products) {
      // If p already contains one of the options, this factor is already satisfied.
      if (f.options.some((k) => (p >> BigInt(k)) & 1n)) {
        next.push(p);
        continue;
      }
      for (const k of f.options) next.push(p | (1n << BigInt(k)));
    }
    if (next.length > PETRICK_STEP_LIMIT) {
      truncated = true;
      break;
    }
    products = absorb(next);
    if (products.length > PETRICK_LIMIT) {
      truncated = true;
      break;
    }
  }

  if (truncated) {
    return { primes: remainingPrimes, factors, products: null, truncated, minimal: [], minimalCost: null };
  }

  const lists = products.map(positions).sort(compareIndexLists);
  const costOf = (list: number[]): Cost => ({
    terms: list.length,
    literals: list.reduce((s, k) => s + literalCount(primes[remainingPrimes[k]!]!, n), 0),
  });
  let minimalCost: Cost | null = null;
  for (const l of lists) {
    const c = costOf(l);
    if (!minimalCost || compareCost(c, minimalCost) < 0) minimalCost = c;
  }
  const minimal = lists
    .filter((l) => compareCost(costOf(l), minimalCost!) === 0)
    .map((l) => l.map((k) => remainingPrimes[k]!).sort((a, b) => a - b))
    .sort(compareIndexLists);

  return { primes: remainingPrimes, factors, products: lists, truncated, minimal, minimalCost };
}

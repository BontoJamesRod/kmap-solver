/** Independent checks for the step-by-step data (prime list, essentials, Petrick expansion). */
import { coversMinterm } from '../cube';
import type { SolveResult } from '../solve';
import type { BoolFunction } from '../types';

/** All prime implicants by brute force: implicants that stop being implicants if any literal is dropped. */
export function bruteForcePrimes(fn: BoolFunction, target: 0 | 1): string[] {
  const n = fn.n;
  const allowed = (m: number) => fn.values[m] === target || fn.values[m] === 'x';
  const isImplicant = (value: number, dashes: number) => {
    for (let m = 0; m < 1 << n; m++) if ((m & ~dashes) === value && !allowed(m)) return false;
    return true;
  };
  const out: string[] = [];
  for (let dashes = 0; dashes < 1 << n; dashes++) {
    for (let value = 0; value < 1 << n; value++) {
      if (value & dashes) continue;
      if (!isImplicant(value, dashes)) continue;
      let maximal = true;
      for (let b = 0; b < n && maximal; b++) {
        const bit = 1 << b;
        if (dashes & bit) continue;
        if (isImplicant(value & ~bit, dashes | bit)) maximal = false;
      }
      if (maximal) out.push(`${value}/${dashes}`);
    }
  }
  return out.sort();
}

export function stepProblems(fn: BoolFunction, r: SolveResult): string[] {
  const problems: string[] = [];
  if (r.required.length === 0) return problems;
  const target = r.form === 'sop' ? 1 : 0;

  // 1. The prime list is exactly the set of prime implicants.
  const got = r.primes.map((p) => `${p.cube.value}/${p.cube.dashes}`).sort();
  const want = bruteForcePrimes(fn, target);
  if (got.join(' ') !== want.join(' ')) problems.push(`primes ${got} != ${want}`);

  // 2. Essentials are exactly the primes that are the only cover of some required minterm.
  const chart = r.primes.map((_, i) => i).filter((i) => !r.primes[i]!.dontCareOnly);
  const wantEss = new Set<number>();
  for (const m of r.required) {
    const c = chart.filter((i) => coversMinterm(r.primes[i]!.cube, m));
    if (c.length === 1) wantEss.add(c[0]!);
  }
  const gotEss = r.essentials.map((e) => e.prime).sort((a, b) => a - b);
  if (gotEss.join() !== [...wantEss].sort((a, b) => a - b).join()) problems.push(`essentials ${gotEss} != ${[...wantEss]}`);

  // 3. Petrick: every product covers the reduced chart, none contains another,
  //    and (for small charts) every irredundant cover appears.
  const p = r.petrick;
  if (p && p.products) {
    const coversAll = (set: number[]) =>
      r.remainingMinterms.every((m) => set.some((k) => coversMinterm(r.primes[p.primes[k]!]!.cube, m)));
    const keys = p.products.map((s) => s.join(','));
    for (const s of p.products) if (!coversAll(s)) problems.push(`petrick product ${s} is not a cover`);
    for (const a of p.products) {
      for (const b of p.products) {
        if (a !== b && a.every((k) => b.includes(k))) problems.push(`petrick product ${b} contains ${a}`);
      }
    }
    const k = p.primes.length;
    if (k <= 14) {
      for (let mask = 1; mask < 1 << k; mask++) {
        const set = [...Array(k).keys()].filter((i) => mask & (1 << i));
        if (!coversAll(set)) continue;
        const irredundant = set.every((drop) => !coversAll(set.filter((i) => i !== drop)));
        if (irredundant && !keys.includes(set.join(','))) problems.push(`petrick missed cover ${set}`);
      }
    }
  }
  return problems;
}

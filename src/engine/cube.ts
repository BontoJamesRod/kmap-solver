import type { Cost, Cube } from './types';

export function popcount(x: number): number {
  let count = 0;
  let v = x >>> 0;
  while (v) {
    v &= v - 1;
    count++;
  }
  return count;
}

export function fullMask(n: number): number {
  return (1 << n) - 1;
}

/** Bit position of variable i in an n-variable minterm index. */
export function varBit(n: number, i: number): number {
  return 1 << (n - 1 - i);
}

export function literalCount(cube: Cube, n: number): number {
  return n - popcount(cube.dashes);
}

export function coversMinterm(cube: Cube, m: number): boolean {
  return (m & ~cube.dashes) === cube.value;
}

/** All minterms a cube covers, ascending. */
export function cubeMinterms(cube: Cube): number[] {
  const out: number[] = [];
  const d = cube.dashes;
  for (let s = d; ; s = (s - 1) & d) {
    out.push(cube.value | s);
    if (s === 0) break;
  }
  return out.sort((a, b) => a - b);
}

/** Combine two cubes that differ in exactly one fixed bit, or return null. */
export function combine(a: Cube, b: Cube): Cube | null {
  if (a.dashes !== b.dashes) return null;
  const diff = a.value ^ b.value;
  if (diff === 0 || (diff & (diff - 1)) !== 0) return null;
  return { value: a.value & ~diff, dashes: a.dashes | diff };
}

/** Unique numeric key for a cube (n <= 6). */
export function cubeKey(cube: Cube): number {
  return cube.dashes * 128 + cube.value;
}

/** Tabular notation, first variable first: e.g. "10-1". */
export function cubePattern(cube: Cube, n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) {
    const bit = 1 << (n - 1 - i);
    s += cube.dashes & bit ? '-' : cube.value & bit ? '1' : '0';
  }
  return s;
}

export function compareCubes(a: Cube, b: Cube): number {
  return a.value - b.value || a.dashes - b.dashes;
}

/**
 * Textbook reading order for terms in an answer: go variable by variable (A first);
 * a term containing the variable comes before one without it, and a 0 bit before a 1 bit.
 * Gives "A'B' + AC + BC'" and "(A' + B')(B' + D)(C' + D')".
 */
export function compareReadingOrder(a: Cube, b: Cube, n: number): number {
  for (let i = 0; i < n; i++) {
    const bit = 1 << (n - 1 - i);
    const aHas = (a.dashes & bit) === 0;
    const bHas = (b.dashes & bit) === 0;
    if (aHas !== bHas) return aHas ? -1 : 1;
    if (aHas) {
      const av = a.value & bit;
      const bv = b.value & bit;
      if (av !== bv) return av ? 1 : -1;
    }
  }
  return 0;
}

export function compareCost(a: Cost, b: Cost): number {
  return a.terms - b.terms || a.literals - b.literals;
}

export function coverCost(cubes: Cube[], n: number): Cost {
  let literals = 0;
  for (const c of cubes) literals += literalCount(c, n);
  return { terms: cubes.length, literals };
}

/** Gray code sequence for k bits, e.g. k=2 -> [0, 1, 3, 2]. */
export function grayCodes(k: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 1 << k; i++) out.push(i ^ (i >> 1));
  return out;
}

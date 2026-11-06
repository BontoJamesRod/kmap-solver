/**
 * Independent minimality check (NFR-1). This search knows nothing about prime implicants
 * or the solver: it tries covers built from *every* implicant and keeps the cheapest.
 * The solver's answers must be exactly that set. Never weaken this test (CLAUDE.md rule 4).
 */
import { describe, expect, it } from 'vitest';
import { solve } from '../solve';
import type { BoolFunction, Cube, Form } from '../types';
import { functionFromIndex, randomFunction, rng } from './helpers';

interface Imp {
  key: string;
  cells: number[];
  literals: number;
}

/** Every cube (3^n of them) whose cells are all allowed (required or don't-care). */
function allImplicants(fn: BoolFunction, target: 0 | 1): Imp[] {
  const out: Imp[] = [];
  const total = 3 ** fn.n;
  for (let code = 0; code < total; code++) {
    // Base-3 digit per variable: 0 -> 0, 1 -> 1, 2 -> eliminated.
    const digits: number[] = [];
    let k = code;
    for (let i = 0; i < fn.n; i++) {
      digits.push(k % 3);
      k = Math.floor(k / 3);
    }
    const cells: number[] = [];
    for (let m = 0; m < 1 << fn.n; m++) {
      let ok = true;
      for (let i = 0; i < fn.n && ok; i++) {
        const bit = (m >> (fn.n - 1 - i)) & 1;
        if (digits[i] !== 2 && digits[i] !== bit) ok = false;
      }
      if (ok) cells.push(m);
    }
    if (cells.every((m) => fn.values[m] === target || fn.values[m] === 'x')) {
      out.push({ key: digits.join(''), cells, literals: digits.filter((d) => d !== 2).length });
    }
  }
  return out;
}

/** All minimum covers by (terms, literals), each as a sorted list of implicant keys. */
function bruteForce(fn: BoolFunction, form: Form): string[] {
  const target = form === 'sop' ? 1 : 0;
  const required = fn.values.map((v, m) => (v === target ? m : -1)).filter((m) => m >= 0);
  if (required.length === 0) return [''];
  const imps = allImplicants(fn, target);
  let best = { terms: Infinity, literals: Infinity };
  let found: string[] = [];
  const chosen: Imp[] = [];
  const excluded = new Set<string>();

  const rec = (covered: Set<number>, terms: number, literals: number) => {
    const next = required.find((m) => !covered.has(m));
    if (next === undefined) {
      const key = chosen.map((c) => c.key).sort().join('|');
      if (terms < best.terms || (terms === best.terms && literals < best.literals)) {
        best = { terms, literals };
        found = [key];
      } else if (terms === best.terms && literals === best.literals && !found.includes(key)) {
        found.push(key);
      }
      return;
    }
    if (terms + 1 > best.terms) return;
    const options = imps.filter((imp) => !excluded.has(imp.key) && imp.cells.includes(next));
    const added: string[] = [];
    for (const imp of options) {
      const nt = terms + 1;
      const nl = literals + imp.literals;
      if (nt < best.terms || (nt === best.terms && nl <= best.literals)) {
        chosen.push(imp);
        rec(new Set([...covered, ...imp.cells]), nt, nl);
        chosen.pop();
      }
      excluded.add(imp.key);
      added.push(imp.key);
    }
    for (const k of added) excluded.delete(k);
  };
  rec(new Set(), 0, 0);
  return found.sort();
}

function cubeKeyBase3(c: Cube, n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) {
    const bit = 1 << (n - 1 - i);
    s += c.dashes & bit ? '2' : c.value & bit ? '1' : '0';
  }
  return s;
}

function solverAnswers(fn: BoolFunction, form: Form): string[] {
  const r = solve(fn, form);
  return r.solutions
    .map((sol) => sol.map((i) => cubeKeyBase3(r.primes[i]!.cube, fn.n)).sort().join('|'))
    .sort();
}

function compare(fn: BoolFunction): void {
  for (const form of ['sop', 'pos'] as const) {
    expect(solverAnswers(fn, form), `${form} ${JSON.stringify(fn.values)}`).toEqual(bruteForce(fn, form));
  }
}

describe('brute-force minimality and completeness', () => {
  it('every 2-variable function with don\'t-cares (81)', () => {
    for (let i = 0; i < 3 ** 4; i++) compare(functionFromIndex(2, i, 3));
  });

  it('every 3-variable function with don\'t-cares (6,561)', () => {
    for (let i = 0; i < 3 ** 8; i++) compare(functionFromIndex(3, i, 3));
  });

  it('1,500 random 4-variable functions with don\'t-cares', () => {
    const rand = rng(44);
    for (let i = 0; i < 1_500; i++) compare(randomFunction(4, rand, 0.3 * rand(), 0.2 + 0.6 * rand()));
  });
});

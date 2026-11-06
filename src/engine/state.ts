import { functionFromLists } from './lists';
import type { ThreeVarLayout } from './layout';
import { DEFAULT_NAMES, MAX_VARS, MIN_VARS, type BoolFunction, type CellValue, type Form } from './types';

export interface AppState {
  fn: BoolFunction;
  names: string[];
  layout3: ThreeVarLayout;
  form: Form;
  /** Which minimal solution is shown, per form. */
  solution: number;
}

/** A classic textbook example with two minimal answers: F = Σm(1,3,7,11,15) + d(0,2,5). */
export function defaultState(): AppState {
  const built = functionFromLists(4, 'minterms', [1, 3, 7, 11, 15], [0, 2, 5]);
  if (!built.ok) throw new Error(built.error);
  return { fn: built.fn, names: DEFAULT_NAMES.slice(0, 4), layout3: 'wide', form: 'sop', solution: 0 };
}

export function isValidName(name: string): boolean {
  return /^[A-Za-z][0-9]*$/.test(name);
}

/** Error message for a list of variable names, or null if they're fine. */
export function validateNames(names: string[]): string | null {
  const bad = names.find((nm) => !isValidName(nm));
  if (bad !== undefined) {
    return bad === '' ? 'Every variable needs a name.' : `"${bad}" isn't a valid name. Use one letter, optionally followed by digits (A, x, x1).`;
  }
  const lower = names.map((nm) => nm.toLowerCase());
  const dup = lower.find((nm, i) => lower.indexOf(nm) !== i);
  if (dup !== undefined) return `Two variables are both named "${names[lower.indexOf(dup)]}".`;
  return null;
}

/** Names for a new variable count: keep the existing ones, then fill with unused defaults. */
export function namesFor(current: string[], n: number): string[] {
  const out = current.slice(0, n);
  const pool = [...DEFAULT_NAMES, 'G', 'H', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  for (const cand of pool) {
    if (out.length >= n) break;
    if (!out.some((nm) => nm.toLowerCase() === cand.toLowerCase())) out.push(cand);
  }
  return out;
}

/**
 * Change the number of variables, keeping each minterm number's value where it still exists.
 * New cells start as 0.
 */
export function resizeFunction(fn: BoolFunction, n: number): BoolFunction {
  const values: CellValue[] = [];
  for (let m = 0; m < 1 << n; m++) values.push(m < fn.values.length ? fn.values[m]! : 0);
  return { n, values };
}

/** Encode state into a URL hash (without the leading #). */
export function encodeState(s: AppState): string {
  const p = new URLSearchParams();
  p.set('n', String(s.fn.n));
  p.set('f', s.fn.values.map((v) => String(v)).join(''));
  const defaults = DEFAULT_NAMES.slice(0, s.fn.n);
  if (s.names.join(',') !== defaults.join(',')) p.set('v', s.names.join(','));
  if (s.fn.n === 3 && s.layout3 === 'tall') p.set('l', 'tall');
  if (s.form === 'pos') p.set('m', 'pos');
  if (s.solution > 0) p.set('s', String(s.solution));
  return p.toString();
}

/** Decode a URL hash. Returns null if anything is missing or invalid. */
export function decodeState(hash: string): AppState | null {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const n = Number(p.get('n'));
  if (!Number.isInteger(n) || n < MIN_VARS || n > MAX_VARS) return null;
  const f = p.get('f') ?? '';
  if (f.length !== 1 << n || !/^[01x]+$/.test(f)) return null;
  const values = [...f].map((c) => (c === 'x' ? 'x' : (Number(c) as 0 | 1))) as CellValue[];
  const names = p.get('v') ? p.get('v')!.split(',') : DEFAULT_NAMES.slice(0, n);
  if (names.length !== n || validateNames(names)) return null;
  const solution = Number(p.get('s') ?? 0);
  return {
    fn: { n, values },
    names,
    layout3: p.get('l') === 'tall' ? 'tall' : 'wide',
    form: p.get('m') === 'pos' ? 'pos' : 'sop',
    solution: Number.isInteger(solution) && solution >= 0 ? solution : 0,
  };
}

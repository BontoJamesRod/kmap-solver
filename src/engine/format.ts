import { fullMask, varBit } from './cube';
import type { BoolFunction, Cube, Form } from './types';

export interface LiteralPart {
  /** Variable index. */
  index: number;
  name: string;
  negated: boolean;
}

/**
 * The literals of a cube in variable order.
 * SOP: a 1 bit gives A, a 0 bit gives A'.
 * POS: a 0 bit gives A, a 1 bit gives A' (each group of 0s is a sum term).
 */
export function cubeLiterals(cube: Cube, n: number, names: string[], form: Form): LiteralPart[] {
  const out: LiteralPart[] = [];
  for (let i = 0; i < n; i++) {
    const bit = varBit(n, i);
    if (cube.dashes & bit) continue;
    const one = (cube.value & bit) !== 0;
    out.push({ index: i, name: names[i]!, negated: form === 'sop' ? !one : one });
  }
  return out;
}

export type Style = 'text' | 'latex' | 'verilog';

function literal(l: LiteralPart, style: Style): string {
  switch (style) {
    case 'text':
      return l.negated ? `${l.name}'` : l.name;
    case 'latex':
      return l.negated ? `\\overline{${l.name}}` : l.name;
    case 'verilog':
      return l.negated ? `~${l.name}` : l.name;
  }
}

/** One term: "A'B" (SOP) or "(A + B')" (POS). Single-literal POS terms have no parentheses. */
export function termToString(cube: Cube, n: number, names: string[], form: Form, style: Style = 'text'): string {
  const lits = cubeLiterals(cube, n, names, form).map((l) => literal(l, style));
  if (form === 'sop') {
    if (lits.length === 0) return style === 'verilog' ? "1'b1" : '1';
    if (style === 'verilog') return lits.length === 1 ? lits[0]! : `(${lits.join(' & ')})`;
    return lits.join(style === 'latex' ? ' ' : '');
  }
  if (lits.length === 0) return style === 'verilog' ? "1'b0" : '0';
  const sep = style === 'verilog' ? ' | ' : ' + ';
  return lits.length === 1 ? lits[0]! : `(${lits.join(sep)})`;
}

/** A whole solution. Empty SOP is 0; empty POS is 1. */
export function solutionToString(
  cubes: Cube[],
  n: number,
  names: string[],
  form: Form,
  style: Style = 'text',
): string {
  if (cubes.length === 0) {
    const constant = form === 'sop' ? 0 : 1;
    return style === 'verilog' ? `1'b${constant}` : String(constant);
  }
  if (cubes.length === 1 && cubes[0]!.dashes === fullMask(n)) {
    const constant = form === 'sop' ? 1 : 0;
    return style === 'verilog' ? `1'b${constant}` : String(constant);
  }
  const terms = cubes.map((c) => termToString(c, n, names, form, style));
  if (form === 'sop') return terms.join(style === 'verilog' ? ' | ' : ' + ');
  if (style === 'verilog') return terms.join(' & ');
  return terms.join('');
}

/** Verilog statement for a solution. */
export function toVerilog(cubes: Cube[], n: number, names: string[], form: Form, output = 'F'): string {
  return `assign ${output} = ${solutionToString(cubes, n, names, form, 'verilog')};`;
}

/** "F(A, B, C)" */
export function functionSignature(names: string[], output = 'F'): string {
  return `${output}(${names.join(', ')})`;
}

/** Canonical forms: Σm(…) + d(…) and ΠM(…) · d(…). */
export function canonicalForms(fn: BoolFunction): { sigma: string; pi: string } {
  const ones: number[] = [];
  const zeros: number[] = [];
  const dcs: number[] = [];
  fn.values.forEach((v, m) => (v === 1 ? ones : v === 0 ? zeros : dcs).push(m));
  const d = dcs.length > 0 ? ` + d(${dcs.join(', ')})` : '';
  const dPi = dcs.length > 0 ? ` · d(${dcs.join(', ')})` : '';
  return {
    sigma: `Σm(${ones.join(', ')})${d}`,
    pi: `ΠM(${zeros.join(', ')})${dPi}`,
  };
}

/** Input values of minterm m as a bit string in variable order, e.g. "0110". */
export function mintermBits(m: number, n: number): string {
  return m.toString(2).padStart(n, '0');
}

/** Minterm as a product, e.g. A'BC'D, for labels and tooltips. */
export function mintermProduct(m: number, n: number, names: string[]): string {
  return termToString({ value: m, dashes: 0 }, n, names, 'sop');
}

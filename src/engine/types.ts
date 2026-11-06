/** Value of the function for one input combination. 'x' is a don't-care. */
export type CellValue = 0 | 1 | 'x';

/** A Boolean function of n variables. values[m] is the output for minterm m. */
export interface BoolFunction {
  n: number;
  values: CellValue[];
}

/**
 * A product term (SOP) or sum term (POS) over n variables.
 * Bit (n - 1 - i) belongs to variable i, so variable 0 is the most significant bit.
 * `dashes` marks eliminated variables; `value` is always 0 at dashed bits.
 */
export interface Cube {
  value: number;
  dashes: number;
}

export type Form = 'sop' | 'pos';

export interface Cost {
  terms: number;
  literals: number;
}

export const MIN_VARS = 2;
export const MAX_VARS = 6;
export const DEFAULT_NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];

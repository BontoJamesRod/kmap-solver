import { describe, expect, it } from 'vitest';
import { canonicalForms, mintermProduct, solutionToString, termToString, toVerilog } from '../format';
import { fromMinterms } from './helpers';

const N = ['A', 'B', 'C'];
// A'C (value 001, B dashed) and AB (value 110, C dashed)
const aNotC = { value: 0b001, dashes: 0b010 };
const ab = { value: 0b110, dashes: 0b001 };

describe('format', () => {
  it('writes SOP in text, LaTeX, and Verilog', () => {
    expect(solutionToString([aNotC, ab], 3, N, 'sop')).toBe("A'C + AB");
    expect(solutionToString([aNotC, ab], 3, N, 'sop', 'latex')).toBe('\\overline{A} C + A B');
    expect(toVerilog([aNotC, ab], 3, N, 'sop')).toBe('assign F = (~A & C) | (A & B);');
  });

  it('writes POS, reading each group of 0s as a sum term', () => {
    // zeros at A=0,C=1 -> (A + C'); zeros at A=1,B=1 -> (A' + B')
    expect(solutionToString([aNotC, ab], 3, N, 'pos')).toBe("(A + C')(A' + B')");
    expect(toVerilog([aNotC, ab], 3, N, 'pos')).toBe("assign F = (A | ~C) & (~A | ~B);");
  });

  it('drops parentheses on single-literal sum terms', () => {
    expect(termToString({ value: 0b100, dashes: 0b011 }, 3, N, 'pos')).toBe("A'");
  });

  it('writes constants', () => {
    expect(solutionToString([], 3, N, 'sop')).toBe('0');
    expect(solutionToString([], 3, N, 'pos')).toBe('1');
    expect(solutionToString([{ value: 0, dashes: 7 }], 3, N, 'sop')).toBe('1');
    expect(toVerilog([], 3, N, 'sop')).toBe("assign F = 1'b0;");
  });

  it('writes canonical forms', () => {
    expect(canonicalForms(fromMinterms(3, [1, 3], [5]))).toEqual({
      sigma: 'Σm(1, 3) + d(5)',
      pi: 'ΠM(0, 2, 4, 6, 7) · d(5)',
    });
  });

  it('names a minterm as a product', () => {
    expect(mintermProduct(5, 3, N)).toBe("AB'C");
  });
});

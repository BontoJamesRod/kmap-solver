import { asProductOfSums, asSumOfProducts, evaluateAll, type Literal } from './expr';
import { parseExpression, type ParseError } from './parse';
import type { SolveResult } from './solve';
import type { BoolFunction, Cost, Form } from './types';

export type CheckResult =
  | { status: 'empty' }
  | { status: 'error'; error: ParseError }
  | {
      status: 'wrong';
      /** Care cells where the answer outputs 1 but the function is 0. */
      extraOnes: number[];
      /** Care cells where the answer outputs 0 but the function is 1. */
      missingOnes: number[];
    }
  | {
      status: 'correct';
      /** The form the answer is written in, if it's a plain SOP or POS. */
      form: Form | null;
      cost: Cost | null;
      minimum: Cost | null;
      /** True or false when it's SOP/POS; null when the form can't be compared. */
      minimal: boolean | null;
    };

function costOf(groups: Literal[][]): Cost {
  return { terms: groups.length, literals: groups.reduce((s, g) => s + g.length, 0) };
}

const sameCost = (a: Cost, b: Cost) => a.terms === b.terms && a.literals === b.literals;

/**
 * Check a user's answer against the function.
 * Equivalence is judged on care cells only; don't-cares may be anything.
 */
export function checkAnswer(fn: BoolFunction, names: string[], text: string, sop: SolveResult, pos: SolveResult): CheckResult {
  if (text.trim() === '') return { status: 'empty' };
  const parsed = parseExpression(text, names);
  if (!parsed.ok) return { status: 'error', error: parsed.error };

  const table = evaluateAll(parsed.expr, fn.n);
  const extraOnes: number[] = [];
  const missingOnes: number[] = [];
  fn.values.forEach((v, m) => {
    if (v === 'x') return;
    if (v === 0 && table[m] === 1) extraOnes.push(m);
    if (v === 1 && table[m] === 0) missingOnes.push(m);
  });
  if (extraOnes.length || missingOnes.length) return { status: 'wrong', extraOnes, missingOnes };

  const sopTerms = asSumOfProducts(parsed.expr);
  const posFactors = asProductOfSums(parsed.expr);

  // A single product (e.g. AB) is both an SOP and a POS; it's minimal if it matches either minimum.
  if (sopTerms && posFactors) {
    const sc = costOf(sopTerms);
    const pc = costOf(posFactors);
    if (sameCost(sc, sop.cost)) return { status: 'correct', form: 'sop', cost: sc, minimum: sop.cost, minimal: true };
    if (sameCost(pc, pos.cost)) return { status: 'correct', form: 'pos', cost: pc, minimum: pos.cost, minimal: true };
    return { status: 'correct', form: 'sop', cost: sc, minimum: sop.cost, minimal: false };
  }
  if (sopTerms) {
    const c = costOf(sopTerms);
    return { status: 'correct', form: 'sop', cost: c, minimum: sop.cost, minimal: sameCost(c, sop.cost) };
  }
  if (posFactors) {
    const c = costOf(posFactors);
    return { status: 'correct', form: 'pos', cost: c, minimum: pos.cost, minimal: sameCost(c, pos.cost) };
  }
  return { status: 'correct', form: null, cost: null, minimum: null, minimal: null };
}

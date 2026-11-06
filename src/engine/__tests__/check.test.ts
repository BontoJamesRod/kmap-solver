import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../check';
import { solve } from '../solve';
import { fromMinterms } from './helpers';

const WXYZ = ['w', 'x', 'y', 'z'];
const fn = fromMinterms(4, [0, 1, 2, 3, 7, 8, 10], [5, 6, 11, 15]);
const sop = solve(fn, 'sop');
const pos = solve(fn, 'pos');
const check = (text: string) => checkAnswer(fn, WXYZ, text, sop, pos);

describe('checkAnswer', () => {
  it('accepts a minimal SOP', () => {
    expect(check("x'z' + w'z")).toMatchObject({ status: 'correct', form: 'sop', minimal: true });
  });

  it('accepts a minimal POS', () => {
    expect(check("(x' + z)(w' + z')")).toMatchObject({ status: 'correct', form: 'pos', minimal: true });
  });

  it('flags a correct but non-minimal SOP and reports both costs', () => {
    expect(check("x'z' + w'z + w'x'")).toMatchObject({
      status: 'correct',
      form: 'sop',
      minimal: false,
      cost: { terms: 3, literals: 6 },
      minimum: { terms: 2, literals: 4 },
    });
  });

  it('catches the wrong tutorial answer and lists the wrong cells', () => {
    expect(check("(y' + z')(w' + z')")).toEqual({ status: 'wrong', extraOnes: [4, 12, 14], missingOnes: [3, 7] });
  });

  it('reports cells that should be 0', () => {
    const r = check("x'z' + w'z + w");
    expect(r.status).toBe('wrong');
    expect(r.status === 'wrong' && r.extraOnes).toEqual([9, 12, 13, 14]);
  });

  it('ignores don\'t-care cells', () => {
    // Differs from the minimum only at don't-cares 5 and 11.
    expect(check("x'z' + w'x' + w'yz").status).toBe('correct');
  });

  it('accepts equivalent answers that are neither SOP nor POS, without judging minimality', () => {
    expect(check("x'z' + w'(z)")).toMatchObject({ status: 'correct', minimal: true });
    expect(check("(x'z')' ' + w'z")).toMatchObject({ status: 'correct' });
    expect(check("w'z + (x + z)'")).toMatchObject({ status: 'correct', form: null, minimal: null });
  });

  it('passes parse errors through', () => {
    expect(check('w + ').status).toBe('error');
    expect(check('').status).toBe('empty');
  });
});

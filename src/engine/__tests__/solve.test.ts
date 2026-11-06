import { describe, expect, it } from 'vitest';
import { solutionToString } from '../format';
import { solutionCubes, solve, usedDontCares } from '../solve';
import { assertSound, fromMinterms } from './helpers';

const ABC = ['A', 'B', 'C'];
const ABCD = ['A', 'B', 'C', 'D'];
const WXYZ = ['w', 'x', 'y', 'z'];

function answers(fn: ReturnType<typeof fromMinterms>, names: string[], form: 'sop' | 'pos' = 'sop'): string[] {
  const r = solve(fn, form);
  assertSound(fn, r);
  return r.solutions.map((_, i) => solutionToString(solutionCubes(r, i), fn.n, names, form));
}

describe('solve: textbook examples', () => {
  it('finds both answers of the classic cyclic chart Σm(0,1,2,5,6,7)', () => {
    const fn = fromMinterms(3, [0, 1, 2, 5, 6, 7]);
    expect(answers(fn, ABC).sort()).toEqual(["A'B' + AC + BC'", "A'C' + AB + B'C"].sort());
    expect(solve(fn, 'sop').cost).toEqual({ terms: 3, literals: 6 });
  });

  it('Mano example 3-8: Σm(1,3,7,11,15) + d(0,2,5) has two minimal answers', () => {
    const fn = fromMinterms(4, [1, 3, 7, 11, 15], [0, 2, 5]);
    expect(answers(fn, WXYZ).sort()).toEqual(["w'x' + yz", "w'z + yz"].sort());
  });

  it('groups the four corners', () => {
    expect(answers(fromMinterms(4, [0, 2, 8, 10]), ABCD)).toEqual(["B'D'"]);
  });

  it('needs every minterm for 4-variable XOR (checkerboard)', () => {
    const odd = Array.from({ length: 16 }, (_, m) => m).filter((m) => m.toString(2).split('1').length % 2 === 0);
    const r = solve(fromMinterms(4, odd), 'sop');
    expect(r.cost).toEqual({ terms: 8, literals: 32 });
    expect(r.solutions).toHaveLength(1);
  });

  it('Mano example 3-7: SOP and POS of Σm(0,1,2,5,8,9,10)', () => {
    const fn = fromMinterms(4, [0, 1, 2, 5, 8, 9, 10]);
    expect(answers(fn, ABCD)).toEqual(["A'C'D + B'C' + B'D'"]);
    expect(answers(fn, ABCD, 'pos')).toEqual(["(A' + B')(B' + D)(C' + D')"]);
  });

  it('gets right the example a published tutorial got wrong', () => {
    // Tutorial answer was (y' + z')(w' + z'), which is 0 at minterms 3 and 7.
    const fn = fromMinterms(4, [0, 1, 2, 3, 7, 8, 10], [5, 6, 11, 15]);
    expect(answers(fn, WXYZ, 'pos')).toEqual(["(w' + z')(x' + z)"]);
    expect(answers(fn, WXYZ)).toEqual(["w'z + x'z'"]);
  });

  it('reports which don\'t-cares an answer uses', () => {
    const fn = fromMinterms(4, [1, 3, 7, 11, 15], [0, 2, 5]);
    const r = solve(fn, 'sop');
    const byAnswer = r.solutions.map((_, i) => [
      solutionToString(solutionCubes(r, i), 4, WXYZ, 'sop'),
      usedDontCares(r, i),
    ]);
    expect(byAnswer).toContainEqual(["w'x' + yz", [0, 2]]);
    expect(byAnswer).toContainEqual(["w'z + yz", [5]]);
  });
});

describe('solve: constants and edge cases', () => {
  it('no 1s gives SOP 0 and POS 0', () => {
    const fn = fromMinterms(3, []);
    expect(solve(fn, 'sop').constant).toBe(0);
    expect(answers(fn, ABC)).toEqual(['0']);
    expect(answers(fn, ABC, 'pos')).toEqual(['0']);
  });

  it('all 1s gives 1 both ways', () => {
    const fn = fromMinterms(3, [0, 1, 2, 3, 4, 5, 6, 7]);
    expect(answers(fn, ABC)).toEqual(['1']);
    expect(answers(fn, ABC, 'pos')).toEqual(['1']);
    expect(solve(fn, 'pos').constant).toBe(1);
  });

  it('all don\'t-cares: SOP is 0 and POS is 1 (both valid)', () => {
    const fn = fromMinterms(2, [], [0, 1, 2, 3]);
    expect(answers(fn, ['A', 'B'])).toEqual(['0']);
    expect(answers(fn, ['A', 'B'], 'pos')).toEqual(['1']);
  });

  it('1s plus don\'t-cares filling the map gives 1', () => {
    expect(answers(fromMinterms(2, [0], [1, 2, 3]), ['A', 'B'])).toEqual(['1']);
  });

  it('never uses a prime that covers only don\'t-cares', () => {
    const fn = fromMinterms(4, [0, 15], [5, 7, 13]);
    const r = solve(fn, 'sop');
    const dcOnly = r.primes.filter((p) => p.dontCareOnly).map((p) => r.primes.indexOf(p));
    for (const s of r.solutions) for (const i of dcOnly) expect(s).not.toContain(i);
  });

  it('handles a single minterm of 6 variables', () => {
    expect(answers(fromMinterms(6, [42]), ['A', 'B', 'C', 'D', 'E', 'F'])).toEqual(["AB'CD'EF'"]);
  });
});

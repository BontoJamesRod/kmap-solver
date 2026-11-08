import type { Form } from '../engine';

export interface Example {
  title: string;
  /** What gets typed into the composer. */
  input: string;
  n: number;
  names?: string[];
  form?: Form;
}

const odd4 = Array.from({ length: 16 }, (_, m) => m).filter((m) => m.toString(2).split('1').length % 2 === 0);

export const EXAMPLES: Example[] = [
  { title: 'Two equally minimal answers', input: 'Σm(1, 3, 7, 11, 15) + d(0, 2, 5)', n: 4, names: ['w', 'x', 'y', 'z'] },
  { title: 'Cyclic chart (Petrick)', input: 'Σm(0, 1, 2, 5, 6, 7)', n: 3 },
  { title: 'Four corners', input: 'Σm(0, 2, 8, 10)', n: 4 },
  { title: '7-segment, segment a', input: 'Σm(0, 2, 3, 5, 6, 7, 8, 9) + d(10-15)', n: 4 },
  { title: 'Product of sums', input: 'Σm(0, 1, 2, 5, 8, 9, 10)', n: 4, form: 'pos' },
  { title: 'XOR checkerboard', input: `Σm(${odd4.join(', ')})`, n: 4 },
  { title: '5 variables', input: 'Σm(0, 2, 4-8, 10, 13, 15, 16, 18, 21, 23, 24, 26, 29, 31) + d(1, 9)', n: 5 },
];

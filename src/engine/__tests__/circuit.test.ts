import { describe, expect, it } from 'vitest';
import { buildCircuit, type CircuitModel } from '../circuit';
import { solutionCubes, solve } from '../solve';
import { fromMinterms, randomFunction, rng } from './helpers';

const N = ['A', 'B', 'C', 'D', 'E', 'F'];
const aNotC = { value: 0b001, dashes: 0b010 }; // A'C
const ab = { value: 0b110, dashes: 0b001 }; // AB
const a = { value: 0b100, dashes: 0b011 }; // A

/** Every gate input pin must be the end point of exactly one wire. */
function assertWired(c: CircuitModel): void {
  const ends = c.wires.map((w) => w[w.length - 1]!);
  for (const g of c.gates) {
    for (const pin of g.inputs) {
      const hits = ends.filter((e) => Math.abs(e.x - pin.x) < 1e-9 && Math.abs(e.y - pin.y) < 1e-9);
      expect(hits.length, `${g.kind} pin at ${pin.x},${pin.y}`).toBe(1);
    }
  }
}

describe('buildCircuit', () => {
  it('builds AND-OR for SOP', () => {
    const c = buildCircuit([aNotC, ab], 3, N, 'sop', 'two-level');
    expect(c.gates.filter((g) => g.kind === 'and')).toHaveLength(2);
    expect(c.gates.filter((g) => g.kind === 'or')).toHaveLength(1);
    expect(c.counts).toEqual({ gates: 3, inverters: 1, gateInputs: 6 });
    assertWired(c);
  });

  it('builds NAND-NAND, feeding single-literal terms complemented', () => {
    // F = A + A'C... use A + AB-free example: F = A + B'C? Use cubes A and A'C.
    const c = buildCircuit([a, aNotC], 3, N, 'sop', 'universal');
    expect(c.gates.filter((g) => g.kind === 'nand')).toHaveLength(2);
    // A enters the output NAND as A', and A'C needs A' too: one inverter.
    expect(c.counts.inverters).toBe(1);
    assertWired(c);
  });

  it('builds OR-AND and NOR-NOR for POS', () => {
    const two = buildCircuit([aNotC, ab], 3, N, 'pos', 'two-level');
    expect(two.gates.filter((g) => g.kind === 'or')).toHaveLength(2);
    expect(two.gates.filter((g) => g.kind === 'and')).toHaveLength(1);
    const uni = buildCircuit([aNotC, ab], 3, N, 'pos', 'universal');
    expect(uni.gates.filter((g) => g.kind === 'nor')).toHaveLength(3);
  });

  it('skips the second level for a single term', () => {
    const c = buildCircuit([ab], 3, N, 'sop', 'two-level');
    expect(c.gates.filter((g) => g.kind !== 'not')).toHaveLength(1);
    // ...but NAND-NAND still needs an output NAND to undo the inversion.
    const u = buildCircuit([ab], 3, N, 'sop', 'universal');
    expect(u.gates.filter((g) => g.kind === 'nand')).toHaveLength(2);
  });

  it('returns a constant for 0 and 1', () => {
    expect(buildCircuit([], 3, N, 'sop', 'two-level').constant).toBe(0);
    expect(buildCircuit([{ value: 0, dashes: 7 }], 3, N, 'sop', 'two-level').constant).toBe(1);
    expect(buildCircuit([], 3, N, 'pos', 'two-level').constant).toBe(1);
  });

  it('wires every pin for random functions in every style', () => {
    const rand = rng(9);
    for (let i = 0; i < 150; i++) {
      const fn = i === 0 ? fromMinterms(6, [1, 2, 4, 7, 8, 11, 13, 14]) : randomFunction(2 + (i % 5), rand);
      for (const form of ['sop', 'pos'] as const) {
        const cubes = solutionCubes(solve(fn, form), 0);
        for (const style of ['two-level', 'universal'] as const) {
          const c = buildCircuit(cubes, fn.n, N, form, style);
          if (c.constant === null) assertWired(c);
          expect(c.width).toBeGreaterThan(0);
          expect(c.height).toBeGreaterThan(0);
        }
      }
    }
  });
});

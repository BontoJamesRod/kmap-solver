import { describe, expect, it } from 'vitest';
import { cubeMinterms, popcount } from '../cube';
import { cellMinterm, cubeRects, makeLayout, mintermPosition, type KMapLayout } from '../layout';
import { rng } from './helpers';

const layouts: [string, KMapLayout][] = [
  ['2', makeLayout(2)],
  ['3 wide', makeLayout(3, 'wide')],
  ['3 tall', makeLayout(3, 'tall')],
  ['4', makeLayout(4)],
  ['5', makeLayout(5)],
  ['6', makeLayout(6)],
];

function grid(l: KMapLayout, layer = 0): number[][] {
  return l.rowCodes.map((_, r) => l.colCodes.map((_, c) => cellMinterm(l, layer, r, c)));
}

describe('K-map layout', () => {
  it.each(layouts)('%s variables: every minterm appears exactly once and positions invert', (_, l) => {
    const seen = new Set<number>();
    l.layers.forEach((_, li) => {
      l.rowCodes.forEach((_, r) => {
        l.colCodes.forEach((_, c) => {
          const m = cellMinterm(l, li, r, c);
          expect(seen.has(m)).toBe(false);
          seen.add(m);
          expect(mintermPosition(l, m)).toEqual({ layer: li, row: r, col: c });
        });
      });
    });
    expect(seen.size).toBe(1 << l.n);
  });

  it.each(layouts)('%s variables: neighbours (with wrap-around and across layers) differ in one bit', (_, l) => {
    const R = l.rowCodes.length;
    const C = l.colCodes.length;
    l.layers.forEach((layer, li) => {
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          const m = cellMinterm(l, li, r, c);
          if (C > 1) expect(popcount(m ^ cellMinterm(l, li, r, (c + 1) % C))).toBe(1);
          if (R > 1) expect(popcount(m ^ cellMinterm(l, li, (r + 1) % R, c))).toBe(1);
          l.layers.forEach((other, lj) => {
            const gridDistance = Math.abs(layer.gridRow - other.gridRow) + Math.abs(layer.gridCol - other.gridCol);
            if (gridDistance === 1) expect(popcount(m ^ cellMinterm(l, lj, r, c))).toBe(1);
          });
        }
      }
    });
  });

  it('numbers a 4-variable map the textbook way', () => {
    expect(grid(makeLayout(4))).toEqual([
      [0, 1, 3, 2],
      [4, 5, 7, 6],
      [12, 13, 15, 14],
      [8, 9, 11, 10],
    ]);
  });

  it('supports both 3-variable layouts', () => {
    expect(grid(makeLayout(3, 'wide'))).toEqual([
      [0, 1, 3, 2],
      [4, 5, 7, 6],
    ]);
    expect(grid(makeLayout(3, 'tall'))).toEqual([
      [0, 1],
      [2, 3],
      [6, 7],
      [4, 5],
    ]);
  });

  it('draws the four corners as four open-edged pieces', () => {
    const rects = cubeRects(makeLayout(4), { value: 0b0000, dashes: 0b1010 }); // B'D'
    expect(rects).toHaveLength(4);
    const tl = rects.find((r) => r.row === 0 && r.col === 0)!;
    expect(tl.open).toEqual({ top: true, bottom: false, left: true, right: false });
    const br = rects.find((r) => r.row === 3 && r.col === 3)!;
    expect(br.open).toEqual({ top: false, bottom: true, left: false, right: true });
  });

  it('draws a whole-row group without open edges', () => {
    const [r] = cubeRects(makeLayout(4), { value: 0b0000, dashes: 0b0011 }); // A'B'
    expect(r).toMatchObject({ row: 0, col: 0, rowSpan: 1, colSpan: 4, open: { top: false, bottom: false, left: false, right: false } });
  });

  it('draws a 5-variable group on both layers when it spans them', () => {
    const rects = cubeRects(makeLayout(5), { value: 0b00001, dashes: 0b10110 }); // E with B=0? -> B'E
    expect(new Set(rects.map((r) => r.layer))).toEqual(new Set([0, 1]));
  });

  it.each(layouts)('%s variables: rectangles cover exactly the group\'s cells (random groups)', (_, l) => {
    const rand = rng(l.n * 10 + l.rowCodes.length);
    for (let i = 0; i < 300; i++) {
      const dashes = Math.floor(rand() * (1 << l.n));
      const value = Math.floor(rand() * (1 << l.n)) & ~dashes;
      const cells = new Set<number>();
      for (const rect of cubeRects(l, { value, dashes })) {
        for (let r = rect.row; r < rect.row + rect.rowSpan; r++) {
          for (let c = rect.col; c < rect.col + rect.colSpan; c++) cells.add(cellMinterm(l, rect.layer, r, c));
        }
      }
      expect([...cells].sort((a, b) => a - b)).toEqual(cubeMinterms({ value, dashes }));
    }
  });
});

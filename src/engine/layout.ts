import { grayCodes } from './cube';
import type { Cube } from './types';

/** 3-variable maps: 'wide' is A × BC (2 rows, 4 columns); 'tall' is AB × C (4 rows, 2 columns). */
export type ThreeVarLayout = 'wide' | 'tall';

export interface MapLayer {
  /** Values of the layer variables in variable order, e.g. 0b01 for A=0, B=1. */
  code: number;
  /** Position of this layer in the arrangement of layers. */
  gridRow: number;
  gridCol: number;
}

export interface KMapLayout {
  n: number;
  /** Variable indices assigned to layers, rows, and columns (each in significance order). */
  layerVars: number[];
  rowVars: number[];
  colVars: number[];
  rowCodes: number[];
  colCodes: number[];
  layers: MapLayer[];
  /** How the layers are arranged: 1×1, 1×2 (5 variables), or 2×2 (6 variables). */
  layerGridRows: number;
  layerGridCols: number;
}

export function makeLayout(n: number, three: ThreeVarLayout = 'wide'): KMapLayout {
  let layerVars: number[];
  let rowVars: number[];
  let colVars: number[];
  switch (n) {
    case 2:
      [layerVars, rowVars, colVars] = [[], [0], [1]];
      break;
    case 3:
      [layerVars, rowVars, colVars] = three === 'wide' ? [[], [0], [1, 2]] : [[], [0, 1], [2]];
      break;
    case 4:
      [layerVars, rowVars, colVars] = [[], [0, 1], [2, 3]];
      break;
    case 5:
      [layerVars, rowVars, colVars] = [[0], [1, 2], [3, 4]];
      break;
    case 6:
      [layerVars, rowVars, colVars] = [[0, 1], [2, 3], [4, 5]];
      break;
    default:
      throw new Error(`Unsupported variable count ${n}`);
  }

  // Layers in Gray order. For 6 variables, a 2×2 arrangement where neighbours differ by one bit:
  // 00 01
  // 10 11
  let layers: MapLayer[];
  let layerGridRows = 1;
  let layerGridCols = 1;
  if (layerVars.length === 0) layers = [{ code: 0, gridRow: 0, gridCol: 0 }];
  else if (layerVars.length === 1) {
    layers = [
      { code: 0, gridRow: 0, gridCol: 0 },
      { code: 1, gridRow: 0, gridCol: 1 },
    ];
    layerGridCols = 2;
  } else {
    layers = [
      { code: 0b00, gridRow: 0, gridCol: 0 },
      { code: 0b01, gridRow: 0, gridCol: 1 },
      { code: 0b10, gridRow: 1, gridCol: 0 },
      { code: 0b11, gridRow: 1, gridCol: 1 },
    ];
    layerGridRows = 2;
    layerGridCols = 2;
  }

  return {
    n,
    layerVars,
    rowVars,
    colVars,
    rowCodes: grayCodes(rowVars.length),
    colCodes: grayCodes(colVars.length),
    layers,
    layerGridRows,
    layerGridCols,
  };
}

/** Put the bits of `code` (MSB first) into the positions of `vars` within an n-bit minterm. */
function place(n: number, vars: number[], code: number): number {
  let m = 0;
  vars.forEach((v, k) => {
    const bit = (code >> (vars.length - 1 - k)) & 1;
    if (bit) m |= 1 << (n - 1 - v);
  });
  return m;
}

/** Read the bits of `vars` out of minterm m as a code (MSB first). */
function extract(n: number, vars: number[], m: number): number {
  let code = 0;
  for (const v of vars) code = (code << 1) | ((m >> (n - 1 - v)) & 1);
  return code;
}

export function cellMinterm(layout: KMapLayout, layer: number, row: number, col: number): number {
  const { n } = layout;
  return (
    place(n, layout.layerVars, layout.layers[layer]!.code) |
    place(n, layout.rowVars, layout.rowCodes[row]!) |
    place(n, layout.colVars, layout.colCodes[col]!)
  );
}

export function mintermPosition(layout: KMapLayout, m: number): { layer: number; row: number; col: number } {
  const { n } = layout;
  const layerCode = extract(n, layout.layerVars, m);
  return {
    layer: layout.layers.findIndex((l) => l.code === layerCode),
    row: layout.rowCodes.indexOf(extract(n, layout.rowVars, m)),
    col: layout.colCodes.indexOf(extract(n, layout.colVars, m)),
  };
}

/** Gray-code label for an axis position, e.g. "01". */
export function axisLabel(code: number, bits: number): string {
  return code.toString(2).padStart(bits, '0');
}

export interface GroupRect {
  layer: number;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  /** Sides left open because the group continues on the other edge of the map. */
  open: { top: boolean; bottom: boolean; left: boolean; right: boolean };
}

interface Run {
  start: number;
  length: number;
  openStart: boolean;
  openEnd: boolean;
}

/** Split sorted positions on a cyclic axis into contiguous runs, marking wrap-around edges. */
function runsOf(positions: number[], size: number): Run[] {
  const runs: Run[] = [];
  for (const p of positions) {
    const last = runs[runs.length - 1];
    if (last && last.start + last.length === p) last.length++;
    else runs.push({ start: p, length: 1, openStart: false, openEnd: false });
  }
  if (runs.length === 2) {
    // On a 4-long Gray axis the only split group is {first, last}: it wraps around the edge.
    const [first, last] = runs as [Run, Run];
    if (first.start === 0 && last.start + last.length === size) {
      first.openStart = true;
      last.openEnd = true;
    }
  }
  return runs;
}

function axisPositions(n: number, cube: Cube, vars: number[], codes: number[]): number[] {
  const out: number[] = [];
  codes.forEach((code, pos) => {
    const m = place(n, vars, code);
    const mask = place(n, vars, (1 << vars.length) - 1);
    // Compatible if every fixed variable on this axis matches.
    if (((m ^ cube.value) & mask & ~cube.dashes) === 0) out.push(pos);
  });
  return out;
}

/** Rectangles to draw for one group, on every layer the group touches. */
export function cubeRects(layout: KMapLayout, cube: Cube): GroupRect[] {
  const { n } = layout;
  const rows = runsOf(axisPositions(n, cube, layout.rowVars, layout.rowCodes), layout.rowCodes.length);
  const cols = runsOf(axisPositions(n, cube, layout.colVars, layout.colCodes), layout.colCodes.length);
  const layerMask = place(n, layout.layerVars, (1 << layout.layerVars.length) - 1);
  const rects: GroupRect[] = [];
  layout.layers.forEach((layer, li) => {
    const lm = place(n, layout.layerVars, layer.code);
    if (((lm ^ cube.value) & layerMask & ~cube.dashes) !== 0) return;
    for (const r of rows) {
      for (const c of cols) {
        rects.push({
          layer: li,
          row: r.start,
          col: c.start,
          rowSpan: r.length,
          colSpan: c.length,
          open: { top: r.openStart, bottom: r.openEnd, left: c.openStart, right: c.openEnd },
        });
      }
    }
  });
  return rects;
}

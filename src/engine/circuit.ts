import { cubeLiterals, termToString } from './format';
import { fullMask } from './cube';
import type { Cube, Form } from './types';

export type GateKind = 'and' | 'or' | 'nand' | 'nor' | 'not';

/** 'two-level' = AND-OR (SOP) or OR-AND (POS). 'universal' = NAND-NAND (SOP) or NOR-NOR (POS). */
export type CircuitStyle = 'two-level' | 'universal';

export interface Point {
  x: number;
  y: number;
}

export interface Gate {
  kind: GateKind;
  /** Bounding box of the body (excluding the output bubble). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** NOT gates on the input rails point down; everything else points right. */
  direction: 'right' | 'down';
  inputs: Point[];
  output: Point;
  /** Extra straight back line for gates with more inputs than fit on the body. */
  extend: { top: number; bottom: number } | null;
}

export interface Label {
  x: number;
  y: number;
  name: string;
  negated: boolean;
  anchor: 'start' | 'middle' | 'end';
  kind: 'input' | 'term' | 'output';
}

export interface CircuitModel {
  width: number;
  height: number;
  gates: Gate[];
  wires: Point[][];
  dots: Point[];
  labels: Label[];
  /** Set when the function is constant; nothing else is drawn. */
  constant: 0 | 1 | null;
  counts: { gates: number; inverters: number; gateInputs: number };
}

const RAIL_GAP = 26;
const PIN_GAP = 14;
const ITEM_GAP = 16;
const GATE_W = 48;
const BUBBLE = 4;
const TOP = 96;

/** Length of the curved back of an OR-type gate at height y. */
function orBackOffset(gate: { y: number; h: number }, y: number): number {
  if (y < gate.y || y > gate.y + gate.h) return 0;
  const t = (y - gate.y) / gate.h;
  return 2 * t * (1 - t) * (gate.h * 0.18);
}

function inputX(gate: Gate, y: number): number {
  return gate.kind === 'or' || gate.kind === 'nor' ? gate.x + orBackOffset(gate, y) : gate.x;
}

/**
 * Lay out a two-level circuit for a solution.
 * Coordinates are in SVG user units; the UI draws exactly what this returns.
 */
export function buildCircuit(cubes: Cube[], n: number, names: string[], form: Form, style: CircuitStyle): CircuitModel {
  const empty = { gates: [], wires: [], dots: [], labels: [], counts: { gates: 0, inverters: 0, gateInputs: 0 } };
  if (cubes.length === 0) return { ...empty, width: 240, height: 60, constant: form === 'sop' ? 0 : 1 };
  if (cubes.length === 1 && cubes[0]!.dashes === fullMask(n)) {
    return { ...empty, width: 240, height: 60, constant: form === 'sop' ? 1 : 0 };
  }

  const firstKind: GateKind =
    form === 'sop' ? (style === 'universal' ? 'nand' : 'and') : style === 'universal' ? 'nor' : 'or';
  const secondKind: GateKind = firstKind === 'and' ? 'or' : firstKind === 'or' ? 'and' : firstKind;

  const items = cubes.map((c) => ({
    literals: cubeLiterals(c, n, names, form).map((l) => ({ index: l.index, negated: l.negated })),
    text: termToString(c, n, names, form),
  }));

  const hasSecond = items.length >= 2 || (style === 'universal' && items[0]!.literals.length >= 2);
  // In NAND-NAND / NOR-NOR form, a single-literal term feeds the output gate complemented.
  if (style === 'universal' && hasSecond) {
    for (const it of items) if (it.literals.length === 1) it.literals[0]!.negated = !it.literals[0]!.negated;
  }

  // Which rails are needed.
  const usesTrue = new Set<number>();
  const usesComp = new Set<number>();
  for (const it of items) for (const l of it.literals) (l.negated ? usesComp : usesTrue).add(l.index);
  const used = [...new Set([...usesTrue, ...usesComp])].sort((a, b) => a - b);

  const railX = new Map<string, number>();
  let x = 24;
  for (const v of used) {
    railX.set(`${v}`, x);
    x += RAIL_GAP;
    if (usesComp.has(v)) {
      railX.set(`${v}'`, x);
      x += RAIL_GAP;
    }
  }
  const railsRight = x - RAIL_GAP;

  const gate1X = railsRight + 44;
  const gate2X = gate1X + GATE_W + BUBBLE * 2 + 84;

  const gates: Gate[] = [];
  const wires: Point[][] = [];
  const dots: Point[] = [];
  const labels: Label[] = [];
  const railEnd = new Map<string, number>();
  const railTaps: { key: string; y: number }[] = [];

  // First level.
  let y = TOP;
  const outputs: Point[] = [];
  let gateInputs = 0;
  for (const it of items) {
    const k = it.literals.length;
    if (k >= 2) {
      const h = Math.max(34, k * PIN_GAP + 8);
      const gate: Gate = {
        kind: firstKind,
        x: gate1X,
        y,
        w: GATE_W,
        h,
        direction: 'right',
        inputs: [],
        output: { x: 0, y: 0 },
        extend: null,
      };
      const yc = y + h / 2;
      it.literals.forEach((l, j) => {
        const py = yc - ((k - 1) * PIN_GAP) / 2 + j * PIN_GAP;
        const key = `${l.index}${l.negated ? "'" : ''}`;
        const rx = railX.get(key)!;
        const pin = { x: inputX(gate, py), y: py };
        gate.inputs.push(pin);
        wires.push([{ x: rx, y: py }, pin]);
        railTaps.push({ key, y: py });
        railEnd.set(key, Math.max(railEnd.get(key) ?? 0, py));
      });
      const bubble = firstKind === 'nand' || firstKind === 'nor' ? BUBBLE * 2 : 0;
      gate.output = { x: gate1X + GATE_W + bubble, y: yc };
      gates.push(gate);
      gateInputs += k;
      outputs.push(gate.output);
      labels.push({ x: gate.output.x + 8, y: yc - 6, name: it.text, negated: false, anchor: 'start', kind: 'term' });
      y += h + ITEM_GAP;
    } else {
      const l = it.literals[0]!;
      const key = `${l.index}${l.negated ? "'" : ''}`;
      const py = y + 10;
      outputs.push({ x: railX.get(key)!, y: py });
      railTaps.push({ key, y: py });
      railEnd.set(key, Math.max(railEnd.get(key) ?? 0, py));
      y += 20 + ITEM_GAP;
    }
  }
  const contentBottom = y - ITEM_GAP;

  // Second level.
  let outPoint: Point;
  if (hasSecond) {
    const ys = outputs.map((p) => p.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const h = Math.max(36, Math.min(items.length, 4) * PIN_GAP + 8);
    const mid = (minY + maxY) / 2;
    const gate: Gate = {
      kind: secondKind,
      x: gate2X,
      y: mid - h / 2,
      w: GATE_W,
      h,
      direction: 'right',
      inputs: [],
      output: { x: 0, y: mid },
      extend: null,
    };
    if (minY < gate.y || maxY > gate.y + gate.h) {
      gate.extend = { top: Math.min(minY, gate.y), bottom: Math.max(maxY, gate.y + gate.h) };
    }
    for (const p of outputs) {
      const pin = { x: inputX(gate, p.y), y: p.y };
      gate.inputs.push(pin);
      wires.push([p, pin]);
    }
    const bubble = secondKind === 'nand' || secondKind === 'nor' ? BUBBLE * 2 : 0;
    gate.output = { x: gate2X + GATE_W + bubble, y: mid };
    gates.push(gate);
    gateInputs += outputs.length;
    outPoint = gate.output;
  } else {
    outPoint = outputs[0]!;
  }

  const outEndX = Math.max(outPoint.x + 40, gate2X + GATE_W + 40);
  wires.push([outPoint, { x: outEndX, y: outPoint.y }]);
  labels.push({ x: outEndX + 6, y: outPoint.y + 5, name: 'F', negated: false, anchor: 'start', kind: 'output' });

  // Input rails, labels, and inverters.
  let inverters = 0;
  for (const v of used) {
    const tx = railX.get(`${v}`)!;
    labels.push({ x: tx, y: 16, name: names[v]!, negated: false, anchor: 'middle', kind: 'input' });
    const tapY = 30;
    const trueEnd = Math.max(railEnd.get(`${v}`) ?? 0, usesComp.has(v) ? tapY : 0);
    wires.push([{ x: tx, y: 22 }, { x: tx, y: trueEnd }]);
    if (usesComp.has(v)) {
      inverters++;
      const cx = railX.get(`${v}'`)!;
      wires.push([{ x: tx, y: tapY }, { x: cx, y: tapY }, { x: cx, y: 38 }]);
      if (trueEnd > tapY) dots.push({ x: tx, y: tapY });
      const inv: Gate = {
        kind: 'not',
        x: cx - 9,
        y: 38,
        w: 18,
        h: 20,
        direction: 'down',
        inputs: [{ x: cx, y: 38 }],
        output: { x: cx, y: 58 + BUBBLE * 2 },
        extend: null,
      };
      gates.push(inv);
      wires.push([inv.output, { x: cx, y: railEnd.get(`${v}'`)! }]);
    }
  }
  for (const t of railTaps) {
    if (t.y < (railEnd.get(t.key) ?? 0)) dots.push({ x: railX.get(t.key)!, y: t.y });
  }

  const width = outEndX + 30;
  const height = Math.max(contentBottom, ...gates.map((g) => (g.extend ? g.extend.bottom : g.y + g.h))) + 20;

  return {
    width,
    height,
    gates,
    wires,
    dots,
    labels,
    constant: null,
    counts: {
      gates: gates.filter((g) => g.kind !== 'not').length,
      inverters,
      gateInputs,
    },
  };
}

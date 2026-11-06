import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
  axisLabel,
  cellMinterm,
  coversMinterm,
  cubeRects,
  mintermPosition,
  mintermProduct,
  type BoolFunction,
  type CellValue,
  type Cube,
  type KMapLayout,
} from '../engine';
import { groupColor } from './groups';

interface Props {
  fn: BoolFunction;
  names: string[];
  layout: KMapLayout;
  groups: Cube[];
  /** Changes whenever the drawn answer changes, so the loops redraw. */
  groupsKey: string;
  active: number | null;
  onActivate: (index: number | null) => void;
  wrongCells: Set<number>;
  onCycle: (m: number) => void;
  onSet: (m: number, value: CellValue) => void;
}

const OPEN = 0.65; // how far an open-edged loop runs past the map edge (cell units)

export function KMap({ fn, names, layout, groups, groupsKey, active, onActivate, wrongCells, onCycle, onSet }: Props) {
  const rows = layout.rowCodes.length;
  const cols = layout.colCodes.length;
  const [focused, setFocused] = useState(0);
  const cellRefs = useRef(new Map<number, HTMLButtonElement>());

  const rectsByGroup = useMemo(() => groups.map((g) => cubeRects(layout, g)), [groups, layout]);
  const rowNames = layout.rowVars.map((v) => names[v]).join('');
  const colNames = layout.colVars.map((v) => names[v]).join('');
  const layered = layout.layers.length > 1;

  const moveFocus = (m: number) => {
    setFocused(m);
    cellRefs.current.get(m)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, m: number) => {
    const pos = mintermPosition(layout, m);
    const layer = layout.layers[pos.layer]!;
    let gr = layer.gridRow * rows + pos.row;
    let gc = layer.gridCol * cols + pos.col;
    const maxR = layout.layerGridRows * rows - 1;
    const maxC = layout.layerGridCols * cols - 1;
    switch (e.key) {
      case 'ArrowUp': gr = Math.max(0, gr - 1); break;
      case 'ArrowDown': gr = Math.min(maxR, gr + 1); break;
      case 'ArrowLeft': gc = Math.max(0, gc - 1); break;
      case 'ArrowRight': gc = Math.min(maxC, gc + 1); break;
      case '0': onSet(m, 0); e.preventDefault(); return;
      case '1': onSet(m, 1); e.preventDefault(); return;
      case 'x': case 'X': case 'd': case 'D': onSet(m, 'x'); e.preventDefault(); return;
      default: return;
    }
    e.preventDefault();
    const li = layout.layers.findIndex((l) => l.gridRow === Math.floor(gr / rows) && l.gridCol === Math.floor(gc / cols));
    moveFocus(cellMinterm(layout, li, gr % rows, gc % cols));
  };

  const firstGroupAt = (m: number) => {
    const i = groups.findIndex((g) => coversMinterm(g, m));
    return i >= 0 ? i : null;
  };

  return (
    <div
      className={`kmap n${fn.n}`}
      style={{ '--rows': rows, '--cols': cols, '--layer-cols': layout.layerGridCols } as CSSProperties}
      role="group"
      aria-label="Karnaugh map. Use the arrow keys to move between cells. Press 0, 1, or X to set a cell, or Space to cycle it."
    >
      {layout.layers.map((layer, li) => {
        const layerLabel = layout.layerVars.map((v) => names[v]).join('');
        return (
          <figure key={layer.code} className="layer" style={{ '--lr': layer.gridRow + 1, '--lc': layer.gridCol + 1 } as CSSProperties}>
            {layered && (
              <figcaption>
                {layerLabel} = {axisLabel(layer.code, layout.layerVars.length)}
              </figcaption>
            )}
            <div className="layer-grid">
              <div className="corner" aria-hidden="true">
                <span className="corner-cols">{colNames}</span>
                <span className="corner-rows">{rowNames}</span>
              </div>
              {layout.colCodes.map((code, c) => (
                <div key={`c${c}`} className="col-label" style={{ gridColumn: c + 2 }} aria-hidden="true">
                  {axisLabel(code, layout.colVars.length)}
                </div>
              ))}
              {layout.rowCodes.map((code, r) => (
                <div key={`r${r}`} className="row-label" style={{ gridRow: r + 2 }} aria-hidden="true">
                  {axisLabel(code, layout.rowVars.length)}
                </div>
              ))}
              <div className="cells">
                {layout.rowCodes.map((_, r) =>
                  layout.colCodes.map((_, c) => {
                    const m = cellMinterm(layout, li, r, c);
                    const v = fn.values[m]!;
                    const wrong = wrongCells.has(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        ref={(el) => {
                          if (el) cellRefs.current.set(m, el);
                          else cellRefs.current.delete(m);
                        }}
                        className={`cell v${v}${wrong ? ' wrong' : ''}`}
                        style={{ gridRow: r + 1, gridColumn: c + 1 }}
                        tabIndex={m === focused ? 0 : -1}
                        onClick={() => {
                          setFocused(m);
                          onCycle(m);
                        }}
                        onKeyDown={(e) => onKeyDown(e, m)}
                        onFocus={() => {
                          setFocused(m);
                          onActivate(firstGroupAt(m));
                        }}
                        onBlur={() => onActivate(null)}
                        onMouseEnter={() => onActivate(firstGroupAt(m))}
                        onMouseLeave={() => onActivate(null)}
                      >
                        <span className="m-no">{m}</span>{' '}
                        <span className="val">{v === 'x' ? 'X' : v}</span>
                        <span className="sr-only">
                          {v === 'x' ? " (don't-care)" : ''}, minterm {mintermProduct(m, fn.n, names)}
                          {wrong ? ', your answer is wrong here' : ''}
                        </span>
                      </button>
                    );
                  }),
                )}
                <svg
                  key={groupsKey}
                  className="loops"
                  viewBox={`0 0 ${cols} ${rows}`}
                  aria-hidden="true"
                  focusable="false"
                >
                  <defs>
                    <clipPath id={`clip-${li}`}>
                      <rect x="0" y="0" width={cols} height={rows} />
                    </clipPath>
                  </defs>
                  <g clipPath={`url(#clip-${li})`}>
                    {rectsByGroup.map((rects, gi) => {
                      const inset = 0.07 + 0.05 * (gi % 4);
                      const dim = active !== null && active !== gi;
                      return rects
                        .filter((r) => r.layer === li)
                        .map((r, k) => {
                          const x = r.col + inset - (r.open.left ? OPEN : 0);
                          const y = r.row + inset - (r.open.top ? OPEN : 0);
                          const w = r.colSpan - 2 * inset + (r.open.left ? OPEN : 0) + (r.open.right ? OPEN : 0);
                          const h = r.rowSpan - 2 * inset + (r.open.top ? OPEN : 0) + (r.open.bottom ? OPEN : 0);
                          return (
                            <rect
                              key={`${gi}-${k}`}
                              className={`loop${dim ? ' dim' : ''}${active === gi ? ' active' : ''}`}
                              x={x}
                              y={y}
                              width={w}
                              height={h}
                              rx={0.32}
                              pathLength={1}
                              style={{ '--group': groupColor(gi), animationDelay: `${Math.min(gi, 6) * 60}ms` } as CSSProperties}
                            />
                          );
                        });
                    })}
                  </g>
                  {rectsByGroup.map((rects, gi) => {
                    const first = rects.find((r) => r.layer === li);
                    if (!first) return null;
                    const inset = 0.07 + 0.05 * (gi % 4);
                    const cx = first.col + inset + 0.17;
                    const cy = first.row + first.rowSpan - inset - 0.17;
                    const dim = active !== null && active !== gi;
                    return (
                      <g key={`b${gi}`} className={`badge${dim ? ' dim' : ''}`} style={{ '--group': groupColor(gi) } as CSSProperties}>
                        <circle cx={cx} cy={cy} r={0.14} />
                        <text x={cx} y={cy}>{gi + 1}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </figure>
        );
      })}
    </div>
  );
}

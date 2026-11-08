import { useId, useMemo, useRef, useState } from 'react';
import { buildCircuit, type CircuitStyle, type Cube, type Form, type Gate } from '../engine';
import { IconDownload } from './icons';

interface Props {
  cubes: Cube[];
  n: number;
  names: string[];
  form: Form;
  defaultStyle: CircuitStyle;
}

function gatePath(g: Gate): string {
  const { x, y, w, h } = g;
  if (g.direction === 'down') return `M${x} ${y} H${x + w} L${x + w / 2} ${y + h} Z`;
  if (g.kind === 'and' || g.kind === 'nand') {
    return `M${x} ${y} H${x + w / 2} A${w / 2} ${h / 2} 0 0 1 ${x + w / 2} ${y + h} H${x} Z`;
  }
  const c = h * 0.18;
  return `M${x} ${y} Q${x + w * 0.62} ${y} ${x + w} ${y + h / 2} Q${x + w * 0.62} ${y + h} ${x} ${y + h} Q${x + c} ${y + h / 2} ${x} ${y} Z`;
}

const hasBubble = (g: Gate) => g.kind === 'nand' || g.kind === 'nor' || g.kind === 'not';

export function Circuit({ cubes, n, names, form, defaultStyle }: Props) {
  const id = useId();
  const [style, setStyle] = useState<CircuitStyle>(defaultStyle);
  const svgRef = useRef<SVGSVGElement>(null);
  const model = useMemo(() => buildCircuit(cubes, n, names, form, style), [cubes, n, names, form, style]);
  const styleNames: Record<CircuitStyle, string> = form === 'sop'
    ? { 'two-level': 'AND-OR', universal: 'NAND-NAND' }
    : { 'two-level': 'OR-AND', universal: 'NOR-NOR' };

  const download = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const css = getComputedStyle(svg);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('color', css.color);
    clone.setAttribute('font-family', 'Schibsted Grotesk, Inter, Arial, sans-serif');
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', getComputedStyle(document.body).backgroundColor);
    clone.insertBefore(bg, clone.firstChild);
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `circuit-${styleNames[style].toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const describe = model.constant !== null
    ? `F is the constant ${model.constant}: tie the output ${model.constant ? 'high' : 'low'}.`
    : `${model.counts.gates} ${model.counts.gates === 1 ? 'gate' : 'gates'} with ${model.counts.gateInputs} inputs in total${model.counts.inverters ? `, plus ${model.counts.inverters} ${model.counts.inverters === 1 ? 'inverter' : 'inverters'} for complemented inputs` : ''}.`;

  return (
    <div className="circuit">
      <div className="circuit-controls">
        <fieldset className="segmented small">
          <legend className="sr-only">Gate style</legend>
          {(['two-level', 'universal'] as const).map((s) => (
            <label key={s}>
              <input type="radio" name={`${id}-style`} checked={style === s} onChange={() => setStyle(s)} />
              <span>{styleNames[s]}</span>
            </label>
          ))}
        </fieldset>
        <button type="button" className="button secondary" onClick={download} disabled={model.constant !== null}>
          <IconDownload size={16} />
          Download SVG
        </button>
      </div>
      <p className="note">{describe}</p>
      {model.constant === null && (
        <div className="circuit-scroll">
          <svg
            ref={svgRef}
            className="circuit-svg"
            viewBox={`0 0 ${model.width} ${model.height}`}
            width={model.width * 1.3}
            height={model.height * 1.3}
            role="img"
            aria-label={`${styleNames[style]} circuit. ${describe}`}
          >
            <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
              {model.wires.map((w, i) => (
                <polyline key={i} points={w.map((p) => `${p.x},${p.y}`).join(' ')} />
              ))}
              {model.gates.map((g, i) => (
                <g key={i}>
                  {/* Extended input line above and below the body, never through its curved back. */}
                  {g.extend && g.extend.top < g.y && <line x1={g.x} y1={g.extend.top} x2={g.x} y2={g.y} />}
                  {g.extend && g.extend.bottom > g.y + g.h && (
                    <line x1={g.x} y1={g.y + g.h} x2={g.x} y2={g.extend.bottom} />
                  )}
                  <path d={gatePath(g)} className="gate-body" />
                  {hasBubble(g) &&
                    (g.direction === 'down' ? (
                      <circle cx={g.x + g.w / 2} cy={g.y + g.h + 4} r={4} className="gate-body" />
                    ) : (
                      <circle cx={g.x + g.w + 4} cy={g.y + g.h / 2} r={4} className="gate-body" />
                    ))}
                </g>
              ))}
            </g>
            <g fill="currentColor" stroke="none">
              {model.dots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={2.6} />
              ))}
              {model.labels.map((l, i) => (
                <text key={i} x={l.x} y={l.y} textAnchor={l.anchor} className={`clabel ${l.kind}`}>
                  {l.name}
                </text>
              ))}
            </g>
          </svg>
        </div>
      )}
    </div>
  );
}

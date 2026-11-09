import type { CSSProperties } from 'react';
import { cubeLiterals, type Cube, type Form } from '../engine';
import { groupColor } from './groups';

interface Props {
  cubes: Cube[];
  n: number;
  names: string[];
  form: Form;
  /** Group index being highlighted, if any. */
  active?: number | null;
  onActivate?: (index: number | null) => void;
  /** Show colored, numbered chips that link to the groups on the map. */
  linked?: boolean;
}

/** Spoken form for screen readers: "w prime x prime, plus, y z". */
export function spokenTerm(cube: Cube, n: number, names: string[], form: Form): string {
  const lits = cubeLiterals(cube, n, names, form).map((l) => (l.negated ? `${l.name} prime` : l.name));
  return form === 'sop' ? lits.join(' ') : lits.join(' or ');
}

function Literal({ name, negated }: { name: string; negated: boolean }) {
  return negated ? <span className="neg">{name}</span> : <span>{name}</span>;
}

/** Renders a solution with overbars for complements. */
export function Expression({ cubes, n, names, form, active = null, onActivate, linked = false }: Props) {
  const isConstant =
    cubes.length === 0 || (cubes.length === 1 && cubes[0]!.dashes === (1 << n) - 1);
  if (isConstant) {
    const value = cubes.length === 0 ? (form === 'sop' ? 0 : 1) : form === 'sop' ? 1 : 0;
    return <span className="expr">{value}</span>;
  }

  const spoken = cubes.map((c) => spokenTerm(c, n, names, form)).join(form === 'sop' ? ', plus, ' : ', and, ');
  return (
    <span className="expr" aria-label={spoken} role="img">
      {cubes.map((c, i) => {
        const lits = cubeLiterals(c, n, names, form);
        const body =
          form === 'sop' ? (
            lits.map((l) => <Literal key={l.index} name={l.name} negated={l.negated} />)
          ) : lits.length === 1 ? (
            <Literal name={lits[0]!.name} negated={lits[0]!.negated} />
          ) : (
            <>
              (
              {lits.map((l, k) => (
                <span key={l.index}>
                  {k > 0 && <span className="op"> + </span>}
                  <Literal name={l.name} negated={l.negated} />
                </span>
              ))}
              )
            </>
          );
        return (
          <span key={`${c.value}-${c.dashes}`} className="term-wrap" style={{ '--i': i } as CSSProperties}>
            {form === 'sop' && i > 0 && <span className="op"> + </span>}
            {linked ? (
              <span
                className={`term linked${active === i ? ' active' : ''}${active !== null && active !== i ? ' dim' : ''}`}
                style={{ '--group': groupColor(i) } as CSSProperties}
                onMouseEnter={() => onActivate?.(i)}
                onMouseLeave={() => onActivate?.(null)}
              >
                {body}
                <sub className="group-no" aria-hidden="true">
                  {i + 1}
                </sub>
              </span>
            ) : (
              <span className="term">{body}</span>
            )}
          </span>
        );
      })}
    </span>
  );
}

import { useId, useState } from 'react';
import { MAX_VARS, MIN_VARS, validateNames, type ThreeVarLayout } from '../engine';

interface Props {
  n: number;
  names: string[];
  layout3: ThreeVarLayout;
  onN: (n: number) => void;
  onNames: (names: string[]) => void;
  onLayout3: (l: ThreeVarLayout) => void;
}

export function VariableBar({ n, names, layout3, onN, onNames, onLayout3 }: Props) {
  const id = useId();
  const [draft, setDraft] = useState(names);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(names);

  // When the names change elsewhere (variable count, an expression), show them.
  if (names !== shown) {
    setShown(names);
    setDraft(names);
    setError(null);
  }

  const editName = (i: number, value: string) => {
    const next = draft.slice();
    next[i] = value.trim();
    setDraft(next);
    const problem = validateNames(next);
    setError(problem);
    if (!problem) onNames(next);
  };

  const counts = Array.from({ length: MAX_VARS - MIN_VARS + 1 }, (_, i) => i + MIN_VARS);

  return (
    <div className="variable-bar">
      <fieldset className="segmented">
        <legend>Variables</legend>
        {counts.map((k) => (
          <label key={k}>
            <input type="radio" name={`${id}-n`} checked={n === k} onChange={() => onN(k)} />
            <span>{k}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="names">
        <legend>Names</legend>
        {draft.map((nm, i) => (
          <input
            key={i}
            type="text"
            value={nm}
            maxLength={3}
            spellCheck={false}
            autoCapitalize="off"
            aria-label={`Name of variable ${i + 1}`}
            aria-invalid={error !== null}
            aria-describedby={error ? `${id}-err` : undefined}
            onChange={(e) => editName(i, e.target.value)}
          />
        ))}
      </fieldset>

      {n === 3 && (
        <fieldset className="segmented small">
          <legend>Layout</legend>
          {(['wide', 'tall'] as const).map((l) => (
            <label key={l}>
              <input type="radio" name={`${id}-l3`} checked={layout3 === l} onChange={() => onLayout3(l)} />
              <span>
                {l === 'wide' ? `${names[0]} × ${names[1]}${names[2]}` : `${names[0]}${names[1]} × ${names[2]}`}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {error && (
        <p id={`${id}-err`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

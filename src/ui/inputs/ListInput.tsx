import { useId, useState } from 'react';
import { formatList, functionFromLists, parseNumberList, type BoolFunction, type ListKind } from '../../engine';

interface Props {
  fn: BoolFunction;
  onChange: (fn: BoolFunction) => void;
}

function derive(fn: BoolFunction, kind: ListKind) {
  const terms: number[] = [];
  const dcs: number[] = [];
  fn.values.forEach((v, m) => {
    if (v === 'x') dcs.push(m);
    else if (v === (kind === 'minterms' ? 1 : 0)) terms.push(m);
  });
  return { terms: formatList(terms), dcs: formatList(dcs) };
}

function sameValues(a: BoolFunction, b: BoolFunction) {
  return a.n === b.n && a.values.every((v, i) => v === b.values[i]);
}

export function ListInput({ fn, onChange }: Props) {
  const id = useId();
  const [kind, setKind] = useState<ListKind>('minterms');
  const [draft, setDraft] = useState(() => derive(fn, 'minterms'));
  const [error, setError] = useState<string | null>(null);
  const size = 1 << fn.n;

  const [shown, setShown] = useState({ fn, kind });

  // When the map or table changes the function, show the new lists, unless the
  // current draft already describes exactly that function.
  if (shown.fn !== fn || shown.kind !== kind) {
    setShown({ fn, kind });
    const t = parseNumberList(draft.terms, size);
    const d = parseNumberList(draft.dcs, size);
    const built = t.ok && d.ok ? functionFromLists(fn.n, kind, t.values, d.values) : null;
    if (!(built?.ok && sameValues(built.fn, fn))) {
      setDraft(derive(fn, kind));
      setError(null);
    }
  }

  const update = (next: { terms: string; dcs: string }) => {
    setDraft(next);
    const t = parseNumberList(next.terms, size);
    if (!t.ok) return setError(t.error);
    const d = parseNumberList(next.dcs, size);
    if (!d.ok) return setError(d.error);
    const built = functionFromLists(fn.n, kind, t.values, d.values);
    if (!built.ok) return setError(built.error);
    setError(null);
    if (!sameValues(built.fn, fn)) onChange(built.fn);
  };

  return (
    <div className="list-input">
      <fieldset className="segmented small">
        <legend className="sr-only">List type</legend>
        {(['minterms', 'maxterms'] as const).map((k) => (
          <label key={k}>
            <input type="radio" name={`${id}-kind`} checked={kind === k} onChange={() => setKind(k)} />
            <span>{k === 'minterms' ? 'Minterms (the 1s), Σm' : 'Maxterms (the 0s), ΠM'}</span>
          </label>
        ))}
      </fieldset>
      <label className="field">
        <span>{kind === 'minterms' ? 'Minterms' : 'Maxterms'}</span>
        <input
          type="text"
          inputMode="numeric"
          spellCheck={false}
          value={draft.terms}
          placeholder="e.g. 1, 3, 5-7"
          aria-invalid={error !== null}
          aria-describedby={`${id}-help`}
          onChange={(e) => update({ ...draft, terms: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Don't-cares</span>
        <input
          type="text"
          inputMode="numeric"
          spellCheck={false}
          value={draft.dcs}
          placeholder="none"
          aria-describedby={`${id}-help`}
          onChange={(e) => update({ ...draft, dcs: e.target.value })}
        />
      </label>
      <p id={`${id}-help`} className={error ? 'field-error' : 'field-help'} role={error ? 'alert' : undefined}>
        {error ?? `Numbers from 0 to ${size - 1}, separated by commas or spaces. Ranges like 4-7 work too.`}
      </p>
    </div>
  );
}

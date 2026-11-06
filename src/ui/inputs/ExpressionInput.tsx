import { useId, useState } from 'react';
import {
  evaluateAll,
  MIN_VARS,
  parseExpression,
  type BoolFunction,
  type ParseError,
} from '../../engine';

interface Props {
  fn: BoolFunction;
  names: string[];
  onChange: (fn: BoolFunction, names: string[]) => void;
}

/** Shows the text with the error range underlined. */
export function ErrorText({ text, error }: { text: string; error: ParseError }) {
  const start = Math.min(error.start, text.length);
  const end = Math.max(start + 1, Math.min(error.end, text.length + 1));
  const shown = text + ' ';
  return (
    <code className="error-text" aria-hidden="true">
      {shown.slice(0, start)}
      <mark>{shown.slice(start, end)}</mark>
      {shown.slice(end)}
    </code>
  );
}

export function ExpressionInput({ fn, names, onChange }: Props) {
  const id = useId();
  const [text, setText] = useState('');
  const [error, setError] = useState<ParseError | null>(null);
  const [appliedTable, setAppliedTable] = useState<string | null>(null);

  const apply = (value: string) => {
    setText(value);
    if (value.trim() === '') {
      setError(null);
      return;
    }
    // Use the current variables if the expression only uses them; otherwise take the
    // expression's own variables (sorted), e.g. typing w'x + yz switches to w, x, y, z.
    let parsed = parseExpression(value, names);
    let useNames = names;
    if (!parsed.ok && /isn't one of this function's variables/.test(parsed.error.message)) {
      const inferred = parseExpression(value);
      if (inferred.ok) {
        if (inferred.names.length < MIN_VARS) {
          setError({ message: `K-maps need at least ${MIN_VARS} variables. Add another variable or change the variable names above.`, start: 0, end: value.length });
          return;
        }
        parsed = inferred;
        useNames = inferred.names;
      } else {
        parsed = inferred;
      }
    }
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    const n = useNames.length;
    const table = evaluateAll(parsed.expr, n);
    setAppliedTable(table.join(''));
    onChange({ n, values: table }, useNames);
  };

  const stale =
    text.trim() !== '' && !error && appliedTable !== null && appliedTable !== fn.values.join('');

  return (
    <div className="expression-input">
      <label className="field">
        <span>Expression</span>
        <input
          type="text"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          value={text}
          placeholder="e.g. A'B + AC'D + (B + D)'"
          aria-invalid={error !== null}
          aria-describedby={`${id}-help`}
          onChange={(e) => apply(e.target.value)}
        />
      </label>
      {error && <ErrorText text={text} error={error} />}
      <p id={`${id}-help`} className={error ? 'field-error' : 'field-help'} role={error ? 'alert' : undefined}>
        {error
          ? error.message
          : stale
            ? 'The map has been edited since, so it no longer matches this expression.'
            : "NOT: A' ~A !A. AND: AB A*B A&B. OR: A+B A|B. XOR: A^B. Parentheses work, including (A+B)'."}
      </p>
    </div>
  );
}

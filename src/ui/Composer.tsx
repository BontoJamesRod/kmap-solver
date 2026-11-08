import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  detectInputKind,
  MAX_VARS,
  MIN_VARS,
  parseFunctionInput,
  type BoolFunction,
  type InputMode,
  type ParseError,
} from '../engine';
import { ErrorText } from './ErrorText';
import { IconArrowUp } from './icons';

interface Props {
  fn: BoolFunction;
  names: string[];
  text: string;
  onText: (text: string) => void;
  onApply: (fn: BoolFunction, names: string[], text: string) => void;
  onN: (n: number) => void;
}

const KIND_LABEL = { expression: 'expression', minterms: 'minterm list', maxterms: 'maxterm list' } as const;

export function Composer({ fn, names, text, onText, onApply, onN }: Props) {
  const id = useId();
  const [mode, setMode] = useState<InputMode>('auto');
  const [error, setError] = useState<ParseError | null>(null);
  const [applied, setApplied] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const r = parseFunctionInput(text, mode, fn.n, names);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    setApplied(r.fn.values.join(''));
    onApply(r.fn, r.names, text);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const autoKind = text.trim() ? detectInputKind(text) : null;
  const stale = applied !== null && text.trim() !== '' && !error && applied !== fn.values.join('');

  return (
    <div className="composer-wrap">
      <form className={`composer${error ? ' has-error' : ''}`} onSubmit={submit} onClick={() => area.current?.focus()}>
        <label htmlFor={`${id}-input`} className="sr-only">
          Function
        </label>
        <textarea
          id={`${id}-input`}
          ref={area}
          rows={1}
          value={text}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          placeholder="Type an expression like A'B + AC, or minterms like Σm(1, 3, 7) + d(0, 2)"
          aria-invalid={error !== null}
          aria-describedby={`${id}-status`}
          onChange={(e) => {
            onText(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={onKeyDown}
        />
        <div className="composer-bar" onClick={(e) => e.stopPropagation()}>
          <label className="pill-select">
            <span className="sr-only">Number of variables</span>
            <select value={fn.n} onChange={(e) => onN(Number(e.target.value))}>
              {Array.from({ length: MAX_VARS - MIN_VARS + 1 }, (_, i) => i + MIN_VARS).map((k) => (
                <option key={k} value={k}>
                  {k} variables
                </option>
              ))}
            </select>
          </label>
          <label className="pill-select">
            <span className="sr-only">Input type</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as InputMode)}>
              <option value="auto">Auto-detect</option>
              <option value="expression">Expression</option>
              <option value="minterms">Minterms, Σm</option>
              <option value="maxterms">Maxterms, ΠM</option>
            </select>
          </label>
          {mode === 'auto' && autoKind && <span className="composer-hint">Reads as {KIND_LABEL[autoKind]}</span>}
          <button type="submit" className="send" disabled={text.trim() === ''} aria-label="Apply function">
            <IconArrowUp size={18} strokeWidth={2.2} />
          </button>
        </div>
      </form>
      <div id={`${id}-status`} className="composer-status" aria-live="polite">
        {error ? (
          <>
            <ErrorText text={text} error={error} />
            <p className="field-error" role="alert">
              {error.message}
            </p>
          </>
        ) : stale ? (
          <p className="field-help">The map has been edited since, so it no longer matches this input.</p>
        ) : null}
      </div>
    </div>
  );
}

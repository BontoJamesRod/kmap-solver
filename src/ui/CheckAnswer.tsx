import { useEffect, useId, useMemo, useState } from 'react';
import { checkAnswer, type BoolFunction, type Form, type SolveResult } from '../engine';
import { ErrorText } from './ErrorText';

interface Props {
  fn: BoolFunction;
  names: string[];
  results: Record<Form, SolveResult>;
  onWrongCells: (cells: Set<number>) => void;
}

const plural = (k: number, word: string) => `${k} ${word}${k === 1 ? '' : 's'}`;
const costText = (c: { terms: number; literals: number }) => `${plural(c.terms, 'term')} and ${plural(c.literals, 'literal')}`;

export function CheckAnswer({ fn, names, results, onWrongCells }: Props) {
  const id = useId();
  const [text, setText] = useState('');
  const check = useMemo(() => checkAnswer(fn, names, text, results.sop, results.pos), [fn, names, text, results]);

  useEffect(() => {
    onWrongCells(check.status === 'wrong' ? new Set([...check.extraOnes, ...check.missingOnes]) : new Set());
  }, [check, onWrongCells]);

  return (
    <section className="card check" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="card-title">Check your answer</h2>
      <label className="field">
        <span className="sr-only">Your answer</span>
        <input
          type="text"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          placeholder={`Type your answer, e.g. ${names[0]}'${names[1]} + ${names[0]}${names[names.length - 1]}`}
          value={text}
          aria-describedby={`${id}-verdict`}
          aria-invalid={check.status === 'wrong' || check.status === 'error'}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      {check.status === 'error' && <ErrorText text={text} error={check.error} />}
      <div
        id={`${id}-verdict`}
        className={`verdict ${check.status === 'correct' ? (check.minimal === false ? 'meh' : 'good') : check.status}`}
        aria-live="polite"
      >
        <div key={check.status === 'correct' ? `correct-${check.minimal}` : check.status} className="verdict-in">
        {check.status === 'empty' && <p className="field-help">Write it as SOP or POS to find out whether it's also minimal.</p>}
        {check.status === 'error' && <p>{check.error.message}</p>}
        {check.status === 'wrong' && (
          <>
            <p className="verdict-title">Not equivalent to F</p>
            <p>
              It's wrong at {plural(check.extraOnes.length + check.missingOnes.length, 'cell')}, marked with ! on the map.
              {check.missingOnes.length > 0 && ` It gives 0 where F is 1 at ${check.missingOnes.join(', ')}.`}
              {check.extraOnes.length > 0 && ` It gives 1 where F is 0 at ${check.extraOnes.join(', ')}.`}
            </p>
          </>
        )}
        {check.status === 'correct' && check.minimal === true && (
          <>
            <p className="verdict-title">Correct and minimal</p>
            <p>It matches F on every cell that isn't a don't-care, with the minimum {costText(check.cost!)}.</p>
          </>
        )}
        {check.status === 'correct' && check.minimal === false && (
          <>
            <p className="verdict-title">Correct, but not minimal</p>
            <p>
              Yours has {costText(check.cost!)}. The minimal {check.form === 'sop' ? 'sum of products' : 'product of sums'} has {costText(check.minimum!)}.
            </p>
          </>
        )}
        {check.status === 'correct' && check.minimal === null && (
          <>
            <p className="verdict-title">Correct</p>
            <p>It's equivalent to F. It isn't written as a plain sum of products or product of sums, so it can't be compared for minimality.</p>
          </>
        )}
        </div>
      </div>
    </section>
  );
}

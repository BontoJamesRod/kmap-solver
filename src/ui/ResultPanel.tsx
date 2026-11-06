import { useId } from 'react';
import {
  canonicalForms,
  MAX_SOLUTIONS,
  solutionCubes,
  solutionToString,
  toVerilog,
  usedDontCares,
  type BoolFunction,
  type Form,
  type SolveResult,
} from '../engine';
import { Expression } from './Expression';
import { useCopy } from './useCopy';

interface Props {
  fn: BoolFunction;
  names: string[];
  form: Form;
  result: SolveResult;
  solution: number;
  active: number | null;
  onActivate: (i: number | null) => void;
  onForm: (form: Form) => void;
  onSolution: (i: number) => void;
}

const plural = (k: number, word: string) => `${k} ${word}${k === 1 ? '' : 's'}`;

function listWords(xs: number[]): string {
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

export function ResultPanel({ fn, names, form, result, solution, active, onActivate, onForm, onSolution }: Props) {
  const id = useId();
  const { copied, copy } = useCopy();
  const cubes = solutionCubes(result, solution);
  const count = result.solutions.length;
  const used = usedDontCares(result, solution);
  const unused = result.dontCares.filter((m) => !used.includes(m));
  const canon = canonicalForms(fn);
  const groupedValue = form === 'sop' ? 1 : 0;

  const copyItems = [
    { key: 'text', label: 'Text', value: `F = ${solutionToString(cubes, fn.n, names, form)}` },
    { key: 'latex', label: 'LaTeX', value: `F = ${solutionToString(cubes, fn.n, names, form, 'latex')}` },
    { key: 'verilog', label: 'Verilog', value: toVerilog(cubes, fn.n, names, form) },
  ];

  return (
    <section className="result" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="sr-only">Minimal answer</h2>
      <fieldset className="segmented">
        <legend className="sr-only">Answer form</legend>
        {(['sop', 'pos'] as const).map((f) => (
          <label key={f}>
            <input type="radio" name={`${id}-form`} checked={form === f} onChange={() => onForm(f)} />
            <span>
              {f === 'sop' ? 'Sum of products' : 'Product of sums'}
              <small>{f === 'sop' ? 'groups the 1s' : 'groups the 0s'}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <p className={`answer${cubes.length > 12 ? ' very-long' : cubes.length > 5 ? ' long' : ''}`} aria-live="polite">
        <span className="answer-lhs">F =</span>{' '}
        <Expression cubes={cubes} n={fn.n} names={names} form={form} linked active={active} onActivate={onActivate} />
      </p>

      <div className="answer-meta">
        <span>
          {result.constant !== null
            ? `F is always ${result.constant} on the cells that matter.`
            : `${plural(result.cost.terms, 'term')}, ${plural(result.cost.literals, 'literal')}`}
        </span>
        {count > 1 && (
          <span className="picker">
            <button type="button" className="ghost" onClick={() => onSolution((solution - 1 + count) % count)} aria-label="Previous answer">
              Previous
            </button>
            <span aria-live="polite">
              Answer {solution + 1} of {count}
              {result.solutionsTruncated ? '+' : ''}
            </span>
            <button type="button" className="ghost" onClick={() => onSolution((solution + 1) % count)} aria-label="Next answer">
              Next
            </button>
          </span>
        )}
      </div>

      {count > 1 && (
        <p className="note">
          {result.solutionsTruncated
            ? `More than ${MAX_SOLUTIONS} answers are equally minimal. These are the first ${MAX_SOLUTIONS}.`
            : `${count} different answers are equally minimal. Any of them is correct.`}
        </p>
      )}
      {result.dontCares.length > 0 && result.constant === null && (
        <p className="note">
          {used.length === 0
            ? `Treats every don't-care as ${1 - groupedValue}.`
            : unused.length === 0
              ? `Treats every don't-care as ${groupedValue}.`
              : `Treats don't-care${used.length === 1 ? '' : 's'} ${listWords(used)} as ${groupedValue}, and ${listWords(unused)} as ${1 - groupedValue}.`}
        </p>
      )}
      {!result.proven && (
        <p className="note warn">This function was too hard to finish in time. The answer is correct but may not be minimal.</p>
      )}

      <div className="copy-row">
        <span className="copy-label">Copy as</span>
        {copyItems.map((it) => (
          <button key={it.key} type="button" className="chip-button" onClick={() => copy(it.key, it.value)}>
            {copied === it.key ? 'Copied' : copied === `${it.key}:failed` ? "Couldn't copy" : it.label}
          </button>
        ))}
      </div>

      <dl className="canonical">
        <div>
          <dt>Minterms</dt>
          <dd>{canon.sigma}</dd>
        </div>
        <div>
          <dt>Maxterms</dt>
          <dd>{canon.pi}</dd>
        </div>
      </dl>
    </section>
  );
}

import { useId, useState, type CSSProperties } from 'react';
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
import { useIndicator } from './motion';
import { RollingNumber } from './RollingNumber';
import { useToast } from './Toast';

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

function listWords(xs: number[]): string {
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

export function ResultPanel({ fn, names, form, result, solution, active, onActivate, onForm, onSolution }: Props) {
  const id = useId();
  const toast = useToast();
  const [dir, setDir] = useState<'next' | 'prev' | 'none'>('none');
  const formRef = useIndicator<HTMLFieldSetElement>('input:checked + span', form);
  const cubes = solutionCubes(result, solution);
  const count = result.solutions.length;
  const used = usedDontCares(result, solution);
  const unused = result.dontCares.filter((m) => !used.includes(m));
  const canon = canonicalForms(fn);
  const groupedValue = form === 'sop' ? 1 : 0;

  const answerText = solutionToString(cubes, fn.n, names, form);
  const copyItems = [
    { key: 'text', label: 'Text', value: `F = ${answerText}`, done: 'Copied the answer' },
    { key: 'latex', label: 'LaTeX', value: `F = ${solutionToString(cubes, fn.n, names, form, 'latex')}`, done: 'Copied as LaTeX' },
    { key: 'verilog', label: 'Verilog', value: toVerilog(cubes, fn.n, names, form), done: 'Copied as Verilog' },
  ];
  const copy = async (value: string, done: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(done);
    } catch {
      toast("Couldn't copy. The browser blocked the clipboard.");
    }
  };
  const step = (delta: 1 | -1) => {
    setDir(delta === 1 ? 'next' : 'prev');
    onSolution((solution + delta + count) % count);
  };

  return (
    <section className="result" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="sr-only">Minimal answer</h2>
      <fieldset className="segmented" ref={formRef}>
        <legend className="sr-only">Answer form</legend>
        {(['sop', 'pos'] as const).map((f) => (
          <label key={f}>
            <input
              type="radio"
              name={`${id}-form`}
              checked={form === f}
              onChange={() => {
                setDir('none');
                onForm(f);
              }}
            />
            <span>
              {f === 'sop' ? 'Sum of products' : 'Product of sums'}
              <small>{f === 'sop' ? 'groups the 1s' : 'groups the 0s'}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <p className={`answer${cubes.length > 12 ? ' very-long' : cubes.length > 5 ? ' long' : ''}`} aria-live="polite">
        <span className="answer-lhs">F =</span>{' '}
        <span key={`${form}:${answerText}`} className={`answer-anim from-${dir}`} style={{ '--terms': cubes.length } as CSSProperties}>
          <Expression cubes={cubes} n={fn.n} names={names} form={form} linked active={active} onActivate={onActivate} />
        </span>
      </p>

      <div className="answer-meta">
        <span>
          {result.constant !== null ? (
            `F is always ${result.constant} on the cells that matter.`
          ) : (
            <>
              <RollingNumber value={result.cost.terms} /> {result.cost.terms === 1 ? 'term' : 'terms'},{' '}
              <RollingNumber value={result.cost.literals} /> {result.cost.literals === 1 ? 'literal' : 'literals'}
            </>
          )}
        </span>
        {count > 1 && (
          <span className="picker">
            <button type="button" className="button secondary small" onClick={() => step(-1)} aria-label="Previous answer">
              Previous
            </button>
            <span aria-live="polite">
              Answer <RollingNumber value={solution + 1} /> of <RollingNumber value={count} />
              {result.solutionsTruncated ? '+' : ''}
            </span>
            <button type="button" className="button secondary small" onClick={() => step(1)} aria-label="Next answer">
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
          <button key={it.key} type="button" className="chip-button" onClick={() => copy(it.value, it.done)}>
            {it.label}
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

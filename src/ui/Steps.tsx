import { Fragment } from 'react';
import { cubeKey, cubePattern, type BoolFunction, type SolveResult } from '../engine';
import { Expression } from './Expression';

interface Props {
  fn: BoolFunction;
  names: string[];
  result: SolveResult;
}

const SIZE_NAMES = ['Single cells', 'Pairs', 'Groups of 4', 'Groups of 8', 'Groups of 16', 'Groups of 32', 'Groups of 64'];
const MAX_PRODUCTS_SHOWN = 24;
const plural = (k: number, word: string) => `${k} ${word}${k === 1 ? '' : 's'}`;
const MAX_ANSWERS_SHOWN = 8;

function Minterms({ list, dontCares }: { list: number[]; dontCares: Set<number> }) {
  return (
    <>
      {list.map((m, i) => (
        <Fragment key={m}>
          {i > 0 && ', '}
          {dontCares.has(m) ? <span className="dc" title="don't-care">d{m}</span> : m}
        </Fragment>
      ))}
    </>
  );
}

export function Steps({ fn, names, result }: Props) {
  const { form, primes } = result;
  const target = form === 'sop' ? '1s' : '0s';
  const dcSet = new Set(result.dontCares);
  const labelByKey = new Map(primes.map((p) => [cubeKey(p.cube), p.label]));
  const essentialSet = new Set(result.essentials.map((e) => e.prime));
  const reason = new Map<number, Set<number>>(result.essentials.map((e) => [e.prime, new Set(e.minterms)]));
  const coveredByEssentials = new Set(result.essentials.flatMap((e) => primes[e.prime]!.covers));
  const chartRows = primes.map((_, i) => i).filter((i) => !primes[i]!.dontCareOnly);
  const label = (i: number) => primes[i]!.label;

  if (result.required.length === 0) {
    return (
      <p className="steps-empty">
        F has no {target} to cover, so the {form === 'sop' ? 'sum of products is 0' : 'product of sums is 1'}. Nothing to simplify.
      </p>
    );
  }

  const totalEntries = result.qm.rounds.reduce((s, r) => s + r.groups.flat().length, 0);
  const p = result.petrick;

  return (
    <div className="steps">
      <p className="lede">
        The tabular (Quine-McCluskey) method, applied to the {target} of F
        {result.dontCares.length > 0 ? ". Don't-cares join the grouping but never have to be covered" : ''}.
        {form === 'pos' && ' Each group of 0s becomes a sum term: a variable that is 1 across the group appears complemented.'}
      </p>

      <ol className="step-list">
        <li>
          <details open={totalEntries <= 60}>
            <summary>
              <h3>Combine terms that differ in one bit</h3>
              <span className="summary-note">
                {result.qm.rounds.length} {result.qm.rounds.length === 1 ? 'round' : 'rounds'}, {totalEntries} entries
              </span>
            </summary>
            <p>
              List the {target}{result.dontCares.length > 0 ? ' and the don\'t-cares (shown as d)' : ''} by how many 1s they contain. Any two
              entries in neighbouring groups that differ in exactly one bit combine, with a dash in that bit. Combined
              entries get a check mark. Entries that never combine are the prime implicants, labeled P1, P2, and so on.
            </p>
            <div className="rounds">
              {result.qm.rounds.map((round, r) => (
                <table key={r} className="qm">
                  <caption>{SIZE_NAMES[r]}</caption>
                  <thead>
                    <tr>
                      <th scope="col">1s</th>
                      <th scope="col">Cells</th>
                      <th scope="col">Bits</th>
                      <th scope="col"><span className="sr-only">Result</span></th>
                    </tr>
                  </thead>
                  {round.groups.map((group, k) =>
                    group.length === 0 ? null : (
                      <tbody key={k}>
                        {group.map((e, j) => (
                          <tr key={cubeKey(e.cube)}>
                            {j === 0 && (
                              <th scope="rowgroup" rowSpan={group.length}>
                                {k}
                              </th>
                            )}
                            <td><Minterms list={e.minterms} dontCares={dcSet} /></td>
                            <td className="bits">{cubePattern(e.cube, fn.n)}</td>
                            <td className="mark">
                              {e.combined ? (
                                <span aria-label="combined">✓</span>
                              ) : (
                                <span className="prime-label">{labelByKey.get(cubeKey(e.cube))}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    ),
                  )}
                </table>
              ))}
            </div>
          </details>
        </li>

        <li>
          <details open>
            <summary>
              <h3>Prime implicants</h3>
              <span className="summary-note">{primes.length} found</span>
            </summary>
            <table className="primes">
              <thead>
                <tr>
                  <th scope="col">Label</th>
                  <th scope="col">Bits</th>
                  <th scope="col">Term</th>
                  <th scope="col">Covers</th>
                </tr>
              </thead>
              <tbody>
                {primes.map((pr) => (
                  <tr key={pr.label} className={pr.dontCareOnly ? 'muted' : ''}>
                    <th scope="row">{pr.label}</th>
                    <td className="bits">{cubePattern(pr.cube, fn.n)}</td>
                    <td><Expression cubes={[pr.cube]} n={fn.n} names={names} form={form} /></td>
                    <td>
                      <Minterms list={pr.minterms} dontCares={dcSet} />
                      {pr.dontCareOnly && <span className="tag">only don't-cares, never needed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </li>

        <li>
          <details open>
            <summary>
              <h3>Prime implicant chart</h3>
              <span className="summary-note">
                {result.essentials.length === 0 ? 'no essential prime implicants' : `${result.essentials.length} essential`}
              </span>
            </summary>
            <p>
              Each column is one of the {target} that must be covered. A prime implicant is essential when it is the only one
              covering some column; those cells are circled. Columns already covered by an essential prime implicant are shaded.
            </p>
            <div className="chart-wrap">
              <table className="chart">
                <thead>
                  <tr>
                    <th scope="col"><span className="sr-only">Prime implicant</span></th>
                    {result.required.map((m) => (
                      <th key={m} scope="col" className={coveredByEssentials.has(m) ? 'done' : ''}>{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartRows.map((i) => (
                    <tr key={i} className={essentialSet.has(i) ? 'essential' : ''}>
                      <th scope="row">
                        {label(i)}
                        {essentialSet.has(i) && <span className="tag">essential</span>}
                      </th>
                      {result.required.map((m) => {
                        const hit = primes[i]!.covers.includes(m);
                        const isReason = reason.get(i)?.has(m) ?? false;
                        return (
                          <td key={m} className={`${coveredByEssentials.has(m) ? 'done' : ''}${isReason ? ' reason' : ''}`}>
                            {hit ? (
                              <span aria-label={isReason ? 'covers, only cover' : 'covers'}>×</span>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.remainingMinterms.length === 0 ? (
              <p>The essential prime implicants cover every column, so they are the whole answer.</p>
            ) : (
              <p>
                Still uncovered: {result.remainingMinterms.join(', ')}. Choosing among {result.remainingPrimes.map(label).join(', ')} is
                next.
              </p>
            )}
          </details>
        </li>

        {p && (
          <li>
            <details open>
              <summary>
                <h3>Petrick's method</h3>
                <span className="summary-note">{p.truncated ? 'too many combinations to list' : `${p.products!.length} possible covers`}</span>
              </summary>
              <p>Every uncovered column needs at least one of the prime implicants that cover it:</p>
              <p className="formula">
                P ={' '}
                {p.factors.map((f) => (
                  <span key={f.minterm} className="factor" title={`column ${f.minterm}`}>
                    ({f.options.map((k) => label(p.primes[k]!)).join(' + ')})
                  </span>
                ))}
              </p>
              {p.truncated ? (
                <p>
                  Multiplying this out produces too many combinations to list here. The solver finds the cheapest covers directly with
                  an exact search instead, which gives the answers below.
                </p>
              ) : (
                <>
                  <p>Multiplying out and removing any product that contains another (X + XY = X) leaves:</p>
                  <p className="formula">
                    P ={' '}
                    {p.products!.slice(0, MAX_PRODUCTS_SHOWN).map((prod, k) => {
                      const isMin = p.minimal.some(
                        (mset) => mset.length === prod.length && prod.every((pos) => mset.includes(p.primes[pos]!)),
                      );
                      return (
                        <Fragment key={k}>
                          {k > 0 && ' + '}
                          <span className={isMin ? 'minimal' : ''}>{prod.map((pos) => label(p.primes[pos]!)).join('')}</span>
                        </Fragment>
                      );
                    })}
                    {p.products!.length > MAX_PRODUCTS_SHOWN && ` + ${p.products!.length - MAX_PRODUCTS_SHOWN} more`}
                  </p>
                  <p>
                    The highlighted products use the fewest prime implicants, then the fewest literals
                    {p.minimalCost
                      ? ` (${plural(p.minimalCost.terms, 'term')} and ${plural(p.minimalCost.literals, 'literal')}${result.essentials.length ? ', on top of the essential prime implicants' : ''})`
                      : ''}.
                  </p>
                </>
              )}
            </details>
          </li>
        )}

        <li>
          <details open>
            <summary>
              <h3>Minimal {form === 'sop' ? 'sum of products' : 'product of sums'}</h3>
              <span className="summary-note">
                {result.solutions.length === 1 ? 'one answer' : `${result.solutions.length}${result.solutionsTruncated ? '+' : ''} equally minimal answers`}
              </span>
            </summary>
            <ul className="answers">
              {result.solutions.slice(0, MAX_ANSWERS_SHOWN).map((sol, k) => (
                <li key={k}>
                  F = <Expression cubes={sol.map((i) => primes[i]!.cube)} n={fn.n} names={names} form={form} />
                  <span className="by-label"> ({sol.map(label).join(', ')})</span>
                </li>
              ))}
            </ul>
            {result.solutions.length > MAX_ANSWERS_SHOWN && (
              <p className="note">The rest can be stepped through with Previous and Next above the map.</p>
            )}
          </details>
        </li>
      </ol>
    </div>
  );
}

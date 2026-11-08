import { useId, useState } from 'react';
import type { BoolFunction, CellValue, Cube, Form, KMapLayout, SolveResult } from '../engine';
import { KMap } from './KMap';
import { ResultPanel } from './ResultPanel';
import { TruthTable } from './TruthTable';

interface Props {
  fn: BoolFunction;
  names: string[];
  layout: KMapLayout;
  form: Form;
  result: SolveResult;
  solution: number;
  cubes: Cube[];
  groupsKey: string;
  active: number | null;
  onActivate: (i: number | null) => void;
  wrongCells: Set<number>;
  onCycle: (m: number) => void;
  onSet: (m: number, v: CellValue) => void;
  onClear: () => void;
  onForm: (f: Form) => void;
  onSolution: (i: number) => void;
  showNumbers: boolean;
  animate: boolean;
}

export function ResultCard(p: Props) {
  const id = useId();
  const [view, setView] = useState<'map' | 'table'>('map');
  return (
    <section className="card result-card" aria-label="Map and answer">
      <div className="result-grid">
        <div className="map-pane">
          <div className="pane-head">
            <fieldset className="segmented small">
              <legend className="sr-only">View</legend>
              <label>
                <input type="radio" name={`${id}-view`} checked={view === 'map'} onChange={() => setView('map')} />
                <span>Map</span>
              </label>
              <label>
                <input type="radio" name={`${id}-view`} checked={view === 'table'} onChange={() => setView('table')} />
                <span>Truth table</span>
              </label>
            </fieldset>
            <button type="button" className="button ghost small" onClick={p.onClear}>
              Clear
            </button>
          </div>
          {view === 'map' ? (
            <div className="map-scroll">
              <KMap
                fn={p.fn}
                names={p.names}
                layout={p.layout}
                groups={p.cubes}
                groupsKey={p.groupsKey}
                active={p.active}
                onActivate={p.onActivate}
                wrongCells={p.wrongCells}
                onCycle={p.onCycle}
                onSet={p.onSet}
                showNumbers={p.showNumbers}
                animate={p.animate}
              />
            </div>
          ) : (
            <TruthTable fn={p.fn} names={p.names} onCycle={p.onCycle} onSet={p.onSet} />
          )}
          <p className="map-help">Click a cell to change it: 0, then 1, then X for don't-care.</p>
        </div>
        <div className="answer-pane">
          <ResultPanel
            fn={p.fn}
            names={p.names}
            form={p.form}
            result={p.result}
            solution={p.solution}
            active={p.active}
            onActivate={p.onActivate}
            onForm={p.onForm}
            onSolution={p.onSolution}
          />
        </div>
      </div>
    </section>
  );
}

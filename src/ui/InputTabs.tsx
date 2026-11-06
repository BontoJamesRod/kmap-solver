import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { BoolFunction, CellValue } from '../engine';
import { ExpressionInput } from './inputs/ExpressionInput';
import { ListInput } from './inputs/ListInput';
import { TruthTable } from './inputs/TruthTable';

type Tab = 'list' | 'table' | 'expr';
const TABS: { id: Tab; label: string }[] = [
  { id: 'list', label: 'Minterm list' },
  { id: 'expr', label: 'Expression' },
  { id: 'table', label: 'Truth table' },
];

interface Props {
  fn: BoolFunction;
  names: string[];
  onFunction: (fn: BoolFunction, names?: string[]) => void;
  onCycle: (m: number) => void;
  onSet: (m: number, value: CellValue) => void;
}

export function InputTabs({ fn, names, onFunction, onCycle, onSet }: Props) {
  const id = useId();
  const [tab, setTab] = useState<Tab>('list');
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({ list: null, table: null, expr: null });

  const onKeyDown = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let next: number;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    else return;
    e.preventDefault();
    const t = TABS[next]!.id;
    setTab(t);
    refs.current[t]?.focus();
  };

  return (
    <div className="input-tabs">
      <div role="tablist" aria-label="Other ways to enter the function" onKeyDown={onKeyDown}>
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-${t.id}-tab`}
            aria-selected={tab === t.id}
            aria-controls={`${id}-${t.id}-panel`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {TABS.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${id}-${t.id}-panel`}
          aria-labelledby={`${id}-${t.id}-tab`}
          hidden={tab !== t.id}
          className="tab-panel"
        >
          {tab === t.id && t.id === 'list' && <ListInput fn={fn} onChange={(f) => onFunction(f)} />}
          {tab === t.id && t.id === 'expr' && <ExpressionInput fn={fn} names={names} onChange={(f, nm) => onFunction(f, nm)} />}
          {tab === t.id && t.id === 'table' && <TruthTable fn={fn} names={names} onCycle={onCycle} onSet={onSet} />}
        </div>
      ))}
    </div>
  );
}

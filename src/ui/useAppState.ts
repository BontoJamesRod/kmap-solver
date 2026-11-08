import { useEffect, useMemo, useReducer } from 'react';
import {
  decodeState,
  defaultState,
  encodeState,
  namesFor,
  resizeFunction,
  solve,
  type AppState,
  type BoolFunction,
  type CellValue,
  type Form,
  type SolveResult,
  type ThreeVarLayout,
} from '../engine';

export type Action =
  | { type: 'setN'; n: number }
  | { type: 'setNames'; names: string[] }
  | { type: 'setLayout3'; layout: ThreeVarLayout }
  | { type: 'setForm'; form: Form }
  | { type: 'setSolution'; index: number }
  | { type: 'setFunction'; fn: BoolFunction; names?: string[] }
  | { type: 'cycleCell'; m: number }
  | { type: 'setCell'; m: number; value: CellValue }
  | { type: 'fill'; value: CellValue }
  | { type: 'load'; state: AppState }
  | { type: 'newFunction'; n: number; form: Form }
  | { type: 'reset' };

const NEXT: Record<string, CellValue> = { '0': 1, '1': 'x', x: 0 };

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'setN':
      if (a.n === s.fn.n) return s;
      return { ...s, fn: resizeFunction(s.fn, a.n), names: namesFor(s.names, a.n), solution: 0 };
    case 'setNames':
      return { ...s, names: a.names };
    case 'setLayout3':
      return { ...s, layout3: a.layout };
    case 'setForm':
      return { ...s, form: a.form, solution: 0 };
    case 'setSolution':
      return { ...s, solution: a.index };
    case 'setFunction':
      return { ...s, fn: a.fn, names: a.names ?? (a.fn.n === s.fn.n ? s.names : namesFor(s.names, a.fn.n)), solution: 0 };
    case 'cycleCell':
    case 'setCell': {
      const values = s.fn.values.slice();
      values[a.m] = a.type === 'cycleCell' ? NEXT[String(values[a.m])]! : a.value;
      return { ...s, fn: { ...s.fn, values }, solution: 0 };
    }
    case 'fill':
      return { ...s, fn: { ...s.fn, values: s.fn.values.map(() => a.value) }, solution: 0 };
    case 'load':
      return a.state;
    case 'newFunction':
      return {
        ...s,
        fn: { n: a.n, values: Array.from({ length: 1 << a.n }, () => 0 as CellValue) },
        names: namesFor(s.names, a.n),
        form: a.form,
        solution: 0,
      };
    case 'reset':
      return defaultState();
  }
}

const STORAGE_KEY = 'kmap-solver:last';

function initialState(): AppState {
  const fromHash = decodeState(window.location.hash);
  if (fromHash) return fromHash;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const fromStorage = saved ? decodeState(saved) : null;
    if (fromStorage) return fromStorage;
  } catch {
    // Storage can be unavailable (private mode, embedded frames); fall back to the example.
  }
  return defaultState();
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const results = useMemo(
    () => ({ sop: solve(state.fn, 'sop'), pos: solve(state.fn, 'pos') }) as Record<Form, SolveResult>,
    [state.fn],
  );

  // Keep the URL and the saved copy in step with what's on screen (FR-23, FR-24).
  useEffect(() => {
    const encoded = encodeState(state);
    window.history.replaceState(null, '', `#${encoded}`);
    try {
      localStorage.setItem(STORAGE_KEY, encoded);
    } catch {
      // Ignore storage errors; the URL still holds the state.
    }
  }, [state]);

  // Follow links pasted into the same tab.
  useEffect(() => {
    const onHash = () => {
      const next = decodeState(window.location.hash);
      if (next && encodeState(next) !== encodeState(state)) dispatch({ type: 'setFunction', fn: next.fn, names: next.names });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [state]);

  const result = results[state.form];
  const solution = Math.min(state.solution, result.solutions.length - 1);
  return { state, dispatch, results, result, solution };
}

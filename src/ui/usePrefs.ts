import { useCallback, useEffect, useState } from 'react';
import type { CircuitStyle, Form } from '../engine';

export type Theme = 'system' | 'light' | 'dark';

export interface Prefs {
  theme: Theme;
  animate: boolean;
  cellNumbers: boolean;
  circuitStyle: CircuitStyle;
  /** Variable count and answer form used by "New function". */
  newN: number;
  newForm: Form;
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  animate: true,
  cellNumbers: true,
  circuitStyle: 'two-level',
  newN: 4,
  newForm: 'sop',
};

const KEY = 'kmap-solver:prefs';

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      theme: p.theme === 'light' || p.theme === 'dark' ? p.theme : 'system',
      animate: typeof p.animate === 'boolean' ? p.animate : true,
      cellNumbers: typeof p.cellNumbers === 'boolean' ? p.cellNumbers : true,
      circuitStyle: p.circuitStyle === 'universal' ? 'universal' : 'two-level',
      newN: Number.isInteger(p.newN) && p.newN! >= 2 && p.newN! <= 6 ? p.newN! : 4,
      newForm: p.newForm === 'pos' ? 'pos' : 'sop',
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function usePrefs() {
  const [prefs, setPrefsState] = useState<Prefs>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      // Preferences just won't persist.
    }
    if (prefs.theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', prefs.theme);
  }, [prefs]);

  const setPrefs = useCallback((patch: Partial<Prefs>) => setPrefsState((p) => ({ ...p, ...patch })), []);
  const resetPrefs = useCallback(() => setPrefsState(DEFAULT_PREFS), []);
  return { prefs, setPrefs, resetPrefs };
}

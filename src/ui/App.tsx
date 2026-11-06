import { useCallback, useEffect, useMemo, useState } from 'react';
import { cubeKey, makeLayout, solutionCubes } from '../engine';
import { CheckAnswer } from './CheckAnswer';
import { Circuit } from './Circuit';
import { InputTabs } from './InputTabs';
import { KMap } from './KMap';
import { ResultPanel } from './ResultPanel';
import { Steps } from './Steps';
import { useAppState } from './useAppState';
import { useCopy } from './useCopy';
import { VariableBar } from './VariableBar';

type Theme = 'system' | 'light' | 'dark';
const THEME_KEY = 'kmap-solver:theme';
const REPO = 'https://github.com/BontoJamesRod/kmap-solver';

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const t = localStorage.getItem(THEME_KEY);
      return t === 'light' || t === 'dark' ? t : 'system';
    } catch {
      return 'system';
    }
  });
  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Not critical.
    }
  }, [theme]);
  return [theme, setTheme] as const;
}

export function App() {
  const { state, dispatch, results, result, solution } = useAppState();
  const [active, setActive] = useState<number | null>(null);
  const [wrongCells, setWrongCells] = useState<Set<number>>(() => new Set());
  const [theme, setTheme] = useTheme();
  const { copied, copy } = useCopy();
  const { fn, names, form } = state;

  const layout = useMemo(() => makeLayout(fn.n, state.layout3), [fn.n, state.layout3]);
  const cubes = useMemo(() => solutionCubes(result, solution), [result, solution]);
  const groupsKey = `${form}-${cubes.map(cubeKey).join('.')}`;

  const onCycle = useCallback((m: number) => dispatch({ type: 'cycleCell', m }), [dispatch]);
  const onSet = useCallback((m: number, value: 0 | 1 | 'x') => dispatch({ type: 'setCell', m, value }), [dispatch]);
  const onWrongCells = useCallback((cells: Set<number>) => setWrongCells(cells), []);

  const nextTheme: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };

  return (
    <div className="app">
      <a className="skip" href="#main">Skip to the map</a>
      <header className="masthead">
        <div>
          <h1>K-map solver</h1>
          <p className="tagline">
            Simplify a Boolean function of 2 to 6 variables. You get every minimal answer, the steps behind it, and a
            check for your own.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="ghost" onClick={() => copy('link', window.location.href)}>
            {copied === 'link' ? 'Link copied' : copied === 'link:failed' ? "Couldn't copy" : 'Copy link'}
          </button>
          <button type="button" className="ghost" onClick={() => setTheme(nextTheme[theme])}>
            Theme: {theme === 'system' ? 'auto' : theme}
          </button>
        </div>
      </header>

      <main id="main">
        <div className="workspace">
          <div className="map-col">
            <VariableBar
              n={fn.n}
              names={names}
              layout3={state.layout3}
              onN={(n) => dispatch({ type: 'setN', n })}
              onNames={(nm) => dispatch({ type: 'setNames', names: nm })}
              onLayout3={(l) => dispatch({ type: 'setLayout3', layout: l })}
            />
            <div className="sheet">
              <KMap
                fn={fn}
                names={names}
                layout={layout}
                groups={cubes}
                groupsKey={groupsKey}
                active={active}
                onActivate={setActive}
                wrongCells={wrongCells}
                onCycle={onCycle}
                onSet={onSet}
              />
            </div>
            <div className="map-actions">
              <p className="map-help">Click a cell to change it: 0, then 1, then X for don't-care.</p>
              <div className="map-buttons">
                <button type="button" className="ghost" onClick={() => dispatch({ type: 'fill', value: 0 })}>
                  Clear
                </button>
                <button type="button" className="ghost" onClick={() => dispatch({ type: 'reset' })}>
                  Load example
                </button>
              </div>
            </div>
          </div>

          <div className="answer-col">
            <ResultPanel
              fn={fn}
              names={names}
              form={form}
              result={result}
              solution={solution}
              active={active}
              onActivate={setActive}
              onForm={(f) => dispatch({ type: 'setForm', form: f })}
              onSolution={(i) => dispatch({ type: 'setSolution', index: i })}
            />
            <CheckAnswer fn={fn} names={names} results={results} onWrongCells={onWrongCells} />
          </div>

          <InputTabs
            fn={fn}
            names={names}
            onFunction={(f, nm) => dispatch({ type: 'setFunction', fn: f, names: nm })}
            onCycle={onCycle}
            onSet={onSet}
          />
        </div>

        <Steps fn={fn} names={names} result={result} />
        <Circuit cubes={cubes} n={fn.n} names={names} form={form} />
      </main>

      <footer className="footer">
        <p>
          Every answer is checked by automated tests against every possible function of up to 4 variables, and against an
          independent brute-force search for minimality.{' '}
          <a href={REPO}>Source code and test suite on GitHub</a>.
        </p>
        <p>Built by James Rod Bonto. Works offline once loaded; nothing you enter leaves your browser.</p>
      </footer>
    </div>
  );
}

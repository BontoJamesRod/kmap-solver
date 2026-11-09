import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  canonicalForms,
  cubeKey,
  decodeState,
  encodeState,
  functionSignature,
  makeLayout,
  parseFunctionInput,
  solutionCubes,
  solutionToString,
  type AppState,
} from '../engine';
import { Block } from './Block';
import { CheckAnswer } from './CheckAnswer';
import { Circuit } from './Circuit';
import { Composer } from './Composer';
import { EXAMPLES, type Example } from './examples';
import { ResultCard } from './ResultCard';
import { Settings } from './Settings';
import { Sidebar } from './Sidebar';
import { Steps } from './Steps';
import { TopBar } from './TopBar';
import { useAppState } from './useAppState';
import { useToast } from './Toast';
import { usePrefs } from './usePrefs';
import { newId, useRecents, type Recent } from './useRecents';

const NARROW = '(max-width: 899px)';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

export function App() {
  const { state, dispatch, results, result, solution } = useAppState();
  const { prefs, setPrefs, resetPrefs } = usePrefs();
  const { recents, upsert, remove, clear } = useRecents();
  const toast = useToast();
  const drawer = useMediaQuery(NARROW);

  const [active, setActive] = useState<number | null>(null);
  const [wrongCells, setWrongCells] = useState<Set<number>>(() => new Set());
  const [composerText, setComposerText] = useState('');
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [session, setSession] = useState(() => ({ id: newId(), start: encodeState(state) }));
  const settingsRef = useRef<HTMLDialogElement>(null);
  const sidebarToggle = useRef<HTMLDivElement>(null);

  const { fn, names, form } = state;
  const layout = useMemo(() => makeLayout(fn.n, state.layout3), [fn.n, state.layout3]);
  const cubes = useMemo(() => solutionCubes(result, solution), [result, solution]);
  const groupsKey = `${form}-${cubes.map(cubeKey).join('.')}`;
  const sidebarOpen = drawer ? drawerOpen : desktopOpen;

  const sopTitle = `F = ${solutionToString(solutionCubes(results.sop, 0), fn.n, names, 'sop')}`;

  // Save the current function to Recents once it differs from how the session started.
  useEffect(() => {
    const encoded = encodeState(state);
    if (encoded === session.start || fn.values.every((v) => v === 0)) return;
    const t = window.setTimeout(() => {
      upsert({ id: session.id, title: sopTitle, subtitle: `${fn.n} variables`, hash: encoded, updated: Date.now() });
    }, 500);
    return () => window.clearTimeout(t);
  }, [state, session, sopTitle, fn.n, fn.values, upsert]);

  const startSession = (next: AppState, id = newId()) => {
    dispatch({ type: 'load', state: next });
    setSession({ id, start: encodeState(next) });
    setWrongCells(new Set());
  };

  const onNew = () => {
    dispatch({ type: 'newFunction', n: prefs.newN, form: prefs.newForm });
    setComposerText('');
    setSession({ id: newId(), start: '' });
  };

  const onExample = (ex: Example) => {
    const exNames = ex.names ?? ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, ex.n);
    const r = parseFunctionInput(ex.input, 'auto', ex.n, exNames);
    if (!r.ok) return;
    startSession({ ...state, fn: r.fn, names: r.names, form: ex.form ?? 'sop', solution: 0 });
    setComposerText(ex.input);
  };

  const onRecent = (r: Recent) => {
    const decoded = decodeState(r.hash);
    if (!decoded) return;
    startSession(decoded, r.id);
    setComposerText('');
  };

  const openSettings = () => settingsRef.current?.showModal();
  const closeSettings = () => settingsRef.current?.close();

  const toggleSidebar = useCallback(() => {
    if (drawer) setDrawerOpen((o) => !o);
    else setDesktopOpen((o) => !o);
  }, [drawer]);
  const closeSidebar = useCallback(() => {
    if (drawer) {
      setDrawerOpen(false);
      sidebarToggle.current?.querySelector('button')?.focus();
    } else setDesktopOpen(false);
  }, [drawer]);

  const onCycle = useCallback((m: number) => dispatch({ type: 'cycleCell', m }), [dispatch]);
  const onSet = useCallback((m: number, value: 0 | 1 | 'x') => dispatch({ type: 'setCell', m, value }), [dispatch]);
  const onWrongCells = useCallback((cells: Set<number>) => setWrongCells(cells), []);

  const canon = canonicalForms(fn);
  const isEmpty = fn.values.every((v) => v === 0);

  return (
    <div className={`shell${sidebarOpen && !drawer ? ' with-sidebar' : ''}`}>
      <a className="skip" href="#main">Skip to the map</a>
      <Sidebar
        open={sidebarOpen}
        drawer={drawer}
        activeId={session.id}
        recents={recents}
        examples={EXAMPLES}
        onClose={closeSidebar}
        onNew={onNew}
        onExample={onExample}
        onRecent={onRecent}
        onRemoveRecent={(r) => {
          remove(r.id);
          toast('Removed from Recents');
        }}
        onSettings={openSettings}
      />

      <div className="main-area" inert={drawer && drawerOpen ? true : undefined}>
        <div ref={sidebarToggle}>
          <TopBar
            title={functionSignature(names)}
            subtitle={isEmpty ? 'New function' : canon.sigma}
            sidebarOpen={sidebarOpen}
            drawer={drawer}
            onToggleSidebar={toggleSidebar}
            onShare={() => {
              navigator.clipboard.writeText(window.location.href).then(
                () => toast('Link copied to clipboard'),
                () => toast("Couldn't copy. The browser blocked the clipboard."),
              );
            }}
            shareLabel="Share"
          />
        </div>

        <main id="main" className="content">
          <h1 className="greeting">What should we simplify?</h1>
          <Composer
            fn={fn}
            names={names}
            text={composerText}
            onText={setComposerText}
            onApply={(f, nm) => dispatch({ type: 'setFunction', fn: f, names: nm })}
            onN={(n) => dispatch({ type: 'setN', n })}
          />

          <ResultCard
            fn={fn}
            names={names}
            layout={layout}
            form={form}
            result={result}
            solution={solution}
            cubes={cubes}
            groupsKey={groupsKey}
            active={active}
            onActivate={setActive}
            wrongCells={wrongCells}
            onCycle={onCycle}
            onSet={onSet}
            onClear={() => dispatch({ type: 'fill', value: 0 })}
            onForm={(f) => dispatch({ type: 'setForm', form: f })}
            onSolution={(i) => dispatch({ type: 'setSolution', index: i })}
            showNumbers={prefs.cellNumbers}
            animate={prefs.animate}
          />

          <CheckAnswer fn={fn} names={names} results={results} onWrongCells={onWrongCells} />

          <Block
            title="How it's solved"
            summary={`Tabular method, ${result.primes.length} prime implicant${result.primes.length === 1 ? '' : 's'}`}
          >
            <Steps fn={fn} names={names} result={result} />
          </Block>

          <Block title="Circuit" summary={form === 'sop' ? 'Two-level, from the sum of products' : 'Two-level, from the product of sums'}>
            <Circuit key={prefs.circuitStyle} cubes={cubes} n={fn.n} names={names} form={form} defaultStyle={prefs.circuitStyle} />
          </Block>

          <footer className="footer">
            <p>
              Answers are checked by automated tests against every function of up to 4 variables.{' '}
              <a href="https://github.com/BontoJamesRod/kmap-solver">Source on GitHub</a>. Built by James Rod Bonto.
            </p>
          </footer>
        </main>
      </div>

      <Settings
        ref={settingsRef}
        prefs={prefs}
        onPrefs={setPrefs}
        onResetPrefs={() => {
          resetPrefs();
          toast('Settings reset');
        }}
        names={names}
        onNames={(nm) => dispatch({ type: 'setNames', names: nm })}
        layout3={state.layout3}
        onLayout3={(l) => dispatch({ type: 'setLayout3', layout: l })}
        recentCount={recents.length}
        onClearRecents={() => {
          clear();
          toast('Recents cleared');
        }}
        onClose={closeSettings}
      />
    </div>
  );
}

import { forwardRef, useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { MAX_VARS, MIN_VARS, validateNames, type CircuitStyle, type Form, type ThreeVarLayout } from '../engine';
import { IconX } from './icons';
import { useIndicator, withViewTransition } from './motion';
import type { Prefs, Theme } from './usePrefs';

type Section = 'general' | 'appearance' | 'circuit' | 'data' | 'about';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'circuit', label: 'Circuit' },
  { id: 'data', label: 'Data' },
  { id: 'about', label: 'About' },
];

interface Props {
  prefs: Prefs;
  onPrefs: (patch: Partial<Prefs>) => void;
  onResetPrefs: () => void;
  names: string[];
  onNames: (names: string[]) => void;
  layout3: ThreeVarLayout;
  onLayout3: (l: ThreeVarLayout) => void;
  recentCount: number;
  onClearRecents: () => void;
  onClose: () => void;
}

function Row({ title, description, htmlFor, children }: { title: string; description?: ReactNode; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="setting-row">
      <div className="setting-text">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="setting-title">{title}</label>
        ) : (
          <span className="setting-title">{title}</span>
        )}
        {description && <p className="setting-desc">{description}</p>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
      <span className="switch-knob" />
    </button>
  );
}

function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <span className={`theme-preview ${theme}`} aria-hidden="true">
      <span className="tp-side" />
      <span className="tp-main">
        <span className="tp-line" />
        <span className="tp-line short" />
        <span className="tp-box" />
      </span>
    </span>
  );
}

function NamesEditor({ names, onNames }: { names: string[]; onNames: (n: string[]) => void }) {
  const [draft, setDraft] = useState(names);
  const [shown, setShown] = useState(names);
  const [error, setError] = useState<string | null>(null);
  if (names !== shown) {
    setShown(names);
    setDraft(names);
    setError(null);
  }
  return (
    <div className="names-editor">
      <div className="names-inputs">
        {draft.map((nm, i) => (
          <input
            key={i}
            type="text"
            value={nm}
            maxLength={3}
            spellCheck={false}
            autoCapitalize="off"
            aria-label={`Name of variable ${i + 1}`}
            aria-invalid={error !== null}
            onChange={(e) => {
              const next = draft.slice();
              next[i] = e.target.value.trim();
              setDraft(next);
              const problem = validateNames(next);
              setError(problem);
              if (!problem) onNames(next);
            }}
          />
        ))}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const Settings = forwardRef<HTMLDialogElement, Props>(function Settings(props, ref) {
  const { prefs, onPrefs, onResetPrefs, names, onNames, layout3, onLayout3, recentCount, onClearRecents, onClose } = props;
  const id = useId();
  const [section, setSection] = useState<Section>('general');
  const [confirmClear, setConfirmClear] = useState(false);
  const navRef = useIndicator<HTMLDivElement>('[aria-selected="true"]', section);

  const pickTheme = (t: Theme, el: HTMLElement | null) => {
    if (t === prefs.theme) return;
    const r = el?.getBoundingClientRect();
    withViewTransition(() => onPrefs({ theme: t }), r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined);
  };

  const onTabKey = (e: KeyboardEvent) => {
    const i = SECTIONS.findIndex((s) => s.id === section);
    let next: number;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % SECTIONS.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + SECTIONS.length) % SECTIONS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = SECTIONS.length - 1;
    else return;
    e.preventDefault();
    setSection(SECTIONS[next]!.id);
    document.getElementById(`${id}-tab-${SECTIONS[next]!.id}`)?.focus();
  };

  return (
    <dialog
      ref={ref}
      className="settings"
      aria-labelledby={`${id}-title`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onClose={() => setConfirmClear(false)}
    >
      <div className="settings-shell">
        <header className="settings-head">
          <h2 id={`${id}-title`}>Settings</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close settings">
            <IconX />
          </button>
        </header>
        <div className="settings-body">
          <div ref={navRef} role="tablist" aria-label="Settings sections" aria-orientation="vertical" className="settings-nav" onKeyDown={onTabKey}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                id={`${id}-tab-${s.id}`}
                type="button"
                role="tab"
                aria-selected={section === s.id}
                aria-controls={`${id}-panel`}
                tabIndex={section === s.id ? 0 : -1}
                onClick={() => setSection(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${section}`} className="settings-panel" tabIndex={0}>
            <div key={section} className="panel-in">
            {section === 'general' && (
              <>
                <h3>General</h3>
                <Row title="Variable names" description="One letter, optionally followed by digits. Mano uses w, x, y, z; Floyd uses A, B, C, D.">
                  <NamesEditor names={names} onNames={onNames} />
                </Row>
                <Row title="3-variable map layout" htmlFor={`${id}-layout`} description="Match the layout your textbook uses.">
                  <select id={`${id}-layout`} className="select" value={layout3} onChange={(e) => onLayout3(e.target.value as ThreeVarLayout)}>
                    <option value="wide">A × BC, 2 rows by 4 columns</option>
                    <option value="tall">AB × C, 4 rows by 2 columns</option>
                  </select>
                </Row>
                <Row title="New functions start with" htmlFor={`${id}-newn`}>
                  <select id={`${id}-newn`} className="select" value={prefs.newN} onChange={(e) => onPrefs({ newN: Number(e.target.value) })}>
                    {Array.from({ length: MAX_VARS - MIN_VARS + 1 }, (_, i) => i + MIN_VARS).map((k) => (
                      <option key={k} value={k}>
                        {k} variables
                      </option>
                    ))}
                  </select>
                </Row>
                <Row title="Show answers first as" htmlFor={`${id}-form`} description="Used for new functions. You can still switch on any answer.">
                  <select id={`${id}-form`} className="select" value={prefs.newForm} onChange={(e) => onPrefs({ newForm: e.target.value as Form })}>
                    <option value="sop">Sum of products</option>
                    <option value="pos">Product of sums</option>
                  </select>
                </Row>
              </>
            )}

            {section === 'appearance' && (
              <>
                <h3>Appearance</h3>
                <fieldset className="theme-picker">
                  <legend className="setting-title">Theme</legend>
                  <div className="theme-options">
                    {(['light', 'system', 'dark'] as const).map((t) => (
                      <label key={t} className="theme-option">
                        <input
                          type="radio"
                          name={`${id}-theme`}
                          checked={prefs.theme === t}
                          onChange={(e) => pickTheme(t, e.currentTarget.parentElement?.querySelector('.theme-preview') ?? null)}
                        />
                        <ThemePreview theme={t} />
                        <span>{t === 'system' ? 'Match system' : t === 'light' ? 'Light' : 'Dark'}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Row title="Animations" description="Cells pop, groups draw in, counts roll, and panels slide. Always off if your system asks for reduced motion.">
                  <Switch checked={prefs.animate} onChange={(v) => onPrefs({ animate: v })} label="Animations" />
                </Row>
                <Row title="Show cell numbers" description="The small minterm number in the corner of each cell.">
                  <Switch checked={prefs.cellNumbers} onChange={(v) => onPrefs({ cellNumbers: v })} label="Show cell numbers" />
                </Row>
              </>
            )}

            {section === 'circuit' && (
              <>
                <h3>Circuit</h3>
                <Row title="Default gate style" htmlFor={`${id}-gates`} description="Universal gates are NAND-NAND for a sum of products and NOR-NOR for a product of sums.">
                  <select id={`${id}-gates`} className="select" value={prefs.circuitStyle} onChange={(e) => onPrefs({ circuitStyle: e.target.value as CircuitStyle })}>
                    <option value="two-level">AND-OR / OR-AND</option>
                    <option value="universal">NAND-NAND / NOR-NOR</option>
                  </select>
                </Row>
              </>
            )}

            {section === 'data' && (
              <>
                <h3>Data</h3>
                <p className="setting-desc block">Everything stays in this browser. Nothing is sent anywhere.</p>
                <Row title="Recents" description={`${recentCount} saved ${recentCount === 1 ? 'function' : 'functions'}.`}>
                  {confirmClear ? (
                    <span className="confirm">
                      <button type="button" className="button danger" onClick={() => { onClearRecents(); setConfirmClear(false); }}>
                        Clear all
                      </button>
                      <button type="button" className="button secondary" onClick={() => setConfirmClear(false)}>
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="button secondary" disabled={recentCount === 0} onClick={() => setConfirmClear(true)}>
                      Clear recents
                    </button>
                  )}
                </Row>
                <Row title="Reset settings" description="Theme, display, and defaults go back to how they started. Recents are kept.">
                  <button type="button" className="button secondary" onClick={onResetPrefs}>
                    Reset
                  </button>
                </Row>
              </>
            )}

            {section === 'about' && (
              <>
                <h3>About</h3>
                <div className="about">
                  <p>
                    K-map solver 1.1 finds every minimal sum of products and product of sums for functions of 2 to 6 variables,
                    and shows the tabular method step by step.
                  </p>
                  <p>
                    Its answers are checked by automated tests against every function of up to 4 variables, and against an
                    independent brute-force search for minimality.
                  </p>
                  <p>
                    Built by James Rod Bonto.{' '}
                    <a href="https://github.com/BontoJamesRod/kmap-solver">Source code and tests on GitHub</a>.
                  </p>
                </div>
              </>
            )}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
});

import { useEffect, useRef } from 'react';
import type { Example } from './examples';
import { IconPlus, IconSettings, IconSidebar, IconX, Logo } from './icons';
import type { Recent } from './useRecents';

interface Props {
  open: boolean;
  drawer: boolean;
  activeId: string;
  recents: Recent[];
  examples: Example[];
  onClose: () => void;
  onNew: () => void;
  onExample: (e: Example) => void;
  onRecent: (r: Recent) => void;
  onRemoveRecent: (r: Recent) => void;
  onSettings: () => void;
}

export function Sidebar({ open, drawer, activeId, recents, examples, onClose, onNew, onExample, onRecent, onRemoveRecent, onSettings }: Props) {
  const firstButton = useRef<HTMLButtonElement>(null);

  // Drawer behaviour on small screens: focus inside on open, Esc closes.
  useEffect(() => {
    if (!drawer || !open) return;
    firstButton.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer, open, onClose]);

  const pick = <T,>(fn: (x: T) => void) => (x: T) => {
    fn(x);
    if (drawer) onClose();
  };

  return (
    <>
      {drawer && open && <div className="scrim" onClick={onClose} aria-hidden="true" />}
      <aside
        id="sidebar"
        className={`sidebar${open ? ' open' : ''}${drawer ? ' drawer' : ''}`}
        aria-label="Sidebar"
        hidden={!open}
      >
        <div className="sidebar-top">
          <span className="brand">
            <Logo />
            <span>K-map solver</span>
          </span>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close sidebar">
            {drawer ? <IconX /> : <IconSidebar />}
          </button>
        </div>

        <button ref={firstButton} type="button" className="new-function" onClick={pick(onNew)}>
          <span className="new-icon"><IconPlus size={16} strokeWidth={2} /></span>
          New function
        </button>

        <div className="sidebar-scroll">
          <nav aria-labelledby="examples-heading">
            <h2 id="examples-heading" className="side-heading">Examples</h2>
            <ul className="side-list">
              {examples.map((ex) => (
                <li key={ex.title}>
                  <button type="button" className="side-item" onClick={() => pick(onExample)(ex)}>
                    {ex.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="recents-heading">
            <h2 id="recents-heading" className="side-heading">Recents</h2>
            {recents.length === 0 ? (
              <p className="side-empty">Functions you work on are saved here.</p>
            ) : (
              <ul className="side-list">
                {recents.map((r) => (
                  <li key={r.id} className={`recent${r.id === activeId ? ' current' : ''}`}>
                    <button
                      type="button"
                      className="side-item"
                      aria-current={r.id === activeId ? 'page' : undefined}
                      onClick={() => pick(onRecent)(r)}
                    >
                      <span className="recent-title">{r.title}</span>
                      <span className="recent-sub">{r.subtitle}</span>
                    </button>
                    <button type="button" className="recent-remove" aria-label={`Remove ${r.title} from recents`} onClick={() => onRemoveRecent(r)}>
                      <IconX size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <button type="button" className="side-item settings-button" onClick={pick(onSettings)}>
            <IconSettings />
            Settings
          </button>
        </div>
      </aside>
    </>
  );
}

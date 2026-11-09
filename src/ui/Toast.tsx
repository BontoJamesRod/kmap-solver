import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { IconCheck } from './icons';

type Show = (message: string) => void;
const ToastContext = createContext<Show>(() => {});

export function useToast(): Show {
  return useContext(ToastContext);
}

interface Toast {
  id: number;
  message: string;
  leaving: boolean;
}

/** Bottom-centre confirmations that slide up and dismiss themselves, like X's toasts. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const next = useRef(0);
  const layer = useRef<HTMLDivElement>(null);

  const show = useCallback<Show>((message) => {
    const id = next.current++;
    setAnnouncement(message);
    setToasts((list) => [...list.slice(-2), { id, message, leaving: false }]);
    window.setTimeout(() => setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t))), 2400);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 2700);
  }, []);

  const lastId = toasts[toasts.length - 1]?.id;
  // Toasts live in the top layer (a manual popover) so they also show above the Settings dialog.
  useEffect(() => {
    const el = layer.current as (HTMLDivElement & { showPopover?: () => void; hidePopover?: () => void }) | null;
    if (!el?.showPopover) return;
    try {
      if (toasts.length > 0) {
        if (el.matches(':popover-open')) el.hidePopover!();
        el.showPopover();
      } else if (el.matches(':popover-open')) {
        el.hidePopover!();
      }
    } catch {
      // Popover not supported: the fixed-position fallback still works outside dialogs.
    }
  }, [toasts.length, lastId]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
      <div ref={layer} className="toasts" popover="manual" aria-hidden="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.leaving ? ' leaving' : ''}`}>
            <IconCheck size={16} strokeWidth={2.4} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

import { useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';

/** True unless the user turned motion off in Settings or the system asks for reduced motion. */
export function motionAllowed(): boolean {
  if (document.documentElement.dataset.motion === 'off') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Run a Web Animation if motion is allowed. */
export function animate(el: Element | null | undefined, keyframes: Keyframe[], options: KeyframeAnimationOptions): void {
  if (!el || !motionAllowed() || typeof el.animate !== 'function') return;
  el.animate(keyframes, options);
}

export const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-7px)' },
  { transform: 'translateX(6px)' },
  { transform: 'translateX(-4px)' },
  { transform: 'translateX(2px)' },
  { transform: 'translateX(0)' },
];

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

/**
 * Apply a DOM-wide change (like the theme) through the View Transitions API, revealing
 * the new state in a growing circle from `origin`. Falls back to an instant change.
 */
export function withViewTransition(update: () => void, origin?: { x: number; y: number }): void {
  const doc = document as ViewTransitionDoc;
  if (!doc.startViewTransition || !motionAllowed()) {
    update();
    return;
  }
  const t = doc.startViewTransition(() => flushSync(update));
  if (!origin) return;
  t.ready
    .then(() => {
      const { x, y } = origin;
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 520, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {});
}

/**
 * Sliding selection indicator, like X's tab underline. Measures the selected option inside
 * the container (found with `selector`) and exposes its box as CSS variables that a
 * ::before pseudo-element follows.
 */
export function useIndicator<T extends HTMLElement>(selector: string, dep: unknown) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const target = el.querySelector<HTMLElement>(selector);
      if (!target) {
        el.removeAttribute('data-indicator');
        return;
      }
      const a = el.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      el.style.setProperty('--ind-x', `${b.left - a.left - el.clientLeft}px`);
      el.style.setProperty('--ind-y', `${b.top - a.top - el.clientTop}px`);
      el.style.setProperty('--ind-w', `${b.width}px`);
      el.style.setProperty('--ind-h', `${b.height}px`);
      el.setAttribute('data-indicator', '');
    };
    update();
    // Turn on the transition only after the first placement, so it doesn't fly in from 0,0.
    const raf = requestAnimationFrame(() => el.setAttribute('data-indicator-ready', ''));
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [selector, dep]);
  return ref;
}

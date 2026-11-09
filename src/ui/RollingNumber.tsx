import { useState } from 'react';

/** A number that rolls to its new value, like the like and repost counts on X. */
export function RollingNumber({ value }: { value: number }) {
  const [state, setState] = useState({ current: value, previous: null as number | null, dir: 'up', tick: 0 });
  if (value !== state.current) {
    setState({ current: value, previous: state.current, dir: value > state.current ? 'up' : 'down', tick: state.tick + 1 });
  }
  return (
    <span className="roll">
      {state.previous !== null && (
        <span
          key={`out-${state.tick}`}
          className={`roll-out ${state.dir}`}
          aria-hidden="true"
          onAnimationEnd={() => setState((s) => (s.tick === state.tick ? { ...s, previous: null } : s))}
        >
          {state.previous}
        </span>
      )}
      <span key={`in-${state.tick}`} className={state.tick > 0 ? `roll-in ${state.dir}` : undefined}>
        {state.current}
      </span>
    </span>
  );
}

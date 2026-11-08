import { useCallback, useEffect, useState } from 'react';

export interface Recent {
  id: string;
  title: string;
  subtitle: string;
  /** Encoded app state (URL hash without #). */
  hash: string;
  updated: number;
}

const KEY = 'kmap-solver:recents';
const MAX = 20;

function load(): Recent[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Recent[]) : [];
    return Array.isArray(list) ? list.filter((r) => r && typeof r.id === 'string' && typeof r.hash === 'string') : [];
  } catch {
    return [];
  }
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function useRecents() {
  const [recents, setRecents] = useState<Recent[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(recents));
    } catch {
      // Recents just won't persist.
    }
  }, [recents]);

  const upsert = useCallback((entry: Recent) => {
    setRecents((list) => {
      const existing = list.find((r) => r.id === entry.id);
      if (existing && existing.hash === entry.hash && existing.title === entry.title) return list;
      return [entry, ...list.filter((r) => r.id !== entry.id)].slice(0, MAX);
    });
  }, []);
  const remove = useCallback((id: string) => setRecents((list) => list.filter((r) => r.id !== id)), []);
  const clear = useCallback(() => setRecents([]), []);

  return { recents, upsert, remove, clear };
}

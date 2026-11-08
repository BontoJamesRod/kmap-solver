import type { ReactNode } from 'react';
import { IconChevron } from './icons';

/** A collapsible card, like the expandable blocks in a chat app. */
export function Block({ title, summary, defaultOpen = true, children }: { title: string; summary?: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details className="card block" open={defaultOpen}>
      <summary>
        <h2 className="card-title">{title}</h2>
        {summary && <span className="block-summary">{summary}</span>}
        <IconChevron className="chev" size={18} />
      </summary>
      <div className="block-body">{children}</div>
    </details>
  );
}

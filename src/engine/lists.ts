import type { BoolFunction, CellValue } from './types';

export type ListResult = { ok: true; values: number[] } | { ok: false; error: string };

/**
 * Parse a list like "0, 2, 5-7" or "Σm(0,2,5,6,7)". Numbers must be below `size` (2^n).
 * Returns the numbers sorted and without duplicates.
 */
export function parseNumberList(text: string, size: number): ListResult {
  let body = text.trim();
  // Accept a pasted wrapper: Σm( … ), m( … ), ΠM( … ), d( … ), sum( … ), etc.
  const wrapped = /^(?:Σ|∑|Π|∏|sum|prod)?\s*[mMdD]?\s*\((.*)\)$/s.exec(body);
  if (wrapped) body = wrapped[1]!;
  if (body.trim() === '') return { ok: true, values: [] };

  const seen = new Set<number>();
  for (const part of body.split(/[\s,;]+/).filter(Boolean)) {
    const range = /^(\d+)\s*[-–]\s*(\d+)$/.exec(part);
    const single = /^\d+$/.exec(part);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      if (a > b) return { ok: false, error: `Range "${part}" goes backwards. Write it as ${b}-${a}.` };
      if (b >= size) return { ok: false, error: `${b} is out of range. With this many variables, use 0 to ${size - 1}.` };
      for (let k = a; k <= b; k++) seen.add(k);
    } else if (single) {
      const k = Number(part);
      if (k >= size) return { ok: false, error: `${k} is out of range. With this many variables, use 0 to ${size - 1}.` };
      seen.add(k);
    } else {
      return { ok: false, error: `"${part}" isn't a number or a range like 2-5.` };
    }
  }
  return { ok: true, values: [...seen].sort((a, b) => a - b) };
}

export type ListKind = 'minterms' | 'maxterms';

export type FromListsResult = { ok: true; fn: BoolFunction } | { ok: false; error: string };

/**
 * Build a function from a list of minterms (the 1s) or maxterms (the 0s) plus don't-cares.
 * Unlisted cells get the opposite value.
 */
export function functionFromLists(n: number, kind: ListKind, terms: number[], dontCares: number[]): FromListsResult {
  const dc = new Set(dontCares);
  const clash = terms.filter((t) => dc.has(t));
  if (clash.length > 0) {
    return {
      ok: false,
      error: `${clash.join(', ')} ${clash.length === 1 ? 'is' : 'are'} listed both as a ${kind === 'minterms' ? 'minterm' : 'maxterm'} and as a don't-care.`,
    };
  }
  const listed: CellValue = kind === 'minterms' ? 1 : 0;
  const rest: CellValue = kind === 'minterms' ? 0 : 1;
  const set = new Set(terms);
  const values: CellValue[] = [];
  for (let m = 0; m < 1 << n; m++) values.push(dc.has(m) ? 'x' : set.has(m) ? listed : rest);
  return { ok: true, fn: { n, values } };
}

/** Format numbers compactly for a list field: "0, 2, 5". */
export function formatList(values: number[]): string {
  return values.join(', ');
}

import { evaluateAll } from './expr';
import { functionFromLists, parseNumberList, type ListKind } from './lists';
import { parseExpression, type ParseError } from './parse';
import { namesFor } from './state';
import { MAX_VARS, MIN_VARS, type BoolFunction } from './types';

export type InputMode = 'auto' | 'expression' | 'minterms' | 'maxterms';
export type InputKind = 'expression' | ListKind;

export type FunctionInputResult =
  | { ok: true; kind: InputKind; fn: BoolFunction; names: string[] }
  | { ok: false; kind: InputKind; error: ParseError };

const SIGMA = /^\s*(?:Σ|∑|sum\b)/i;
const PI = /^\s*(?:Π|∏|prod\b)/i;
const LOWER_M_LIST = /^\s*m\s*\(\s*[\d)]/;
const UPPER_M_LIST = /^\s*M\s*\(\s*[\d)]/;
const BARE_NUMBERS = /^[\d\s,;–-]+(?:[+·*&,;]?\s*(?:dc|d)\s*\(.*)?$/i;

/** Guess whether text is an expression, a minterm list, or a maxterm list. */
export function detectInputKind(text: string): InputKind {
  if (SIGMA.test(text) || LOWER_M_LIST.test(text)) return 'minterms';
  if (PI.test(text) || UPPER_M_LIST.test(text)) return 'maxterms';
  if (/^\s*\d/.test(text) && BARE_NUMBERS.test(text.trim())) return 'minterms';
  return 'expression';
}

class InputError extends Error {
  constructor(
    message: string,
    public start: number,
    public end: number,
  ) {
    super(message);
  }
}

interface ScannedList {
  /** Kind named by the prefix (Σ, m, Π, M), or null for a bare list. */
  declared: ListKind | null;
  terms: { text: string; start: number; end: number };
  dcs: { text: string; start: number; end: number } | null;
}

/** Find the term list and optional don't-care list, with character positions for errors. */
function scanList(text: string): ScannedList {
  let i = 0;
  const skip = () => {
    while (i < text.length && /\s/.test(text[i]!)) i++;
  };
  const match = (re: RegExp) => {
    re.lastIndex = i;
    const m = re.exec(text);
    if (m) i += m[0].length;
    return m;
  };

  skip();
  let declared: ListKind | null = null;
  const symbol = match(/(Σ|∑|sum|Π|∏|prod)/iy);
  if (symbol) declared = /Π|∏|prod/i.test(symbol[0]) ? 'maxterms' : 'minterms';
  skip();
  const letter = match(/[mM](?=\s*\()/y);
  if (letter && !declared) declared = letter[0] === 'M' ? 'maxterms' : 'minterms';
  skip();

  const group = (what: string) => {
    const open = i;
    i++; // past "("
    const close = text.indexOf(')', i);
    if (close < 0) throw new InputError(`Missing ")" to close the ${what}.`, open, open + 1);
    const g = { text: text.slice(i, close), start: i, end: close };
    i = close + 1;
    return g;
  };

  let terms: ScannedList['terms'];
  if (text[i] === '(') {
    terms = group('list');
  } else if (declared) {
    throw new InputError('Expected "(" to start the list.', i, i + 1);
  } else {
    const start = i;
    while (i < text.length && /[\d\s,;–-]/.test(text[i]!)) i++;
    terms = { text: text.slice(start, i), start, end: i };
  }

  skip();
  match(/[+·*&,;]/y);
  skip();
  let dcs: ScannedList['dcs'] = null;
  if (i < text.length) {
    const d = match(/(dc|d)\s*(?=\()/iy);
    if (!d) throw new InputError(`Unexpected "${text[i]}". Don't-cares go in d( … ).`, i, i + 1);
    dcs = group("don't-care list");
    skip();
    if (i < text.length) throw new InputError(`Unexpected "${text[i]}" after the list.`, i, i + 1);
  }
  return { declared, terms, dcs };
}

function bitsNeeded(max: number): number {
  let bits = 0;
  while (1 << bits <= max) bits++;
  return bits;
}

function parseList(text: string, mode: InputMode, n: number, names: string[]): FunctionInputResult {
  const kind: ListKind = mode === 'maxterms' ? 'maxterms' : mode === 'minterms' ? 'minterms' : detectInputKind(text) === 'maxterms' ? 'maxterms' : 'minterms';
  try {
    const scanned = scanList(text);
    if (scanned.declared && mode !== 'auto' && scanned.declared !== kind) {
      const isMax = scanned.declared === 'maxterms';
      throw new InputError(
        `This is a ${isMax ? 'maxterm' : 'minterm'} list. Switch the input type to ${isMax ? 'Maxterms' : 'Minterms'} or Auto.`,
        0,
        text.length,
      );
    }
    const finalKind = scanned.declared ?? kind;
    const size = 1 << MAX_VARS;
    const terms = parseNumberList(scanned.terms.text, size);
    if (!terms.ok) throw new InputError(terms.error, scanned.terms.start, scanned.terms.end);
    const dcs = scanned.dcs ? parseNumberList(scanned.dcs.text, size) : { ok: true as const, values: [] };
    if (!dcs.ok) throw new InputError(dcs.error, scanned.dcs!.start, scanned.dcs!.end);

    const max = Math.max(0, ...terms.values, ...dcs.values);
    const newN = Math.max(n, MIN_VARS, bitsNeeded(max));
    const built = functionFromLists(newN, finalKind, terms.values, dcs.values);
    if (!built.ok) throw new InputError(built.error, 0, text.length);
    return { ok: true, kind: finalKind, fn: built.fn, names: newN === n ? names : namesFor(names, newN) };
  } catch (e) {
    if (e instanceof InputError) return { ok: false, kind, error: { message: e.message, start: e.start, end: e.end } };
    throw e;
  }
}

function parseExpr(text: string, n: number, names: string[]): FunctionInputResult {
  const inferred = parseExpression(text);
  if (!inferred.ok) return { ok: false, kind: 'expression', error: inferred.error };

  const current = new Set(names.map((s) => s.toLowerCase()));
  if (inferred.names.every((nm) => current.has(nm.toLowerCase()))) {
    const parsed = parseExpression(text, names);
    if (!parsed.ok) return { ok: false, kind: 'expression', error: parsed.error };
    return { ok: true, kind: 'expression', fn: { n, values: evaluateAll(parsed.expr, n) }, names };
  }
  if (inferred.names.length < MIN_VARS) {
    return {
      ok: false,
      kind: 'expression',
      error: {
        message: `K-maps need at least ${MIN_VARS} variables. Use another variable, or rename the variables in Settings.`,
        start: 0,
        end: text.length,
      },
    };
  }
  const k = inferred.names.length;
  return { ok: true, kind: 'expression', fn: { n: k, values: evaluateAll(inferred.expr, k) }, names: inferred.names };
}

/**
 * Parse whatever was typed into the composer.
 * `n` and `names` are the current variables; lists may add variables, expressions may
 * bring their own.
 */
export function parseFunctionInput(text: string, mode: InputMode, n: number, names: string[]): FunctionInputResult {
  if (text.trim() === '') {
    return {
      ok: false,
      kind: 'expression',
      error: { message: "Type a function: an expression like A'B + AC, or minterms like Σm(1, 3, 7).", start: 0, end: 0 },
    };
  }
  const kind = mode === 'auto' ? detectInputKind(text) : mode;
  return kind === 'expression' ? parseExpr(text, n, names) : parseList(text, mode, n, names);
}

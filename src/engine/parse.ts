import type { Expr } from './expr';
import { MAX_VARS } from './types';

export interface ParseError {
  message: string;
  /** Character range in the input to highlight. */
  start: number;
  end: number;
}

export type ParseResult =
  | { ok: true; expr: Expr; names: string[] }
  | { ok: false; error: ParseError };

type TokenKind = 'ident' | 'const' | 'notPrefix' | 'notPostfix' | 'and' | 'or' | 'xor' | 'lparen' | 'rparen' | 'eof';

interface Token {
  kind: TokenKind;
  text: string;
  start: number;
  end: number;
}

class SyntaxError_ extends Error {
  constructor(
    message: string,
    public start: number,
    public end: number,
  ) {
    super(message);
  }
}

const WORD_OPS: Record<string, TokenKind> = { AND: 'and', OR: 'or', NOT: 'notPrefix', XOR: 'xor' };
const SYMBOLS: Record<string, TokenKind> = {
  "'": 'notPostfix',
  '’': 'notPostfix',
  '′': 'notPostfix',
  '~': 'notPrefix',
  '!': 'notPrefix',
  '¬': 'notPrefix',
  '*': 'and',
  '·': 'and',
  '⋅': 'and',
  '•': 'and',
  '&': 'and',
  '∧': 'and',
  '.': 'and',
  '+': 'or',
  '|': 'or',
  '∨': 'or',
  '^': 'xor',
  '⊕': 'xor',
  '(': 'lparen',
  ')': 'rparen',
};

const isLetter = (c: string | undefined) => !!c && /[A-Za-z]/.test(c);
const isDigit = (c: string | undefined) => !!c && /[0-9]/.test(c);
const isAlnum = (c: string | undefined) => isLetter(c) || isDigit(c);

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (isLetter(c)) {
      // Word operators only count as standalone words: "A AND B", not "BAND".
      const word = /^[A-Za-z]+/.exec(text.slice(i))![0];
      const op = WORD_OPS[word.toUpperCase()];
      if (op && !isAlnum(text[i - 1]) && !isAlnum(text[i + word.length])) {
        tokens.push({ kind: op, text: word, start: i, end: i + word.length });
        i += word.length;
        continue;
      }
      // An identifier is one letter followed by optional digits: A, x1, x12.
      let j = i + 1;
      while (isDigit(text[j])) j++;
      tokens.push({ kind: 'ident', text: text.slice(i, j), start: i, end: j });
      i = j;
      continue;
    }
    if (isDigit(c)) {
      let j = i;
      while (isDigit(text[j])) j++;
      const num = text.slice(i, j);
      if (num !== '0' && num !== '1') {
        throw new SyntaxError_(`"${num}" isn't valid here. Only the constants 0 and 1 are allowed.`, i, j);
      }
      tokens.push({ kind: 'const', text: num, start: i, end: j });
      i = j;
      continue;
    }
    const kind = SYMBOLS[c];
    if (!kind) throw new SyntaxError_(`Unexpected character "${c}".`, i, i + 1);
    tokens.push({ kind, text: c, start: i, end: i + 1 });
    i++;
  }
  tokens.push({ kind: 'eof', text: '', start: text.length, end: text.length });
  return tokens;
}

type RawExpr =
  | { kind: 'ident'; name: string; start: number; end: number }
  | { kind: 'const'; value: 0 | 1 }
  | { kind: 'not'; arg: RawExpr }
  | { kind: 'and' | 'or' | 'xor'; args: RawExpr[] };

function parseTokens(tokens: Token[]): RawExpr {
  let pos = 0;
  const peek = () => tokens[pos]!;
  const next = () => tokens[pos++]!;

  const describe = (t: Token) => (t.kind === 'eof' ? 'the end' : `"${t.text}"`);

  const startsOperand = (t: Token) =>
    t.kind === 'ident' || t.kind === 'const' || t.kind === 'lparen' || t.kind === 'notPrefix';

  function parseOr(): RawExpr {
    const args = [parseXor()];
    while (peek().kind === 'or') {
      next();
      args.push(parseXor());
    }
    return args.length === 1 ? args[0]! : { kind: 'or', args };
  }

  function parseXor(): RawExpr {
    const args = [parseAnd()];
    while (peek().kind === 'xor') {
      next();
      args.push(parseAnd());
    }
    return args.length === 1 ? args[0]! : { kind: 'xor', args };
  }

  function parseAnd(): RawExpr {
    const args = [parseUnary()];
    for (;;) {
      if (peek().kind === 'and') {
        next();
        args.push(parseUnary());
      } else if (startsOperand(peek())) {
        args.push(parseUnary()); // implicit AND: AB, A(B+C)
      } else {
        break;
      }
    }
    return args.length === 1 ? args[0]! : { kind: 'and', args };
  }

  function parseUnary(): RawExpr {
    if (peek().kind === 'notPrefix') {
      next();
      return { kind: 'not', arg: parseUnary() };
    }
    let e = parseAtom();
    while (peek().kind === 'notPostfix') {
      next();
      e = { kind: 'not', arg: e };
    }
    return e;
  }

  function parseAtom(): RawExpr {
    const t = next();
    switch (t.kind) {
      case 'ident':
        return { kind: 'ident', name: t.text, start: t.start, end: t.end };
      case 'const':
        return { kind: 'const', value: t.text === '1' ? 1 : 0 };
      case 'lparen': {
        if (peek().kind === 'rparen') {
          const r = peek();
          throw new SyntaxError_('Empty parentheses.', t.start, r.end);
        }
        const inner = parseOr();
        const close = next();
        if (close.kind !== 'rparen') {
          throw new SyntaxError_(`Missing ")" to close the "(" here.`, t.start, t.end);
        }
        return inner;
      }
      case 'eof':
        throw new SyntaxError_(
          pos === 1 ? 'Type an expression, like A\'B + AC.' : 'The expression ends too early. Something is missing after the last operator.',
          t.start,
          t.end,
        );
      default:
        throw new SyntaxError_(`Expected a variable, 0, 1, or "(" but found ${describe(t)}.`, t.start, t.end);
    }
  }

  const expr = parseOr();
  const rest = peek();
  if (rest.kind !== 'eof') {
    throw new SyntaxError_(
      rest.kind === 'rparen' ? 'There\'s a ")" without a matching "(".' : `Unexpected ${describe(rest)}.`,
      rest.start,
      rest.end,
    );
  }
  return expr;
}

function collectIdents(e: RawExpr, out: { name: string; start: number; end: number }[]): void {
  if (e.kind === 'ident') out.push(e);
  else if (e.kind === 'not') collectIdents(e.arg, out);
  else if (e.kind !== 'const') e.args.forEach((a) => collectIdents(a, out));
}

function resolve(e: RawExpr, index: Map<string, number>): Expr {
  switch (e.kind) {
    case 'ident':
      return { kind: 'var', index: index.get(e.name.toLowerCase())! };
    case 'const':
      return e;
    case 'not':
      return { kind: 'not', arg: resolve(e.arg, index) };
    default:
      return { kind: e.kind, args: e.args.map((a) => resolve(a, index)) };
  }
}

/** Natural sort so x2 comes before x10. */
function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
}

/**
 * Parse a Boolean expression.
 *
 * - With `names`, every identifier must be one of them (case-insensitive) and variable
 *   indices follow `names`.
 * - Without `names`, the variables are the identifiers used, in natural sorted order.
 */
export function parseExpression(text: string, names?: string[]): ParseResult {
  try {
    const raw = parseTokens(tokenize(text));
    const idents: { name: string; start: number; end: number }[] = [];
    collectIdents(raw, idents);

    let finalNames: string[];
    if (names) {
      const known = new Set(names.map((s) => s.toLowerCase()));
      const unknown = idents.find((id) => !known.has(id.name.toLowerCase()));
      if (unknown) {
        throw new SyntaxError_(
          `"${unknown.name}" isn't one of this function's variables (${names.join(', ')}).`,
          unknown.start,
          unknown.end,
        );
      }
      finalNames = names;
    } else {
      const seen = new Map<string, string>();
      for (const id of idents) if (!seen.has(id.name.toLowerCase())) seen.set(id.name.toLowerCase(), id.name);
      finalNames = [...seen.values()].sort(naturalCompare);
      if (finalNames.length > MAX_VARS) {
        throw new SyntaxError_(
          `This uses ${finalNames.length} variables (${finalNames.join(', ')}). The maximum is ${MAX_VARS}.`,
          0,
          text.length,
        );
      }
    }

    const index = new Map(finalNames.map((nm, i) => [nm.toLowerCase(), i]));
    return { ok: true, expr: resolve(raw, index), names: finalNames };
  } catch (err) {
    if (err instanceof SyntaxError_) {
      return { ok: false, error: { message: err.message, start: err.start, end: err.end } };
    }
    throw err;
  }
}

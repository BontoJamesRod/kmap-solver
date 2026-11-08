# Architecture

## Overview

```
src/
  engine/          Pure TypeScript. No React, no DOM. All the logic lives here.
    __tests__/     Vitest unit tests, plus exhaustive and brute-force verification
  ui/              React components. They render engine output; they never do Boolean logic.
  main.tsx         Entry point
e2e/               Playwright browser tests (flows + accessibility)
docs/              Research, requirements, this file
```

The split between `engine/` and `ui/` is the most important rule in the codebase. Everything that can be wrong mathematically sits in `engine/`, where it's exhaustively tested. The UI only displays what the engine returns.

## Core types (`engine/types.ts`)

```ts
type CellValue = 0 | 1 | 'x';                 // 'x' = don't-care
interface BoolFunction { n: number; values: CellValue[] }   // values[m] for minterm m, length 2^n

// A product term (or, in POS mode, a sum term) as two bitmasks over n variables.
// Bit (n-1-i) belongs to variable i, so variable 0 (A) is the most significant bit.
interface Cube { value: number; dashes: number }  // dashes: eliminated variables; value is 0 at dashed bits
```

`literals = n - popcount(dashes)`. A cube covers minterm `m` when `(m & ~dashes) === value`.

## Engine modules

| Module | Responsibility |
| --- | --- |
| `cube.ts` | Cube helpers: combine, covers, list minterms, literal count, `"10-1"` notation |
| `qm.ts` | Quine-McCluskey: prime implicants, plus every combining round for the steps view |
| `cover.ts` | Essential prime implicants, then a branch-and-bound exact cover that returns **all** covers tied for minimum `(terms, literals)` |
| `petrick.ts` | Petrick's method on the reduced chart (for the steps view and as a cross-check), capped in size |
| `solve.ts` | `solve(fn, 'sop' \| 'pos')` → minimal solutions + steps. POS solves the complement and reads each cube as a sum term |
| `expr.ts`, `parse.ts` | Expression AST and parser (tokens, precedence, errors with position) |
| `evaluate.ts` | Truth table of an AST |
| `lists.ts` | Parse `0, 2-5, 7` style lists and Σ/Π input |
| `format.ts` | Text, LaTeX, and Verilog output; canonical Σm / ΠM strings |
| `check.ts` | Check my answer: equivalence on care inputs, wrong cells, form detection, minimality compared with the solution |
| `layout.ts` | K-map geometry: layers, rows, columns, Gray-code labels, minterm ↔ cell position, and how a cube splits into rectangles when it wraps |
| `circuit.ts` | Circuit model: gates, inputs, and wire coordinates for a solution. The UI only draws it |
| `state.ts` | App state: defaults, URL hash encode/decode, keeping the function when the number of variables changes |
| `input.ts` | Composer input: detects a Σm / ΠM / d list or an expression, and picks the variable count |

## Data flow

```
user input ──▶ state (useReducer) ──▶ engine.solve() (memoized) ──▶ UI renders
                   │
                   └──▶ URL hash + localStorage
```

- All input views (map, truth table, lists, expression) edit the same `BoolFunction`.
- An expression stays as text while it's being typed; the function updates only when it parses.
- `solve()` runs for SOP and POS together, memoized on the function's values.

## App shell (`src/ui/`)

| Part | Component | Notes |
| --- | --- | --- |
| Sidebar | `Sidebar.tsx` | New function, examples, Recents. A drawer under 900 px (main content is `inert` while it's open). |
| Top bar | `TopBar.tsx` | Sidebar toggle, current function's title, Share |
| Composer | `Composer.tsx` | Function input (FR-25); parsing happens in `engine/input.ts` |
| Result card | `ResultCard.tsx` | Map or truth table on one side, answer on the other |
| Settings | `Settings.tsx` | Native `<dialog>` (focus trap and Esc for free), tabbed sections, `role="switch"` toggles |
| Preferences | `usePrefs.ts` | Theme and display preferences in `localStorage`. The function itself lives in the URL (`state.ts`) |
| Recents | `useRecents.ts` | Up to 20 functions in `localStorage`, titled by their minimal answer |

## Visual design

Inspired by the Claude web app (FR-28): warm off-white and warm charcoal neutrals, and a terracotta accent used sparingly (send button, focus, selection). Display type is **Schibsted Grotesk**, a sturdy grotesk originally made for the Schibsted newspaper group. It sets the headings, the answer, and the map values. **B612 Mono**, from the Airbus cockpit typeface family, sets bit patterns, and **Inter** sets interface text. Group colors stay on the color-blind-safe Okabe-Ito set. Design tokens are CSS custom properties at the top of `styles.css`.

## K-map rendering

- Cells are a CSS grid of real `<button>` elements, so keyboard and screen readers work. The arrow keys move between cells; `0`, `1`, `x` and Space set a cell's value.
- Group outlines are an SVG overlay that uses the same row/column coordinates. `layout.ts` returns rectangles in grid units, with flags for which sides are open because the group wraps.
- 5 and 6 variables: the 4×4 layers are drawn next to each other (2 layers, or a 2×2 arrangement of 4), labeled by the outer variables in Gray order.

## Testing layers

| Layer | Tool | What it proves |
| --- | --- | --- |
| Unit | Vitest | Each module's behavior, including edge cases and textbook examples |
| Exhaustive | Vitest | Every function up to 4 variables solves to an equivalent expression; B&B and Petrick agree |
| Brute force | Vitest | Minimality and completeness match an independent search over all implicants |
| Property | Vitest | Random expressions survive print → parse unchanged |
| Browser | Playwright | Main flows work end to end in a real browser |
| Accessibility | Playwright + axe-core | No automatically detectable WCAG violations |

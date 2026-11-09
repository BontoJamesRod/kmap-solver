# Requirements: K-Map Solver

| | |
| --- | --- |
| **Version** | 1.2 |
| **Status** | Implemented |
| **Owner** | James Rod Bonto ([@BontoJamesRod](https://github.com/BontoJamesRod)) |
| **Background** | [RESEARCH.md](RESEARCH.md) |

## 1. Problem

Students learning digital logic simplify Boolean functions by hand with Karnaugh maps and the tabular (Quine-McCluskey) method. When they check their work online, most tools show a single answer with no reasoning, stop at 4 variables, and draw maps in a layout that may not match the class textbook. Some published answers are simply wrong. A student whose correct answer differs from the tool's has no way to tell.

## 2. Goal

A free web app that simplifies any Boolean function of 2–6 variables. It must:
- give **every** minimal answer, as SOP and POS, with **proven correctness**
- show the groups on a K-map drawn the way textbooks draw it
- explain the tabular method step by step
- tell a student whether **their own answer** is right and minimal
- draw the circuit

## 3. Users

- **Primary:** computer and electronics engineering students checking homework and studying for exams
- **Secondary:** instructors preparing examples; hobbyists simplifying logic for real circuits

## 4. Functional requirements

### Input

| ID | Requirement |
| --- | --- |
| FR-1 | Support 2 to 6 variables. Variables are named `A`–`F` by default and can be renamed (e.g. `w x y z`). Names are a letter followed by optional digits. |
| FR-2 | Three ways to enter a function, all kept in sync: **(a)** click K-map cells, **(b)** click the truth table output column, **(c)** type into the composer (FR-25). Clicking a cell cycles 0 → 1 → X (don't-care). |
| FR-3 | List input accepts commas or spaces and ranges (`0-3`). It rejects numbers above 63 and numbers listed as both a term and a don't-care, with a clear message. |
| FR-4 | The expression parser accepts: NOT as `A'`, `A’`, `~A`, `!A`, `¬A`, `NOT A`; AND as juxtaposition (`AB`), `*`, `·`, `&`, `∧`, `.`, `AND`; OR as `+`, `|`, `∨`, `OR`; XOR as `^`, `⊕`, `XOR`; parentheses, a complemented group `(A+B)'`, and constants `0`/`1`. Precedence from highest: NOT, AND, XOR, OR. Errors point to the exact position. |
| FR-5 | Changing the number of variables keeps as much of the function as possible. Lists keep the numbers that are still in range. An expression is kept if its variables still exist. |

| FR-25 | **Composer.** One input box, styled like a chat composer, accepts either an expression (`A'B + AC`) or a list. Lists can be written as `Σm(1,3,7) + d(0,2)`, `m(1,3,7) d(0,2)`, `ΠM(0,4) · d(2)`, or plain numbers (`1, 3, 7`). The type is detected automatically or can be chosen (Auto, Expression, Minterms, Maxterms). The variable count is picked from a dropdown, and grows on its own if a list needs more variables. Enter applies the input. Errors point at the exact position. |

### Workspace

| ID | Requirement |
| --- | --- |
| FR-26 | **Sidebar** with *New function*, textbook examples, and *Recents*. Every function worked on is saved in Recents, titled by its minimal answer, and can be reopened or removed. On narrow screens the sidebar is a drawer; on wide screens it can be collapsed. |
| FR-27 | **Settings dialog** with sections: *General* (variable names, 3-variable layout, variable count and answer form for new functions), *Appearance* (light, dark, or system theme; group outline animation; cell numbers), *Circuit* (default gate style), *Data* (clear Recents, reset settings), and *About*. Settings are remembered between visits. |
| FR-28 | **Visual design** follows the feel of the Claude web app: warm neutral colors, a composer-style input, rounded cards, and a tabbed settings dialog. Display type is Schibsted Grotesk. It uses its own name, logo, and open-source fonts. |

| FR-29 | **Motion** in the style of X: quick, springy feedback for every action. Cells pop when changed, with a burst when they become 1; the map ripples in when it loads or resizes; counts roll; toggles have a sliding indicator; answers stagger in; circuit wires draw in; dialogs, the drawer, collapsible sections, and Recents items animate in and out; copies and shares confirm with a toast; invalid input shakes; buttons press; changing theme reveals the new one in a circle. Motion can be turned off in Settings and is always off when the system asks for reduced motion. |

### Solving

| ID | Requirement |
| --- | --- |
| FR-6 | Compute the **minimal sum of products**: fewest terms first, then fewest literals. List **all** minimal solutions, up to 100; highly symmetric 6-variable functions can have millions, and then the first 100 are listed and labeled as such. |
| FR-7 | Compute the **minimal product of sums** under the same rule, also listing all of them. |
| FR-8 | Handle constants: with no 1s the SOP is `0`, and with no 0s the POS is `1`; when 1s and don't-cares fill the map the answer is `1` (and the reverse for 0s). If every cell is a don't-care, either constant is valid: SOP shows `0`, POS shows `1`. |
| FR-9 | Show the canonical forms Σm(…) + d(…) and ΠM(…) + d(…). |

### Visualization

| ID | Requirement |
| --- | --- |
| FR-10 | Draw the K-map with Gray-code axis labels and each cell's minterm number. 3-variable maps can switch between 2×4 (`A` × `BC`) and 4×2 (`AB` × `C`). 5- and 6-variable maps are drawn as 2 or 4 overlaid 4×4 maps, labeled by the outer variables. |
| FR-11 | Draw each group of the selected solution on the map with a distinct color-blind-safe color and a number. Groups that wrap around an edge are drawn as open-ended pieces on both sides. A group spanning layers appears on every layer it touches. |
| FR-12 | Hovering or focusing a term highlights its group, and the reverse. |
| FR-13 | Let the user switch between SOP (groups the 1s) and POS (groups the 0s), and between the minimal solutions when there's more than one. |

### Step-by-step

| ID | Requirement |
| --- | --- |
| FR-14 | Show the tabular method: the initial table grouped by number of 1s, each combining round with ✓ on combined terms, and the resulting prime implicants labeled P1, P2, …, with the minterms each one covers. |
| FR-15 | Show the prime implicant chart with essential prime implicants marked and the minterms they cover. |
| FR-16 | If columns remain, show the reduced chart, Petrick's expression, and its expansion into candidate covers, with the minimal ones marked. When the expansion is too large to display, say so and still show the result. |
| FR-17 | Mark which don't-cares ended up used in the answer. |

### Check my answer

| ID | Requirement |
| --- | --- |
| FR-18 | The user types their own expression. The app says whether it is **equivalent** to the function on every input that isn't a don't-care. If it isn't, it lists and highlights the cells where it's wrong. |
| FR-19 | If it's equivalent and in SOP or POS form, the app says whether it's **minimal**, and if not, how many terms and literals it has compared with the minimum. |

### Circuit

| ID | Requirement |
| --- | --- |
| FR-20 | Draw the selected solution as a two-level circuit: AND-OR or NAND-NAND for SOP, OR-AND or NOR-NOR for POS. Show a gate count. |
| FR-21 | Download the circuit as an SVG file. |

### Export and sharing

| ID | Requirement |
| --- | --- |
| FR-22 | Copy the selected expression as plain text, LaTeX, or a Verilog `assign` statement. |
| FR-23 | Keep the whole state (variables, names, values, layout, mode) in the page URL, so a link reproduces exactly what you see. |
| FR-24 | Remember the last function between visits. |

## 5. Non-functional requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | **Correctness:** checked automatically as described in [RESEARCH.md §7](RESEARCH.md#7-how-correctness-is-verified). This covers every function up to 4 variables, an independent brute-force minimality check, and two independent cover algorithms that must agree. |
| NFR-2 | **Speed:** any function of up to 6 variables is solved in under 0.5 s on a typical laptop, including deliberately hard symmetric functions. |
| NFR-3 | **Accessibility:** fully keyboard-operable; cells and controls have screen-reader labels; color is never the only cue; WCAG AA contrast; no violations in an automated axe scan. |
| NFR-4 | **Responsive:** usable on a phone screen 360 px wide. |
| NFR-5 | Light and dark themes, following the system setting by default. |
| NFR-6 | **Static site:** no backend, no accounts, no tracking. Works offline once loaded. |
| NFR-7 | Works in current Chrome, Edge, Firefox, and Safari. |
| NFR-8 | **Code quality:** strict TypeScript, linted. CI runs type checks, unit tests, browser tests, and the build on every push, and deploys `main` automatically. |

## 6. Out of scope (v1.0)

- More than 6 variables, and heuristic minimizers such as Espresso
- Minimizing several outputs that share gates
- Static hazard detection, timing diagrams, and multi-level circuits
- Accounts, saved libraries of problems, or a backend

## 7. Acceptance

| Requirement | Verified by |
| --- | --- |
| FR-1, FR-5 | `src/engine/__tests__/state.test.ts`, `e2e/app.spec.ts` |
| FR-2, FR-3 | `src/engine/__tests__/lists.test.ts`, `e2e/app.spec.ts` |
| FR-25 | `src/engine/__tests__/input.test.ts`, `e2e/app.spec.ts` |
| FR-26, FR-27 | `e2e/app.spec.ts`, `e2e/a11y.spec.ts` (including the open settings dialog and drawer) |
| FR-29 | `e2e/motion.spec.ts` (animations run, the setting and reduced motion turn them off, toasts are announced) |
| FR-28 | Screenshots in `docs/screenshots/`, reviewed in light and dark themes and at 360 px |
| FR-4 | `src/engine/__tests__/parse.test.ts` (including a random round-trip test) |
| FR-6, FR-7, FR-8 | `src/engine/__tests__/solve.test.ts`, `src/engine/__tests__/exhaustive.test.ts` |
| FR-9 | `src/engine/__tests__/format.test.ts` |
| FR-10, FR-11 | `src/engine/__tests__/layout.test.ts`, `e2e/app.spec.ts` |
| FR-12, FR-13 | `e2e/app.spec.ts` |
| FR-14 – FR-17 | `src/engine/__tests__/steps.test.ts`, plus independent checks of the prime list, essentials, and Petrick expansion in `exhaustive.test.ts` (`steps-verify.ts`) |
| FR-18, FR-19 | `src/engine/__tests__/check.test.ts`, `e2e/app.spec.ts` |
| FR-20, FR-21 | `src/engine/__tests__/circuit.test.ts`, `e2e/app.spec.ts` |
| FR-22 | `src/engine/__tests__/format.test.ts` |
| FR-23, FR-24 | `src/engine/__tests__/state.test.ts`, `e2e/app.spec.ts` |
| NFR-1 | `src/engine/__tests__/exhaustive.test.ts`, `src/engine/__tests__/bruteforce.test.ts` |
| NFR-2 | `src/engine/__tests__/performance.test.ts` |
| NFR-3 | `e2e/a11y.spec.ts` (axe scan in light and dark themes) |
| NFR-4 | `e2e/app.spec.ts` (no sideways scrolling at 360 px for 4, 5, and 6 variables) |
| NFR-8 | `.github/workflows/ci.yml`, `npm run verify` |

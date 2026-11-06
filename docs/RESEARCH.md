# Research notes

Research done before writing any code, to decide what this solver should do differently and where errors usually creep in. Sources are listed at the end.

## 1. What already exists

| Tool | Variables | Shows groups on map | All minimal answers | POS | Steps | Circuit | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dCode Karnaugh Map | 2–4 | No | No | Not stated | No | No | Gives the expression only; says 5–6 variables are hard to read and suggests Quine-McCluskey instead |
| karnaughmapsolver.com | 2–6 | Yes | Not stated | Yes | Yes | Yes | Paid tool |
| Karnaugh Kmap Solver (Android) | Up to 6 | Yes | **Yes** | Yes | Partial | Yes | One of the few that lists every solution |
| M4rulli/K-Map-Solver (GitHub, React + TS) | Up to 6 | Yes | Not stated | Yes | Partial | Yes | Closest open-source comparison |
| Many GitHub student projects | Usually 2–4 | Rarely | Rarely | Sometimes | Rarely | Rarely | Most stop at 4 variables and one answer |

## 2. Gaps worth filling

1. **Nobody shows they're correct.** Online answers for K-map problems are wrong surprisingly often. One published tutorial solution for `F = Σm(0,1,2,3,7,8,10) + d(5,6,11,15)` gives `(y'+z')(w'+z')` as the POS answer. That expression is 0 at minterms 3 and 7, which are required 1s. **This solver will be checked against every possible function up to 4 variables**, and the README will say so.
2. **Only one answer is shown**, even when a function has several equally minimal ones. The classic cyclic example `Σm(0,1,2,5,6,7)` has two: `A'B' + BC' + AC` and `A'C' + B'C + AB`. A student whose correct answer differs from the tool's assumes they're wrong.
3. **No "check my answer" mode.** Students mainly want to know whether *their* expression is right and minimal, and if not, which cells it gets wrong.
4. **The steps don't match the coursework.** Courses teach the tabular (Quine-McCluskey) method, prime implicant charts, essential prime implicants and Petrick's method. Most tools show only the final map.
5. **Layouts don't match the student's textbook** (see §4).
6. **5- and 6-variable maps are poorly drawn** or not supported.

## 3. Algorithms

### Definition of "minimal"
Standard textbook definition (Mano; Roth): a **minimum sum of products** has the fewest product terms, and among those, the fewest literals. The minimum product of sums uses the same rule for sum terms. This project uses exactly that ordering, `(terms, literals)`, and reports **every** expression that ties.

### Quine-McCluskey (tabular method)
1. List minterms **and don't-cares** in binary, grouped by number of 1s.
2. Combine terms in adjacent groups that differ in exactly one bit (`XY + XY' = X`), marking the bit with `-`. Repeat until nothing combines. Anything never combined is a **prime implicant**.
3. Build the **prime implicant chart**: rows are prime implicants, columns are the required minterms only. Don't-cares never become columns.
4. A prime implicant is **essential** if it's the only one covering some column. Take all essentials and remove the columns they cover.
5. If columns remain (a **cyclic** chart), choose a minimum set of the remaining prime implicants.

Rules that are easy to get wrong:
- Don't-cares are treated as 1s when finding prime implicants, but they never need to be covered.
- A prime implicant made only of don't-cares is never part of a minimum solution. Drop it from the chart.
- Constant functions are edge cases: no required 1s means `F = 0`, and everything a 1 or don't-care means `F = 1`.

### Petrick's method
For the remaining chart, write a product of sums with one factor per uncovered minterm: the OR of the prime implicants that cover it. Multiply it out, applying absorption (`X + XY = X`). Each resulting product term is a possible cover. Keep the ones with the fewest prime implicants, then the fewest literals. Petrick's method finds **all** minimal solutions, but multiplying out can blow up for big charts.

### Exact cover search (used for the answer)
To stay fast at 6 variables, the solver finds the answer with a branch-and-bound search:
1. Take the essentials.
2. Pick the uncovered minterm with the fewest candidate prime implicants and branch on each of them.
3. Prune any branch whose `(terms, literals)` cost already exceeds the best found.
4. Collect every cover that ties for the best.

Petrick's method still runs for the **step-by-step display** (with a size cap). Tests check that both methods return the same set of minimal solutions. That way two independent algorithms check each other.

### Product of sums
Minimize the complement: group the 0s, with the same don't-cares, using the same machinery. Then apply De Morgan. Each group of 0s becomes a sum term, and a variable that is 1 throughout the group appears complemented.

## 4. Conventions that trip students up

| Topic | What varies | Decision |
| --- | --- | --- |
| Minterm numbering | Which variable is the most significant bit | First variable (A) is the MSB: `m = A·2^(n-1) + … + last` |
| Axis order | Binary vs Gray code | Always Gray code (00, 01, 11, 10). Binary order is a well-known mistake |
| 3-variable layout | Mano draws `A` on the rows and `BC` on the columns (2×4). Other texts draw `AB` on the rows and `C` on the columns (4×2) | Toggle between **2×4** and **4×2** |
| 4-variable layout | `AB` on the rows, `CD` on the columns | Standard |
| 5–6 variables | **Reflection** map (one wide map with a mirror line) vs **overlay** map (stacked 4×4 maps that count as on top of each other) | Overlay maps side by side, which most textbooks call the more common form. A group that spans layers is drawn in every layer it touches, in the same color |
| Variable names | `A B C D` (Floyd) vs `w x y z` (Mano) | Variable names are customizable |
| Complement notation | `A'`, `A̅`, `~A`, `!A`, `¬A` | Accept all of them on input; show an overbar in the UI; copy as text or LaTeX |

## 5. Common student mistakes → features

| Mistake | Feature |
| --- | --- |
| Missing wrap-around groups (edges, and the four corners `m0, m2, m8, m10`) | Wrapped groups are drawn as open-edged pieces on both sides of the map, in the same color |
| Groups that aren't a power of 2 or aren't rectangular | "Check my answer" explains which cells are wrong; the drawn groups show the valid shapes |
| Treating don't-cares as required 1s, or always as 0s | Steps call out which don't-cares were used and which were ignored |
| Redundant groups after every 1 is covered | Check my answer reports the extra terms or literals compared with the minimum |
| Using binary order on the axes | Gray-code labels always shown; hovering a cell shows its minterm number and inputs |
| Assuming there's only one right answer | All minimal answers are listed and can be switched on the map |

## 6. Visualization decisions

- Each group gets a distinct color from a **color-blind-safe palette** and a number, so color is never the only cue.
- Overlapping groups are inset by different amounts so their outlines don't sit on top of each other.
- Every cell shows its minterm number in a corner, which helps students check transcription.
- Hovering a term in the expression highlights its group on the map, and hovering a group highlights its term.
- The circuit is drawn as two-level AND-OR, with a NAND-NAND option. For POS it's OR-AND, with a NOR-NOR option.

## 7. How correctness is verified

| Check | Coverage |
| --- | --- |
| Result is logically equivalent to the input on every care input | **Every** function of 1–4 variables (65,536 at 4 variables); every 3-variable function with don't-cares (6,561); large random samples at 5–6 variables |
| Result is minimal and the list of minimal answers is complete | Compared with an independent brute-force search over **all** implicants (not just primes) for every function up to 3 variables (with don't-cares), and samples at 4 |
| Branch-and-bound and Petrick's method agree | Every function up to 4 variables |
| Parser round-trip | Random expressions are printed and parsed back, and the truth table must match |
| Known textbook examples | Cyclic `Σm(0,1,2,5,6,7)`, four corners, checkerboard (XOR), BCD don't-cares, the faulty tutorial example from §2 |
| UI | End-to-end browser tests of the main flows, plus an automated accessibility scan |

## 8. Tech decisions

- **TypeScript + React + Vite**, built as a static site and hosted free on **GitHub Pages**. No backend, so it works offline once loaded.
- **The engine is pure TypeScript with no DOM code**, which makes it fully unit-testable and keeps it separate from the UI.
- **Vitest** for engine tests, **Playwright** for browser tests, and **GitHub Actions** for CI and deploys.
- Bitmask representation (a term is a `value` plus a `mask`), which is fast enough for 6 variables (64 cells).

## Sources

- Wikipedia, *Petrick's method*: https://en.wikipedia.org/wiki/Petrick%27s_method
- NTHU OpenCourseWare, Digital Logic Design Unit 6, *Quine-McCluskey Method*: https://ocw.nthu.edu.tw/ocw/upload/news_attach/607/
- NCKU, *Lecture 6: Quine-McCluskey Method*: https://caslab.ee.ncku.edu.tw/dokuwiki/_media/course:logic_system:lecture_6_quine-mccluskey_method.pdf
- YSU ECEN 1521, Unit 5 outline (minimum POS definition, don't-care-only prime implicants): https://www.jazapka.people.ysu.edu/ECEN%201521%20Outline%20-%20Unit%205.pdf
- NCNU, Mano Chapter 3 slides (POS from F', don't-cares): https://oldmoodle.ncnu.edu.tw/101/mod/resource/view.php?id=246223
- Sabanci University CS303, Chapter 3 slides: https://people.sabanciuniv.edu/erkays/cs303/ch03.pdf
- ETSU, *Computer Organization and Design Fundamentals* Ch. 7 (AB-rows 3-variable layout): https://faculty.etsu.edu/tarnoff/ntes2150/Ch7_v02.pdf
- Kuphaldt, *Lessons in Electric Circuits IV*, 8.11 Larger 5 and 6-variable maps: https://workforce.libretexts.org/Bookshelves/Electronics_Technology/Electric_Circuits_IV_-_Digital_Circuitry_(Kuphaldt)/08%3A_Karnaugh_Mapping/8.11%3A_Larger_5_and_6-variable_Karnaugh_Maps
- Jutge.org, *Introduction to Karnaugh maps* (reflection vs overlay): https://xn--llions-yua.jutge.org/circuits/en/Annexos/karnaugh.html
- dCode, *Karnaugh Map*: https://www.dcode.fr/karnaugh-map
- Neura directory listing for karnaughmapsolver.com: https://www.neura.market/ai-tools-directory/new-ai-tools/karnaugh-map-solver
- Karnaugh Kmap Solver (Android) listing: https://www.bluestacks.com/apps/education/karnaugh-kmap-solver-on-pc.html
- M4rulli/K-Map-Solver: https://gh.hhj520.top/M4rulli/K-Map-Solver
- D. McCreary, *Digital Electronics*, Ch. 5 K-maps (interactive wrap-around design): https://dmccreary.github.io/digital-electronics/chapters/05-logic-minimization-kmaps
- EngineeringHulk, *K-Maps & Boolean Minimisation* (common mistakes): https://engineeringhulk.com/cs-it/digital-logic/karnaugh-maps/
- ChipVerify, *Karnaugh Maps* (Gray code mistake): https://www.chipverify.com/digital-fundamentals/karnaugh-maps
- Tutorial solution with an incorrect POS answer: https://www.scribd.com/document/753280411/Tutorial-2-Solution

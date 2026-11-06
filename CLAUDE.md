# CLAUDE.md

Instructions for Claude Code sessions working in this repo. Read this before changing anything.

## What this is

A web-based Karnaugh map solver for 2–6 variables: all minimal SOP/POS answers, groups drawn on the map, step-by-step tabular method, check my answer, circuit diagrams. Static site on GitHub Pages.

- Why it's built this way: `docs/RESEARCH.md`
- What it must do (requirement IDs FR-x / NFR-x): `docs/REQUIREMENTS.md`
- How the code is organized: `docs/ARCHITECTURE.md`

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm test` | Unit + exhaustive engine tests (Vitest) |
| `npm run e2e` | Browser tests (Playwright); needs `npm run build` first |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run verify` | **Everything**: typecheck, lint, tests, build, e2e. Run before every commit |

## Rules

1. **Engine/UI split.** All Boolean logic goes in `src/engine/` (pure TS, no React, no DOM). Components in `src/ui/` only render engine output. If you're tempted to compute something about the function in a component, add it to the engine and test it.
2. **Bit order is fixed.** Variable 0 (`A`) is the most significant bit of a minterm index. Cubes are `{ value, dashes }`. Don't introduce another representation.
3. **"Minimal" means fewest terms, then fewest literals**, and the engine returns *all* tied solutions. Don't change this without updating `docs/RESEARCH.md` §3 and the tests.
4. **Never weaken a verification test to make it pass.** If `exhaustive.test.ts` or `bruteforce.test.ts` fails, the engine is wrong. Fix the engine.
5. **Every engine change comes with tests.** Bug fix → first add a test that reproduces the bug.
6. **New features start in `docs/REQUIREMENTS.md`.** Add or update the FR row and its "Verified by" entry in the same change.
7. **Accessibility is a requirement, not polish.** New controls need keyboard access and a label; color must never be the only cue. `e2e/a11y.spec.ts` must stay green.
8. **No backend, no tracking, no new runtime dependencies** without a clear reason written in the commit message.

## Definition of done

- `npm run verify` passes locally
- Requirements doc updated if behavior changed
- UI changes checked in both light and dark themes and at 360 px width

## Project commands for Claude Code

- `/verify`: run the full check and summarize failures
- `/feature <description>`: the workflow for adding a feature (requirement → tests → code → verify)

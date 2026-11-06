---
description: Add a feature the project's way (requirement, tests, code, verify)
argument-hint: <what the feature should do>
---

Feature request: $ARGUMENTS

Follow these steps in order:

1. Read `docs/REQUIREMENTS.md` and `docs/ARCHITECTURE.md`. Decide whether this extends an existing FR or needs a new one.
2. Add or update the FR row in `docs/REQUIREMENTS.md`, including its "Verified by" entry. If it's out of scope per section 6, say so and stop.
3. Write the tests first: engine tests in `src/engine/__tests__/`, browser tests in `e2e/` if the UI changes.
4. Implement it. Logic goes in `src/engine/`; components in `src/ui/` only render (CLAUDE.md rule 1).
5. Run `npm run verify` and fix anything that fails.
6. Summarize what changed in two or three sentences.

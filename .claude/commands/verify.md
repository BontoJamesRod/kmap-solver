---
description: Run the full verification suite (typecheck, lint, tests, build, e2e) and summarize the results
---

Run `npm run verify` in the repo root.

- If everything passes, reply with one line saying so and how many tests ran.
- If something fails, show which step failed and the first relevant error for each failure, then propose a fix.
- Never edit `src/engine/__tests__/exhaustive.test.ts` or `bruteforce.test.ts` to make a failure go away. Those failures mean the engine is wrong (see CLAUDE.md rule 4).

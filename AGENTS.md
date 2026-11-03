<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commit messages carry a report

Every commit message has a subject line plus a report of the change in its
body, so `git log` doubles as the project's engineering record. Use these
sections, skipping one only when it has nothing to say:

- **What changed** — the user-visible behaviour and the files/modules touched.
- **How it works** — the mechanism: data sources, formulas, thresholds,
  caching, and why this design over the alternatives.
- **Conclusions** — what was learned while building it: what was tried and
  rejected, calibrations made on real data (before → after numbers), and
  sources or approaches ruled out and why.
- **Verified** — what was actually run and its results (typecheck, build,
  live API calls, timings, screenshots, click paths). State what was not
  tested; never imply a check that did not happen.
- **Known limitations / next steps** — gaps, heuristics not yet validated,
  and the most useful follow-up.

Keep a trivial change's report proportionate (a typo fix needs one line, not
five sections). Commits `a99ed28` and `3bacfae` are reference examples.

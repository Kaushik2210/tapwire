---
doc: spec
status: approved
---

# TapWire — Technical Spec

## How This Works, In Plain Language
TapWire is two programs that share a folder of plain files. The first is a command-line tool called `scar`. Run inside any git repo, it reads a fixing commit and writes down the mistake as a "scar" in `.scars/scars.json`. Later it reads your pending changes and checks them against those saved scars. The second program is a web dashboard. It never talks to the command-line tool; it just reads the same `.scars/` folder (`scars.json` and `events.json`) and draws the Amnesia Rate, the scar list, scar details and the feed of caught repeats. A "scar" is a saved description of a mistake; an "event" is one line saying "a new mistake was recorded" or "a repeat was caught". The Amnesia Rate is repeats divided by repeats plus new mistakes.
Why this shape: files in the repo mean no database, no accounts and no server for the CLI, and the dashboard stays a simple reader. A language model (Anthropic API) writes the scar text and does the fuzzy "is this the same mistake?" check; a mock mode swaps it for saved answers so everything runs without a key.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
1. `npm run demo` → builds the packages, creates `demo-repo/` from seed files (git history, scars, two weeks of events) and starts the dashboard pointed at it.
2. Dashboard Overview → reads `.scars/events.json`, computes the rate in `core`, draws gauge and trend.
3. `scar capture <sha>` → runs `git show` for that commit → LLM (or fixture in mock mode) returns the scar → appended to `scars.json`; a `new_mistake` event is appended to `events.json`.
4. Scripted agent step → applies a patch to `demo-repo` that reintroduces a mistake → `scar check` reads `git diff` → regex matcher flags added lines, then the LLM pass looks for semantic matches → prints hits, appends `repeat` events, exits 1.
5. `scar export` → rewrites the block between marker comments in AGENTS.md and CLAUDE.md.
6. Dashboard refresh → rate and feed update.

## Stack
- TypeScript, Node 20+, npm workspaces (monorepo): one language for CLI and dashboard. Docs: https://www.typescriptlang.org/docs/
- CLI: `commander` (https://github.com/tj/commander.js), `@anthropic-ai/sdk` (https://docs.anthropic.com/en/api/client-sdks), `vitest` for tests (https://vitest.dev).
- Dashboard: Next.js App Router (https://nextjs.org/docs/app), React, plain CSS with CSS variables (light/dark via `prefers-color-scheme`), inline SVG for gauge and trend chart (no chart library), a small hand-rolled diff view.
- TypeScript monorepo, Node CLI, Next.js App Router and the Anthropic API come from the project brief; commander, vitest and hand-drawn SVG charts are implementation details derived from them, picked to keep dependencies few.
- To verify early in the build: Next.js behaviour on Windows, and the Anthropic model id to use (one constant, overridable by `SCAR_MODEL`).

## Where It Runs and How Someone Tries It
Everything runs locally; deployment is not part of the PoC. Requirements: Node 20+, git. An API key is needed only for live mode.
- Try it: `npm install && npm run demo` (the demo sets `SCAR_MOCK=1`, no key needed). Open http://localhost:3000.
- Scripted repeat for the video: `npm run demo:repeat` (reintroduces a past mistake, runs `scar check`, then `scar export`); refresh the dashboard.
- Live mode: copy `.env.example` to `.env`, set `ANTHROPIC_API_KEY`, unset `SCAR_MOCK`.
- Public repository: https://github.com/Kaushik2210/tapwire (public, MIT, no other collaborators).
- Live dashboard (optional deployment, bundled sample data): https://tapwire-xi.vercel.app
- Demo video URL: not recorded yet.
- Recording: screen-record the terminal and dashboard side by side. Submission requires the demo video and a public GitHub repo.

## Look and Feel
Carried from `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`: calm, modern, dark-mode friendly, dense enough to feel like a real tool. System font stack for body, monospace for code and diffs; one accent colour; severity badges (critical/high/medium/low) use colour plus a text label; gauge and chart use accessible contrast; visible focus states; 44px minimum hit targets; respects `prefers-reduced-motion`. Interface copy is plain and direct. Exact tokens are chosen at build time within this direction (an assumption, flagged in the PRD).

## Components

### core (`packages/core`)
Types (`Scar`, `Event`), file store for `.scars/`, `computeAmnesiaRate`, trend bucketing by day, regex matcher over added diff lines, diff parser, and the LLM client with mock fixtures. No dependency on the CLI or dashboard.
PRD ref: `prd.md > Capture`, `prd.md > Guard`, `prd.md > Measure`.

### cli (`packages/cli`)
`scar capture <sha>`, `scar check [--staged]`, `scar export`. Readable pass/fail output; non-zero exit on hits; friendly message when there is no key and not mock mode.
PRD ref: `prd.md > Capture`, `prd.md > Guard`, `prd.md > Feed back`.

### dashboard (`apps/dashboard`)
Next.js pages: Overview `/`, Scars `/scars`, Scar detail `/scars/[id]`, Repeats `/repeats`. Server components read `.scars/` of the repo given by `SCAR_REPO` (default `demo-repo`). Loading, error and empty states for each page.
PRD ref: `prd.md > Dashboard`, `prd.md > States and Boundaries`.

### hook (`packages/core/src/hook.ts`, `scar hook install|uninstall`)
Installs a marked pre-commit hook that runs `scar check --staged` and refuses the commit on a repeat. It never overwrites or removes a hook it did not write. Added during the build; see `checklist.md > Revisions`.
PRD ref: `prd.md > Guard`.

### Try it page (`apps/dashboard/app/try`, `components/Playground.tsx`)
A server action runs the offline matcher (regex plus normalised pattern match) on pasted code against the repo's scars and returns hits by line. It records nothing. Added during the build.
PRD ref: `prd.md > Guard`, `prd.md > Dashboard`.

### Dashboard interactions (`apps/dashboard/components`)
Live refresh of `.scars/` every few seconds (`LiveStatus`), command palette (`CommandPalette`), interactive chart with keyboard support (`TrendChart`), searchable and sortable scar list (`ScarLedger`), copy buttons (`CopyButton`), light/dark/system toggle (`ThemeToggle`) and animated counters (`CountUp`). Added during the build.
PRD ref: `prd.md > Dashboard`.

### demo (`demo/`)
Seed files for a tiny Express app, a script that builds `demo-repo/` with real git commits (the fix commit for each scar), pre-seeded scars and about 14 days of events, and the repeat scenario script.
PRD ref: `prd.md > The Core Journey`.

## Data Model
`.scars/scars.json`: array of `{ id, title, whatWentWrong, badPattern, badRegex?, goodPattern, severity, sourceCommit, createdAt }`.
`.scars/events.json`: array of `{ id, type: "new_mistake" | "repeat", scarId, file?, line?, reason?, at }`.
Both live in the target repo, are appended by the CLI and read by the dashboard, and persist as files. Amnesia Rate = count(repeat) / (count(repeat) + count(new_mistake)); undefined when the denominator is 0.

## File Structure
```
tapwire/
├── packages/
│   ├── core/            # types, store, matcher, rate, hook, LLM client + fixtures, tests
│   └── cli/             # `scar` commands (capture, check, export, hook)
├── apps/dashboard/      # Next.js App Router dashboard (+ Try it page)
├── demo/                # setup, capture and repeat scripts
├── demo-repo/           # generated by `npm run demo` (gitignored)
├── docs/screenshots/    # README screenshots
├── devpost/             # planning docs, app map (learner-profile is gitignored)
├── .env.example
├── LICENSE              # MIT
├── README.md
└── DEVPOST_SUBMISSION.md
```

## External Services and Dependencies
- Anthropic Messages API (https://docs.anthropic.com/en/api/messages): POST with model, max_tokens, messages; the reply text is parsed as JSON. Needs `ANTHROPIC_API_KEY`; paid and rate limited; not needed in mock mode.
- git (local) for `git show` and `git diff`.

## Important Failure Modes
- **No key and not mock mode** → CLI explains how to set a key or use `SCAR_MOCK=1`.
- **LLM call fails or returns unparsable JSON** → capture fails with a clear message and writes nothing; check falls back to regex-only results with a notice.
- **`.scars/` missing or malformed** → dashboard shows an error or empty state with the fix; the CLI creates `.scars/` on first capture.

## What Was Simplified and Why
- **JSON files** instead of a database: no setup, easy to inspect and demo.
- **Regex plus one LLM pass** instead of embeddings or static analysis: enough to prove repeat detection.
- **Hand-drawn SVG charts** instead of a chart library: fewer dependencies.
- **Mock fixtures keyed by commit sha or diff hash** instead of a live model in the demo: deterministic demo.
- **`demo-repo/` generated at demo time** instead of a committed nested git repo: a nested `.git` cannot be committed as ordinary files.

## Decisions and Open Issues
- Stack and flow were chosen by the learner in the brief; file formats, package layout and library picks are implementation details derived from them.
- Learner uncertainty: none identified (no live interview was held; the brief was used as the answers).
- Open: exact model id and Next.js version behaviour, checked at the start of the build. Visual tokens decided at build time.

---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast (the learner asked to finish fast; hands-on checkpoints are left for the learner at the end)

## Slices

- [x] **1. You can capture a scar from a fixing commit (mock mode)**
  Becomes usable: `scar capture <sha>` in a git repo writes a scar to `.scars/scars.json` and a `new_mistake` event, with no API key.
  Why now: The kernel starts with remembering a mistake; this also bootstraps the monorepo and the core store every later slice uses.
  PRD ref: `prd.md > Capture`
  Spec ref: `spec.md > core (packages/core)`, `spec.md > cli (packages/cli)`, `spec.md > Data Model`
  Build: npm workspaces scaffold, TypeScript config, core types/store/LLM client with mock fixtures, `scar capture`.
  Verify (mechanical): Build, run `scar capture` against a temp git repo with `SCAR_MOCK=1`, confirm both JSON files are written; run it with no key and no mock and confirm the friendly message.
  Learner check: Run the capture command in a scratch repo and read the scar it wrote.
  Commit: `Add scar capture and core store`

- [x] **2. TapWire catches a repeat of a past mistake**
  Becomes usable: `scar check` flags reintroduced mistakes by file and line, logs repeat events and exits non-zero.
  Why now: This is the unique kernel (enforcement), so it comes straight after capture.
  PRD ref: `prd.md > Guard`
  Spec ref: `spec.md > core (packages/core)`, `spec.md > cli (packages/cli)`
  Build: Diff parser, regex matcher, LLM semantic pass (mock-aware), `scar check [--staged]`, matcher tests.
  Verify (mechanical): Matcher unit tests pass; `scar check` on a diff containing a known bad pattern exits 1 and logs an event; a clean diff exits 0.
  Learner check: Introduce a past mistake in a file and run `scar check` to see it blocked.
  Commit: `Add scar check with regex and semantic matching`

- [x] **3. The Amnesia Rate and export to AGENTS.md / CLAUDE.md**
  Becomes usable: Rate computation (with trend buckets) and `scar export` writing a managed section idempotently.
  Why now: Completes the CLI side of the loop and the number the dashboard will show.
  PRD ref: `prd.md > Measure`, `prd.md > Feed back`
  Spec ref: `spec.md > core (packages/core)`, `spec.md > Data Model`
  Build: `computeAmnesiaRate`, daily trend bucketing, export with marker comments.
  Verify (mechanical): Rate tests (including zero denominator) pass; running export twice yields one section and keeps other content.
  Learner check: Run `scar export` and open the instruction files to read the Scars section.
  Commit: `Add Amnesia Rate and scar export`

- [x] **4. Dashboard Overview shows the Amnesia Rate**
  Becomes usable: Next.js dashboard Overview with gauge, trend chart, headline stat, navigation, theme and empty/loading/error states.
  Why now: The dashboard is the second half of the demo and a judging criterion; get the visible loop early.
  PRD ref: `prd.md > Dashboard`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > dashboard (apps/dashboard)`, `spec.md > Look and Feel`
  Build: Next.js app reading `SCAR_REPO`, design tokens, Overview page.
  Verify (mechanical): Production build succeeds; the server returns the Overview with computed rate for a fixture repo, and an empty state for a repo with no events.
  Learner check: Open the dashboard in light and dark mode and at phone width.
  Commit: `Add dashboard overview`

- [x] **5. Scar list, scar detail and Caught-a-repeat feed**
  Becomes usable: The remaining three dashboard pages with severity badges, before/after diff and states.
  Why now: Completes the dashboard surface set.
  PRD ref: `prd.md > Dashboard`
  Spec ref: `spec.md > dashboard (apps/dashboard)`
  Build: `/scars`, `/scars/[id]`, `/repeats`, shared components, error/loading/empty states.
  Verify (mechanical): Build succeeds; each route returns 200 with expected content; an unknown scar id shows a not-found state.
  Learner check: Click through all four pages.
  Commit: `Add scars, detail and repeats pages`

- [x] **6. One-command demo**
  Becomes usable: `npm install && npm run demo` builds the seeded demo repo (3-4 scars, ~2 weeks of events) and starts the dashboard; `npm run demo:repeat` plays the repeat scenario.
  Why now: The demo is what judges and the video use; it ties all slices together.
  PRD ref: `prd.md > The Core Journey`
  Spec ref: `spec.md > demo (demo/)`, `spec.md > Where It Runs and How Someone Tries It`
  Build: Seed app files, builder script with real git commits, seeded scars/events, repeat script, root scripts.
  Verify (mechanical): Run the demo setup from a clean state; run the repeat scenario; confirm `scar check` exits 1 and the rate changes in the dashboard HTML.
  Learner check: Run the demo and the repeat scenario and watch the gauge move.
  Commit: `Add seeded demo and repeat scenario`

- [x] **7. README, license and env example**
  Becomes usable: A newcomer can understand and run the project from the README.
  Why now: Required for submission; written last so it reflects what exists.
  PRD ref: `prd.md > What We're Building`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`
  Build: README (problem, quickstart, architecture diagram, how it was built, what was learned, mock mode, license), MIT LICENSE, `.env.example`.
  Verify (mechanical): Commands in the README run as written; LICENSE and `.env.example` present.
  Learner check: Read the README top to bottom.
  Commit: `Add README, license and env example`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 3 (CLI loop), left for the learner
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

Mechanical verification of the finished build, run from a fresh clone of the public repo: `npm ci`, 19 unit tests pass, typecheck clean, dashboard production build succeeds, `demo:setup` then `demo:capture` then `demo:repeat` run end to end (rate 29% → 25% → 33%), and with the pre-commit hook installed a commit that reintroduces a scar is refused. Not verified: live LLM mode (no API key was available).

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: map generated from the finished code (snapshot of commit 71b0ce0); the guided walk-through with the learner has not happened, so the two boxes above stay unchecked.
Route and stops: reference route only, not toured: `packages/cli/src/index.ts` (check command) → `packages/core/src/check.ts` (`checkRepo`) → `packages/core/src/rate.ts` and `apps/dashboard/app/page.tsx`.
Edit outcome: not yet done
Reflection: not yet done
Activity mode: not yet done

## Revisions

- Product renamed to TapWire (from Scar Tissue) — the learner chose the new name after the planning docs were approved; the `scar` command and `.scars/` folder keep their names as the data concepts.
- Added `scar hook install|uninstall` (a local pre-commit hook), which `scope.md > Later` and `prd.md > Deferred From the POC` had deferred — the learner asked for improvements to raise the entry's strength, and the "enforced" claim was weak without it. It reuses `scar check --staged` and never overwrites a hook it did not write.
- Added a Try it page, live refresh, command palette, interactive chart, searchable scar list, copy buttons and a theme toggle to the dashboard — learner-requested polish; none changes the kernel or the core journey. `spec.md > Components` lists them.
- Mock semantic matcher changed from token overlap to a whitespace- and quote-insensitive substring match — the build found the first version flagged corrected code (for example `await loadUser`) as a repeat; `packages/core/test/core.test.ts` now pins that case.
- The Amnesia Rate explanation was added to the dashboard — a caught repeat raises the rate, which reads backwards without a note.
- `scar check` now includes brand-new untracked files and ignores TapWire's own managed files (`.scars/`, `AGENTS.md`, `CLAUDE.md`) — writing live-mode tests showed that a repeat in a new file was missed by `git diff HEAD`, and that the scar store and the exported instruction files quote bad patterns on purpose, so they flagged themselves (and would have blocked the hook on committing an export). `packages/core/test/core.test.ts` and `live.test.ts` cover both.
- Made TapWire adoptable outside this repository: a bundled, installable CLI (`@kaushik2210/tapwire`, published as a GitHub Release because the plain name `tapwire` is taken on npm), `init` and `status` commands, CI mode (`check --base`), offline and JSON output, and a hook that uses `tapwire` from PATH, falls back to the recorded install, blocks only on a real repeat and never because the tool itself failed. An audit found the earlier version only ran from a clone with hard-coded paths. `scripts/install-test.mjs` proves the installed workflow end to end.
- Added instant agent feedback (`agent-check`, `watch`, per-file checks, repeat events with a source, and de-duplicated recording) — the learner asked for a feature that stops the AI repeating mistakes; the earlier layers only caught a repeat at commit or CI time. `agent-check` follows the post-edit-hook convention (stdin JSON, exit 2 with a message for the agent) and was tested by feeding it hook JSON, not by running inside each agent product.
- Built a demo video (`video/`) from real captures with an AI voice-over — the learner asked for it. It is a draft for the learner to review and own. The voice was switched to a male Indian-English voice (Gaurav) at the learner's request; every scene now has voice-over.
- Dashboard shows bundled sample data when no repository is configured, so it can be hosted without a demo repo — added for a requested public deployment; real repositories are unaffected.
- Dashboard visual design redone (editorial type, segmented meter, event-lane chart) — the first version looked like generic default styling to the learner.


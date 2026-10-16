---
doc: prd
status: approved
---

# Scar Tissue — Product Requirements

A CLI plus web dashboard that turns an AI coding agent's fixed mistakes into enforced rules and measures how often the agent repeats them, for beginners and solo builders coding with AI agents.
Source: `scope.md > The Core Loop`, `scope.md > The Unique Kernel`, `scope.md > What "Working" Looks Like`.

## The Core Journey
1. The builder runs `npm install && npm run demo`. A seeded `demo-repo/` is prepared (3 to 4 scars, about two weeks of events) and the dashboard starts.
2. They open the dashboard Overview and see the Amnesia Rate gauge, a trend chart and a headline stat.
3. They run `scar capture <commit-sha>` in the repo. A new scar is written to `.scars/scars.json` and a "new mistake" event is logged.
4. The scripted agent step reintroduces a past mistake. `scar check` reports the scar, file, line and reason, and logs a "repeat" event. The exit code is non-zero.
5. `scar export` updates the managed "Scars" section in AGENTS.md and CLAUDE.md of the target repo.
6. Back on the dashboard the Amnesia Rate has changed, and the repeat appears in the "Caught a repeat" feed. Success is that the number moves and the repeat is visibly blocked.
(Source: `scope.md > The Core Loop`)

## Screens and Layout
The CLI (capture, check, export) and four dashboard pages in one app with a persistent top or side navigation, a repo-path indicator, and a theme that follows the system:
1. **Overview** — Amnesia Rate gauge, trend chart over time, headline stat (for example repeats caught in the period).
2. **Scars** — timeline/list of scars, each with a severity badge.
3. **Scar detail** — title, what went wrong, severity, before/after diff (bad pattern vs correct pattern), and related repeat events.
4. **Caught a repeat** — feed of blocked repeats: scar, file/line, time.

## Look and Feel
Clean, modern, dark-mode friendly, responsive, polished enough to feel like a finished product. Severity is conveyed by badge colour plus a text label (not colour alone). Specific fonts, palette and references were not given in the brief; `4-spec` should choose a restrained, accessible system consistent with this direction (assumption, flagged below). CLI output is readable and scannable, with clear pass/fail wording.

## Features and Behavior

### Capture
- As a solo builder, I want to turn a fixing commit into a scar so that the mistake is remembered.
  - [ ] `scar capture <sha>` writes a scar with title, what went wrong, bad pattern (optional regex), correct pattern and severity to `.scars/scars.json`.
  - [ ] A "new mistake" event is added to `.scars/events.json`.
  - [ ] With `SCAR_MOCK=1` it works with no API key using fixtures.

### Guard
- As a solo builder, I want to be warned when the agent reintroduces a fixed bug so that I stop it before it lands.
  - [ ] `scar check` inspects the staged or working diff, matching regex patterns first, then an LLM pass for semantic matches.
  - [ ] Each hit prints scar, file/line and reason, and logs a "repeat" event.
  - [ ] A clean diff prints a pass message and exits zero; a hit exits non-zero.

### Feed back
- As a solo builder, I want the agent to read past mistakes before coding so that it makes fewer.
  - [ ] `scar export` creates or updates a managed "Scars" section in AGENTS.md and CLAUDE.md without touching other content, and re-running it does not duplicate the section.

### Measure
- As a solo builder, I want a single number showing whether the agent is repeating mistakes so that I can tell if this works.
  - [ ] Amnesia Rate = repeat events / (repeat events + new mistake events), shown as a gauge and a trend over time.
  - [ ] Running the demo repeat scenario changes the displayed rate.

### Dashboard
  - [ ] Four pages render from the `.scars/` folder of a chosen repo path.
  - [ ] Scar list shows severity badges; scar detail shows a before/after diff.
  - [ ] Layout is usable at phone width and in light and dark modes.

## States and Boundaries
- **First use / empty** — no `.scars/` or no events: friendly empty state explaining how to capture the first scar; rate shows "no data", not 0% or NaN.
- **Zero denominator** — no repeat or new events: rate is undefined and displayed as "no data".
- **Loading** — skeleton or spinner while data loads.
- **Error** — missing or unreadable repo path, or malformed JSON: clear message with a way to fix it.
- **No API key** — without `ANTHROPIC_API_KEY` and without `SCAR_MOCK=1`, the CLI explains how to set a key or enable mock mode; it never crashes with a stack trace.
- **Persistence** — scars and events persist as files in the target repo's `.scars/`; no other storage.
- **Secrets** — keys come from the environment only and are never committed; `.env.example` is provided.

## Product Decisions
- Single end-to-end flow, kept tight — to fit the hackathon time box.
- Mock mode is required and covers the full demo — judges may run it without a key.
- Regex first, LLM second in `scar check` — fast and offline where possible.
- Dashboard reads files, with no server database — keeps the proof simple.
- Amnesia Rate defined as repeats / (repeats + new mistakes) — the brief's definition.

## What We're Building
Everything under Core Journey and Features: CLI capture/check/export, the four-page dashboard with empty/loading/error states, mock mode, `demo-repo/` with `npm run demo`, tests for matcher and rate, README, MIT license.

## Deferred From the POC
- Git hook / CI enforcement — manual `scar check` is enough to prove the loop.
- Multi-repo and team views — one repo path at a time.
- Rule formats for other agents beyond AGENTS.md and CLAUDE.md.

## Possible Later Enhancements
Scar editing and retirement in the dashboard; severity-weighted rate; auto-capture from commit messages.

## Non-Goals
- Accounts, auth, hosting or deployment — not needed to demonstrate the loop.
- Supporting many languages — the demo app sets the matcher scope.
- Replacing code review or linters — Scar Tissue only remembers and enforces past mistakes.

## Open Questions
- Visual specifics (fonts, palette): assumption, decided in `4-spec` within the direction above. Can wait.
- Which of Express or Flask the demo app uses: decided in `4-spec`. Can wait.

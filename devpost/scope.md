---
doc: scope
status: approved
---

# TapWire

Turns every mistake an AI coding agent makes into a permanent, enforced rule, and measures how often the agent repeats fixed mistakes.

## The Unique Kernel
Passive notes (AGENTS.md, rules files) store past mistakes but never enforce or measure them. TapWire closes the loop: a fixed bug becomes a "scar" that is checked against every future diff, and the result is a number, the Amnesia Rate, showing how often the agent repeats fixed mistakes.

## Who It's For
A beginner or solo builder who codes with an AI agent (Codex, Cursor and similar). They fix a bug, then watch the agent reintroduce the same bug a few days later, and today their only defence is a notes file the agent may ignore.

## The Core Loop
1. Capture: `scar capture <commit-sha>` reads the fixing commit and writes a scar (title, what went wrong, bad pattern with optional regex, correct pattern, severity) into `.scars/scars.json`.
2. Guard: `scar check` reads the staged or working diff and flags code that reintroduces a scar (regex first, then an LLM pass for semantic matches). Hits are logged as repeat events; captures are logged as new-mistake events.
3. Feed back: `scar export` writes a managed "Scars" section into AGENTS.md and CLAUDE.md so the agent reads past mistakes before coding.
4. Measure: a dashboard shows Amnesia Rate = repeats / (repeats + new mistakes), over time.
They come back because the number goes down when the system works.

## Inspiration & Identity
Clean, modern, dark-mode friendly dashboard that feels like a finished product, not a proof of concept. Design is one of four judging criteria (Design, Potential Impact, Innovation, Presentation).

## Why This Matters to the Learner
Not established. The brief states the problem (agents repeat fixed bugs and forget decisions) but not a personal story.

## What "Working" Looks Like
From a clean clone, `npm install && npm run demo` sets up a seeded demo repo with 3 to 4 scars and about two weeks of event history. A scripted "agent repeats the mistake" scenario makes `scar check` visibly catch a repeat, and the dashboard's Amnesia Rate changes. The "oh, that's cool" beat: a repeat is blocked and the gauge moves on screen. Everything also runs with `SCAR_MOCK=1` and no API key.

## The POC Boundary
- Node CLI (`scar`) with capture, check, export.
- Next.js dashboard reading a chosen repo's `.scars/` folder: Overview (gauge, trend, headline stat), scar timeline/list with severity badges, scar detail with before/after diff, "Caught a repeat" feed; empty, loading and error states.
- Anthropic API via `ANTHROPIC_API_KEY` from env; mock mode with fixtures.
- `demo-repo/` with seeded scars and events; `npm run demo`.
- Tests for the matcher and the Amnesia Rate; README; MIT license.

## Later
Git hooks and CI integration, more agents' rule file formats, multi-repo views, team sharing of scars.

## Explicitly Cut
- Auth, accounts, hosting or deployment: not needed to prove the loop.
- Editing scars in the dashboard: capture is CLI-only for the PoC.
- Languages beyond the demo app's: keeps the matcher tight.

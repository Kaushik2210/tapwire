# Scar Tissue: Devpost submission prep

This file is working material for the submission. It holds facts, prompts, the shot list and the checklist. The project name, short description and exit-survey answers on Devpost are written by you in your own words (the 6-ship step of the skill pack requires submission copy to be human-written).

## 1. Facts to draw on for your description

Everything below is checkable in this repository.

- **What it is:** a TypeScript CLI (`scar`) plus a Next.js dashboard. Both work on the same two JSON files in a repo's `.scars/` folder.
- **Capture:** `scar capture <sha>` turns a fixing commit into a scar (title, what went wrong, bad pattern with optional regex, correct pattern, severity) and logs a `new_mistake` event.
- **Guard:** `scar check` scans the staged or working diff. Regex runs first, then an LLM pass for semantic matches. Each hit gives scar, file, line and reason, logs a `repeat` event and exits 1.
- **Feed back:** `scar export` writes a managed "Scars" section into `AGENTS.md` and `CLAUDE.md`, replaced in place on re-runs.
- **Measure:** Amnesia Rate = repeats ÷ (repeats + new mistakes), shown as a gauge, a trend chart and a headline stat; plus a scar list, scar detail with before/after, and a "Caught repeats" feed. Empty, loading and error states exist.
- **Who it's for:** beginners and solo builders who code with AI agents.
- **Mock mode:** `SCAR_MOCK=1` runs the full demo with no API key.
- **Verified:** 15 unit tests (matcher, diff parser, rate, trend, export, mock capture); capture, check and export run end to end against a generated demo repo; all four dashboard pages render, including not-found and missing-repo states.
- **Not verified:** live mode against the real LLM API (no key was available while building).
- **Honest caveat worth knowing:** a blocked repeat is recorded as a repeat, so the rate goes *up* when the guard fires and *down* when a new scar is captured.

## 2. Questions to answer in your own words

Use these to write the Devpost fields yourself.

- What did you make, and who is it for?
- What is the one thing that makes it different from a notes file like `AGENTS.md`?
- What did you learn while building it (about the idea, the tools, or working with an agent)?
- What would you do next?

## 3. Demo video: shot list (target 2:30, hard limit under 3:00)

Record the terminal and the dashboard in a clean window with no other apps, tabs or credentials visible. Run `npm run demo` beforehand so the dashboard is open at <http://localhost:3000>. Reset between takes with `npm run demo:setup`. These are screen actions and timings only; the spoken words are yours.

| Time | Shot | On screen |
| --- | --- | --- |
| 0:00 to 0:15 | **Hook: the pain** | `git log` of `demo-repo` showing the fix commit "validate the redirect target after login", then the same unsafe line reappearing in a diff. |
| 0:15 to 0:35 | **The baseline** | Dashboard Overview: Amnesia Rate gauge at 29%, trend chart, headline stat (2 repeats across 5 scars). |
| 0:35 to 1:05 | **Capture a scar** | `npm run demo:capture`. Then the Scars page: the new "Pagination skipped the first page of results" scar. Back on Overview the gauge has dropped to 25%. |
| 1:05 to 1:30 | **The agent repeats the mistake** | `npm run demo:repeat`: the scripted agent edits `src/routes/auth.js` and reintroduces `res.redirect(req.query.next)`. |
| 1:30 to 1:55 | **Scar Tissue blocks it** | The `scar check` output: scar name, `src/routes/auth.js:9`, reason, the correct pattern, non-zero exit. |
| 1:55 to 2:10 | **Feed it back** | `scar export` output, then open the "Scars" section in `AGENTS.md`. |
| 2:10 to 2:30 | **Result and impact** | Dashboard: "Caught repeats" feed with the new entry, gauge at 33%, scar detail with before/after. End on the Overview. |

Take notes while recording: the Amnesia Rate goes 29% → 25% (capture) → 33% (repeat caught). If you want the closing beat to show the rate falling, capture one more scar after the repeat instead of ending on the feed.

## 4. Pre-submit checklist

- [ ] GitHub repository is **public** and its About section shows the MIT license.
- [ ] Repository has no collaborators other than you (Settings → Collaborators).
- [ ] `LICENSE`, `README.md`, `.env.example` and the planning docs (`devpost/scope.md`, `prd.md`, `spec.md`, `checklist.md`) are present on the default branch.
- [ ] Clean-clone test passed: `git clone`, `npm install && npm run demo`.
- [ ] No secrets or personal files in the repo or its history; `devpost/learner-profile.md` is not committed.
- [ ] Demo video is under 3:00, shows the working flow, and is public or unlisted on YouTube or Vimeo; link tested in a private window.
- [ ] Project name, description and other Devpost fields written by you; exit survey completed by you.
- [ ] Submit on Devpost before the deadline (Oct 26).

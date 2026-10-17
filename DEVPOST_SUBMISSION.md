# TapWire: Devpost submission prep

This file is working material for the submission. It holds facts, prompts, the shot list and the checklist. The project name, short description and exit-survey answers on Devpost are written by you in your own words (the 6-ship step of the skill pack requires submission copy to be human-written).

## 1. Facts to draw on for your description

Everything below is checkable in this repository.

- **What it is:** a TypeScript CLI (`scar`) plus a Next.js dashboard. Both work on the same two JSON files in a repo's `.scars/` folder.
- **Capture:** `scar capture <sha>` turns a fixing commit into a scar (title, what went wrong, bad pattern with optional regex, correct pattern, severity) and logs a `new_mistake` event.
- **Guard:** `scar check` scans the staged or working diff. Regex runs first, then an LLM pass for semantic matches. Each hit gives scar, file, line and reason, logs a `repeat` event and exits 1.
- **Instant agent feedback:** `tapwire agent-check` runs right after an AI agent edits a file (an agent's post-edit hook feeds it the edit as JSON on stdin). If the edit repeats a past mistake, the agent gets a message with what it wrote, why it is wrong and what to do instead (exit code 2), and can fix it in the same turn. `tapwire watch` does the same for editors without hooks, and the dashboard shows how each repeat was caught (agent hook, pre-commit hook, watch mode or manual check).
- **Feed back:** `scar export` writes a managed "Scars" section into `AGENTS.md` and `CLAUDE.md`, replaced in place on re-runs.
- **Measure:** Amnesia Rate = repeats ÷ (repeats + new mistakes), shown as a gauge, a trend chart and a headline stat; plus a scar list, scar detail with before/after, and a "Caught repeats" feed. Empty, loading and error states exist.
- **Who it's for:** beginners and solo builders who code with AI agents.
- **Mock mode:** `SCAR_MOCK=1` runs the full demo with no API key.
- **Verified:** 53 tests (matcher, diff parser, rate, trend, export, hook, mock capture, and 13 live-mode tests against a local stand-in for the Anthropic API); capture, check and export run end to end against a generated demo repo; an install test (`npm run test:install`, 27 checks) that packs the CLI, installs it into an empty project and runs init, capture, check, agent-check with real hook JSON on stdin, watch as a live process, the pre-commit hook (blocking and allowing real `git commit` calls) and CI mode on a fresh repository; every dashboard page renders (including not-found, missing-repo and bundled-sample-data states); all dashboard text colours meet WCAG AA in both themes (`npm run a11y:contrast`).
- **Not verified:** how the real model behaves. The live code path is tested against a local stand-in for the API, but `npm run live:test` (about four real requests) has not been run with a real key. Run it once and note the result before submitting.
- **Honest caveat worth knowing:** a blocked repeat is recorded as a repeat, so the rate goes *up* when the guard fires and *down* when a new scar is captured.

- **Links:** repository https://github.com/Kaushik2210/tapwire; live dashboard https://tapwire-xi.vercel.app (optional on Devpost; it does not replace the video). The live site shows bundled sample data, so say so rather than implying it is a hosted service.

## 2. Questions to answer in your own words

Use these to write the Devpost fields yourself.

- What did you make, and who is it for?
- What is the one thing that makes it different from a notes file like `AGENTS.md`?
- What did you learn while building it (about the idea, the tools, or working with an agent)?
- What would you do next?

## 3a. The demo video that has been made for you

A draft demo video is built from real terminal output and real 1080p captures of the dashboard, with an Indian-English AI voice-over and captions: see `video/` (`video/README.md` explains how to rebuild or change it). It is about 2 minutes 20 seconds, well under the 3-minute limit. Before you use it:

- Watch it all the way through and decide whether you are happy with it. The narration is AI-written and AI-voiced (`video/narration.json`); change any line, or record your own voice.
- The skill pack asks that Devpost submission text be your own writing. Check whether that also covers an AI-written narration, and edit or replace it if so.
- Scene 6 (the dashboard) currently plays with on-screen callouts and captions only: its voice clip could not be generated because the voice service disabled free-tier access on the connected account. Fix that account issue with the provider, generate that one clip into `video/public/audio/06-dashboard.mp3`, and re-render.
- You still have to upload the video (YouTube or Vimeo) and paste the link.

## 3b. Shot list if you record your own take (target 2:30, hard limit under 3:00)

Record the terminal and the dashboard in a clean window with no other apps, tabs or credentials visible. Run `npm run demo` beforehand so the dashboard is open at <http://localhost:3000>. Reset between takes with `npm run demo:setup`. These are screen actions and timings only; the spoken words are yours.

| Time | Shot | On screen |
| --- | --- | --- |
| 0:00 to 0:15 | **Hook: the pain** | `git log` of `demo-repo` showing the fix commit "validate the redirect target after login", then the same unsafe line reappearing in a diff. |
| 0:15 to 0:35 | **The baseline** | Dashboard Overview: Amnesia Rate gauge at 29%, trend chart, headline stat (2 repeats across 5 scars). |
| 0:35 to 1:05 | **Capture a scar** | `npm run demo:capture`. Then the Scars page: the new "Pagination skipped the first page of results" scar. Back on Overview the gauge has dropped to 25%. |
| 1:05 to 1:30 | **The agent repeats the mistake** | `npm run demo:repeat`: the scripted agent edits `src/routes/auth.js` and reintroduces `res.redirect(req.query.next)`. |
| 1:30 to 1:55 | **TapWire blocks it** | The `scar check` output: scar name, `src/routes/auth.js:9`, reason, the correct pattern, non-zero exit. |
| 1:55 to 2:10 | **Feed it back** | `scar export` output, then open the "Scars" section in `AGENTS.md`. |
| 2:10 to 2:30 | **Result and impact** | Dashboard: "Caught repeats" feed with the new entry, gauge at 33%, scar detail with before/after. End on the Overview. |

Optional extra beats if there is time (keep the total under 3:00): the "Try it" page (`/try`, paste code and watch it flag the line), and the pre-commit hook refusing a commit (`npm run scar -- --repo demo-repo hook install`, then try to commit the repeated line). With the Overview open during `npm run demo:repeat`, the dashboard updates itself without a reload, which films well.

Take notes while recording: the Amnesia Rate goes 29% → 25% (capture) → 33% (repeat caught). If you want the closing beat to show the rate falling, capture one more scar after the repeat instead of ending on the feed.

## 4. Pre-submit checklist

Already verified (from a fresh unauthenticated clone of the public repo): the repo is public at https://github.com/Kaushik2210/tapwire, MIT licence is detected, you are the only collaborator, `npm ci`, tests, typecheck, build and the demo flow all pass, and the history contains no secrets, `.env` files or the private learner profile. Still yours to do: the items below that are unchecked.

- [x] GitHub repository is **public** and its About section shows the MIT license.
- [x] Repository has no collaborators other than you (Settings → Collaborators).
- [x] `LICENSE`, `README.md`, `.env.example` and the planning docs (`devpost/scope.md`, `prd.md`, `spec.md`, `checklist.md`) are present on the default branch.
- [x] Clean-clone test passed: `git clone`, `npm install && npm run demo`.
- [x] No secrets or personal files in the repo or its history; `devpost/learner-profile.md` is not committed.
- [ ] Demo video is under 3:00, shows the working flow, and is public or unlisted on YouTube or Vimeo; link tested in a private window.
- [ ] Project name, description and other Devpost fields written by you; exit survey completed by you.
- [ ] Submit on Devpost before the deadline (Oct 26).

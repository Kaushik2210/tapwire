# TapWire demo video

Source for the demo video: about 2 minutes 10 seconds, 1920×1080, 30 fps, with a male Indian-English AI voice-over (Gaurav) and captions.

Everything on screen is real:

- The **terminal scenes** show the real output of the real commands (`tapwire capture`, the agent feedback loop, a refused `git commit`), recorded by `capture.mjs` into `public/data/terminal.json`.
- The **dashboard scenes** are 1920×1080 screenshots of the real dashboard, taken by driving a real browser through each stage of the story (`public/shots/`), plus the live site at https://tapwire-xi.vercel.app.
- The demo runs in **mock mode** (no API key), and the video says so.

## Files

| Path | What it is |
| --- | --- |
| `narration.json` | The words of each scene. **Edit these to change the voice-over.** |
| `public/audio/*.mp3` | One narration clip per scene (the male voice, Gaurav). |
| `public/audio-vanishree/*.mp3` | An earlier female take (Vanishree) for 7 of the 8 scenes, kept as an alternative. Copy files over `public/audio/` to switch. |
| `capture.mjs` | Records the real terminal output and the 1080p dashboard shots. |
| `src/` | The Remotion video: scenes, terminal and browser mock-ups, captions, timing. |
| `out/` | Rendered video (not committed). |

Scene length follows each audio clip's real duration, so changing a line and regenerating its clip re-times the video by itself. A scene with no audio file plays with on-screen captions only.

## Rebuild it

```bash
cd video
npm install
npm run capture     # needs the dashboard built:  npm run build --workspace @scar/dashboard   (from the repo root)
npm run render      # writes out/tapwire-demo.mp4
```

`npm run studio` opens Remotion Studio to scrub through the video. The renderer uses an installed Edge or Chrome (set `REMOTION_BROWSER` to choose one).

## About the voice-over

The narration is AI-generated speech reading the text in `narration.json`. The wording was drafted for this demo and is not your own submission copy: read it, change anything that does not sound like you, and regenerate the affected clip. If you would rather record your own voice, put your recordings in `public/audio/` with the same file names and re-render.

The hackathon's skill pack asks that Devpost submission text be written by you. Check whether that also covers an AI-written narration before you submit, and edit or replace it if so.

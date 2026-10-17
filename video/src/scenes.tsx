import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import terminal from "../public/data/terminal.json";
import { C, FONT_MONO, FONT_SANS, FONT_SERIF, FPS, LEAD_SECONDS } from "./theme";
import { BrowserFrame, Chip, Heading, Logo, Shot, Terminal, ease, useProgress, type TLine } from "./ui";

export type SceneProps = { frames: number; scale: number; hasAudio: boolean };

/** Narration-time seconds (as designed) to scene frames, scaled to the real clip length and offset by the lead-in. */
const timer = (scale: number) => (s: number) => Math.round((s * scale + LEAD_SECONDS) * FPS);

const rise = (p: number, dy = 36): React.CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * dy}px)` });

function typedThen(cmd: string, cmdStart: number, outputs: string[], outStart: number, gap: number): TLine[] {
  return [
    { text: `$ ${cmd}`, start: cmdStart, typed: true },
    ...outputs.map((text, i) => ({ text, start: outStart + Math.round(i * gap) })),
  ];
}

/* 1. The hook: you fix it Monday, it is back on Friday. */
export const S1: React.FC<SceneProps> = ({ scale }) => {
  const t = timer(scale);
  const head = useProgress(t(0.2), 24);
  const mon = useProgress(t(3.6), 20);
  const fri = useProgress(t(5.8), 20);
  const stamp = useProgress(t(9.0), 12);
  const note = useProgress(t(12.4), 20);
  return (
    <AbsoluteFill style={{ padding: "90px 130px" }}>
      <div style={rise(head)}>
        <Heading size={104}>AI agents forget.</Heading>
        <div style={{ fontFamily: FONT_SANS, fontSize: 36, color: C.dim, marginTop: 14 }}>And the bugs you already fixed come back.</div>
      </div>
      <div style={{ position: "absolute", left: 130, top: 360, ...rise(mon) }}>
        <Chip color={C.good} style={{ marginBottom: 16 }}>Monday · you fix it</Chip>
        <Terminal
          width={810}
          height={350}
          fontSize={23}
          title="git"
          lines={[
            { text: '$ git commit -m "fix: validate the redirect target"', start: t(3.8), typed: true },
            { text: "  - res.redirect(req.query.next);", start: t(4.9) },
            { text: "  + res.redirect(safeNext(req.query.next));", start: t(5.3) },
            { text: "  ✔ fixed", start: t(5.6), color: C.good },
          ]}
        />
      </div>
      <div style={{ position: "absolute", left: 980, top: 360, ...rise(fri) }}>
        <Chip color={C.bad} style={{ marginBottom: 16 }}>Friday · the agent writes it again</Chip>
        <div style={{ position: "relative" }}>
          <Terminal
            width={810}
            height={350}
            fontSize={23}
            title="agent"
            lines={[
              { text: "$ agent: “tidy the login flow”", start: t(6.0), typed: true },
              { text: "  - res.redirect(safeNext(req.query.next));", start: t(7.2), color: C.dim },
              { text: "  + res.redirect(req.query.next);", start: t(7.7), color: C.bad },
              { text: "  ✖ the very same bug", start: t(8.6), color: C.bad },
            ]}
          />
          <div style={{ position: "absolute", right: 34, top: 78, transform: `rotate(-6deg) scale(${0.6 + 0.4 * stamp})`, opacity: stamp, border: `5px solid ${C.bad}`, color: C.bad, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 40, padding: "8px 22px", borderRadius: 10, letterSpacing: 3 }}>
            THE SAME BUG
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 850, textAlign: "center", fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 44, color: C.dim, ...rise(note, 14) }}>
        A note in a rules file doesn’t enforce anything.
      </div>
    </AbsoluteFill>
  );
};

/* 2. What TapWire is. */
export const S2: React.FC<SceneProps> = ({ scale }) => {
  const t = timer(scale);
  const logo = useProgress(t(0.1), 26);
  const word = useProgress(t(0.5), 26);
  const tag = useProgress(t(2.4), 22);
  const steps = ["Capture", "Guard", "Feed back", "Measure"];
  const formula = useProgress(t(9.6), 20);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 90 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 36, marginBottom: 26 }}>
        <div style={{ opacity: logo, transform: `scale(${0.6 + 0.4 * logo})` }}>
          <Logo size={170} />
        </div>
        <div style={{ ...rise(word, 24) }}>
          <Heading size={190}>TapWire</Heading>
        </div>
      </div>
      <div style={{ fontFamily: FONT_SANS, fontSize: 40, color: C.dim, textAlign: "center", maxWidth: 1600, lineHeight: 1.3, ...rise(tag, 18) }}>
        Turns every mistake an AI agent makes into a permanent, <span style={{ color: C.text }}>enforced</span> rule.
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 64 }}>
        {steps.map((s, i) => {
          const p = ease((useCurrentFrame() - t(5.6 + i * 0.9)) / 16);
          return (
            <React.Fragment key={s}>
              <div style={{ ...rise(p, 20), fontFamily: FONT_SANS, fontWeight: 700, fontSize: 34, color: C.text, border: `2px solid ${C.line}`, background: C.surface, borderRadius: 16, padding: "14px 30px" }}>
                <span style={{ color: C.accent, fontFamily: FONT_MONO, marginRight: 12 }}>{i + 1}</span>
                {s}
              </div>
              {i < steps.length - 1 ? <span style={{ color: C.dim, fontSize: 34, opacity: p }}>→</span> : null}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ marginTop: 52, fontFamily: FONT_MONO, fontSize: 30, color: C.warn, ...rise(formula, 14) }}>
        Amnesia Rate = repeats ÷ (repeats + new mistakes)
      </div>
    </AbsoluteFill>
  );
};

/* 3. Capture a scar. */
export const S3: React.FC<SceneProps> = ({ scale }) => {
  const t = timer(scale);
  const frame = useCurrentFrame();
  const gl = terminal.gitLog.split("\n").slice(0, 3);
  const cap = terminal.capture.split("\n");
  const shot = useProgress(t(9.2), 22);
  const zoom = useProgress(t(10.4), 30);
  const swap = ease((frame - t(17.2)) / 20);
  const badge = useProgress(t(18.5), 18);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 80, top: 100 }}>
        <Terminal
          width={900}
          height={720}
          fontSize={23}
          title="my-app"
          lines={[
            ...typedThen("git log --oneline -3", t(0.8), gl, t(2.4), 0.2 * FPS),
            ...typedThen("tapwire capture --export", t(5.0), cap, t(7.6), 0.55 * FPS),
          ]}
        />
      </div>
      <div style={{ position: "absolute", left: 990, top: 170, ...rise(shot, 30) }}>
        <BrowserFrame url={swap > 0.5 ? "localhost:3000/scars/scar-001" : "localhost:3000/scars"} width={880}>
          <div style={{ position: "relative", width: 880, height: 495 }}>
            <div style={{ position: "absolute", inset: 0, opacity: 1 - swap }}>
              <Shot src="shots/scars-b.png" width={880} focus={{ x: 404, y: 403, w: 1112, h: 113 }} p={zoom} highlights={[{ x: 404, y: 403, w: 1112, h: 113, show: zoom, label: "The new scar" }]} />
            </div>
            <div style={{ position: "absolute", inset: 0, opacity: swap }}>
              <Shot src="shots/scar-detail-c.png" width={880} />
            </div>
          </div>
        </BrowserFrame>
        <div style={{ marginTop: 30, ...rise(badge, 10) }}>
          <Chip color={C.warn}>mock mode · no API key</Chip>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* 4. The agent feedback loop (the heart of the demo). */
export const S4: React.FC<SceneProps> = ({ scale }) => {
  const t = timer(scale);
  const frame = useCurrentFrame();
  const raw = terminal.agent.split("\n");
  const starts = [1.0, 7.0, 16.8, 21.6].map(t);
  const lines: TLine[] = [];
  let g = -1;
  let n = 0;
  for (const text of raw) {
    if (text.startsWith("▍")) {
      g += 1;
      n = 0;
    }
    const gi = Math.max(g, 0);
    lines.push({ text, start: starts[Math.min(gi, 3)] + Math.round(n * 0.2 * FPS) });
    n += 1;
  }
  const active = starts.filter((s) => frame >= s).length - 1;
  const steps = [
    ["1", "The agent writes the old mistake", C.bad],
    ["2", "TapWire answers instantly: what, why, what instead", C.warn],
    ["3", "The agent rewrites the line correctly", C.cyan],
    ["4", "Next check: clean. Fixed in the same turn", C.good],
  ] as const;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 70, top: 90 }}>
        <Terminal width={1250} height={800} fontSize={23} title="agent session · post-edit hook" lines={lines} />
      </div>
      <div style={{ position: "absolute", left: 1370, top: 110, width: 490 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 20, letterSpacing: 2, color: C.dim, marginBottom: 22 }}>THE FEEDBACK LOOP</div>
        {steps.map(([num, label, color], i) => {
          const on = i <= active;
          const cur = i === active;
          return (
            <div key={num} style={{ display: "flex", gap: 18, alignItems: "flex-start", padding: "20px 22px", marginBottom: 18, borderRadius: 16, border: `2px solid ${cur ? color : C.line}`, background: cur ? "rgba(255,255,255,0.05)" : C.surface, opacity: on ? 1 : 0.35, boxShadow: cur ? `0 0 40px -10px ${color}` : "none" }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 30, fontWeight: 700, color }}>{num}</div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 28, lineHeight: 1.25, color: C.text }}>{label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* 5. The pre-commit hook and CI. */
export const S5: React.FC<SceneProps> = ({ scale }) => {
  const t = timer(scale);
  const out = terminal.commit.split("\n");
  const stamp = useProgress(t(5.6), 12);
  const ci = useProgress(t(7.4), 18);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 190, top: 110 }}>
        <div style={{ position: "relative" }}>
          <Terminal
            width={1540}
            height={640}
            fontSize={27}
            title="my-app · git commit"
            lines={[{ text: '$ git commit -m "tidy login flow"', start: t(0.8), typed: true }, ...out.map((text, i) => ({ text, start: t(2.2) + Math.round(i * 0.3 * FPS) }))]}
          />
          <div style={{ position: "absolute", right: 50, top: 110, transform: `rotate(-5deg) scale(${0.6 + 0.4 * stamp})`, opacity: stamp, border: `6px solid ${C.bad}`, color: C.bad, background: "rgba(12,12,14,0.85)", fontFamily: FONT_MONO, fontWeight: 700, fontSize: 52, padding: "10px 28px", borderRadius: 12, letterSpacing: 4 }}>
            COMMIT BLOCKED
          </div>
        </div>
        <div style={{ marginTop: 44, display: "flex", alignItems: "center", gap: 20, ...rise(ci, 14) }}>
          <Chip color={C.cyan}>In CI</Chip>
          <span style={{ fontFamily: FONT_MONO, fontSize: 30, color: C.text }}>tapwire check --base origin/main</span>
          <span style={{ fontFamily: FONT_SANS, fontSize: 28, color: C.dim }}>fails a pull request that repeats a mistake</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* 6. The dashboard: measured, and how each repeat was caught. */
export const S6: React.FC<SceneProps> = ({ scale }) => {
  const t = timer(scale);
  const frame = useCurrentFrame();
  const enter = useProgress(t(0.1), 22);
  const zoom1 = useProgress(t(0.9), 30);
  const swap = ease((frame - t(8.2)) / 22);
  const zoom2 = useProgress(t(9.0), 28);
  const h1 = useProgress(t(1.6), 14);
  const c1 = useProgress(t(10.2), 14);
  const c2 = useProgress(t(12.6), 14);
  const c3 = useProgress(t(15.0), 14);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 270, top: 70, ...rise(enter, 30) }}>
        <BrowserFrame url={swap > 0.5 ? "localhost:3000/repeats" : "localhost:3000"} width={1380}>
          <div style={{ position: "relative", width: 1380, height: 776 }}>
            <div style={{ position: "absolute", inset: 0, opacity: 1 - swap }}>
              <Shot src="shots/overview-c.png" width={1380} focus={{ x: 404, y: 253, w: 1112, h: 500 }} p={zoom1} highlights={[{ x: 441, y: 285, w: 640, h: 440, show: h1, label: "Amnesia Rate" }]} />
            </div>
            <div style={{ position: "absolute", inset: 0, opacity: swap }}>
              <Shot
                src="shots/repeats-c.png"
                width={1380}
                focus={{ x: 404, y: 290, w: 1112, h: 640 }}
                p={zoom2}
                highlights={[
                  { x: 1306, y: 328, w: 128, h: 34, show: c1, label: "caught by the agent hook", labelRight: true },
                  { x: 1272, y: 562, w: 160, h: 34, show: c2, label: "by the pre-commit hook", labelRight: true },
                  { x: 1293, y: 795, w: 140, h: 34, show: c3, label: "by a manual check", labelRight: true },
                ]}
              />
            </div>
          </div>
        </BrowserFrame>
      </div>
    </AbsoluteFill>
  );
};

/* 7. Try it, live. */
export const S7: React.FC<SceneProps> = ({ scale }) => {
  const t = timer(scale);
  const enter = useProgress(t(0.1), 22);
  const zoom = useProgress(t(2.6), 30);
  const hit = useProgress(t(3.4), 14);
  const card = useProgress(t(4.6), 14);
  const chip = useProgress(t(5.8), 16);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 270, top: 70, ...rise(enter, 30) }}>
        <BrowserFrame url="tapwire-xi.vercel.app/try" width={1380}>
          <Shot
            src="shots/live-try.png"
            width={1380}
            focus={{ x: 404, y: 279, w: 1112, h: 524 }}
            p={zoom}
            highlights={[
              { x: 997, y: 432, w: 494, h: 24, show: hit },
              { x: 997, y: 510, w: 494, h: 203, show: card, label: "the exact line, and what to do instead" },
            ]}
          />
        </BrowserFrame>
      </div>
      <div style={{ position: "absolute", left: 270, top: 12, ...rise(chip, 10) }}>
        <Chip color={C.good}>Live site · no install · no API key</Chip>
      </div>
    </AbsoluteFill>
  );
};

/* 8. Close. */
export const S8: React.FC<SceneProps> = ({ scale }) => {
  const t = timer(scale);
  const head = useProgress(t(0.2), 24);
  const links = useProgress(t(9.0), 18);
  const tag = useProgress(t(11.6), 22);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 90 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28, ...rise(head, 20) }}>
        <Logo size={110} />
        <Heading size={130}>TapWire</Heading>
      </div>
      <div style={{ marginTop: 44 }}>
        <Terminal
          width={1500}
          height={240}
          fontSize={24}
          title="one command"
          lines={[
            { text: "$ npm install -g https://github.com/Kaushik2210/tapwire/releases/download/v0.2.0/kaushik2210-tapwire-0.2.0.tgz", start: t(1.0), typed: true },
            { text: "$ tapwire init", start: t(5.2), typed: true },
            { text: "✔ Installed the pre-commit hook · ✔ Added the Scars section for your AI agent", start: t(6.4) },
          ]}
        />
      </div>
      <div style={{ marginTop: 36, fontFamily: FONT_MONO, fontSize: 30, color: C.dim, display: "flex", gap: 34, ...rise(links, 12) }}>
        <span>github.com/Kaushik2210/tapwire</span>
        <span style={{ color: C.line }}>·</span>
        <span>tapwire-xi.vercel.app</span>
        <span style={{ color: C.line }}>·</span>
        <span>MIT licensed</span>
      </div>
      <div style={{ marginTop: 40, ...rise(tag, 16) }}>
        <Heading size={70} color={C.accent}>So your AI stops repeating itself.</Heading>
      </div>
    </AbsoluteFill>
  );
};

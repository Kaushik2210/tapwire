import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT_MONO, FONT_SANS, FONT_SERIF } from "./theme";

export const ease = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);

/** 0 → 1 over `dur` frames starting at `start`. */
export function useProgress(start: number, dur = 18) {
  const frame = useCurrentFrame();
  return ease((frame - start) / dur);
}

export const Background: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(rgba(241,238,230,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(241,238,230,0.045) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }}
    />
    <AbsoluteFill style={{ background: "radial-gradient(1100px 600px at 80% -10%, rgba(255,143,85,0.13), transparent 60%)" }} />
  </AbsoluteFill>
);

export const Logo: React.FC<{ size?: number; color?: string }> = ({ size = 64, color = C.accent }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <path d="M2 18 H11 M17 18 H26" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="14" cy="18" r="3" fill={color} />
    <path d="M14 15 V6" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    <path d="M9 9.5 L14 5 L19 9.5" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function lineColor(t: string): string {
  const s = t.trimStart();
  if (t.startsWith("$ ")) return C.text;
  if (s.startsWith("✖")) return C.bad;
  if (s.startsWith("✔")) return C.good;
  if (s.startsWith("▍")) return C.cyan;
  if (/^\s+- res\./.test(t)) return C.bad;
  if (/^\s+\+ res\./.test(t)) return C.good;
  if (/^\s*- /.test(t)) return C.warn;
  if (/^\s*(Instead|do this instead):/.test(t)) return C.good;
  if (/^(exit code|agent edits|agent rewrites|Saved to|Fixed in|The repeat was)/.test(s) || s.startsWith("Amnesia Rate")) return C.dim;
  return C.text;
}

export type TLine = { text: string; start: number; color?: string; typed?: boolean };

/**
 * A terminal window. Lines appear at `start` (frames, relative to the scene). Typed lines type out.
 * Content is bottom-anchored, so older lines scroll off the top like a real terminal.
 */
export const Terminal: React.FC<{
  lines: TLine[];
  width: number;
  height: number;
  fontSize?: number;
  title?: string;
  cps?: number;
}> = ({ lines, width, height, fontSize = 24, title = "zsh", cps = 38 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const visible = lines.filter((l) => frame >= l.start);
  const last = visible[visible.length - 1];
  return (
    <div style={{ width, height, borderRadius: 18, overflow: "hidden", background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 40px 120px -40px rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", fontFamily: FONT_MONO }}>
      <div style={{ height: 46, flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "0 18px", background: C.surface2, borderBottom: `1px solid ${C.line}` }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c, opacity: 0.85 }} />
        ))}
        <span style={{ marginLeft: 12, color: C.dim, fontSize: 16, fontFamily: FONT_SANS }}>{title}</span>
      </div>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "22px 28px", fontSize, lineHeight: 1.42 }}>
        {visible.map((l, i) => {
          const chars = l.typed ? Math.min(l.text.length, Math.floor(((frame - l.start) / fps) * cps)) : l.text.length;
          const shown = l.text.slice(0, chars);
          const isLast = l === last;
          const blink = Math.floor(frame / 12) % 2 === 0;
          return (
            <div key={i} style={{ color: l.color ?? lineColor(l.text), whiteSpace: "pre-wrap", wordBreak: "break-word", minHeight: fontSize * 1.42 }}>
              {shown || " "}
              {isLast && l.typed && chars < l.text.length ? <span style={{ background: C.text, color: C.bg }}>{" "}</span> : null}
              {isLast && !(l.typed && chars < l.text.length) && blink ? <span style={{ color: C.accent }}>▋</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export type Box = { x: number; y: number; w: number; h: number; label?: string; labelRight?: boolean };

/**
 * A 1920x1080 screenshot in a container, optionally zoomed to a focus box (progress p: 0 = whole page, 1 = focus),
 * with highlight rectangles drawn in screenshot coordinates.
 */
export const Shot: React.FC<{
  src: string;
  width: number;
  focus?: Box;
  p?: number;
  highlights?: (Box & { show: number })[];
  radius?: number;
}> = ({ src, width, focus, p = 0, highlights = [], radius = 0 }) => {
  const height = (width * 9) / 16;
  const base = width / 1920;
  let s = base, tx = 0, ty = 0;
  if (focus) {
    const target = Math.min((width * 0.9) / focus.w, (height * 0.9) / focus.h);
    const tTx = width / 2 - (focus.x + focus.w / 2) * target;
    const tTy = height / 2 - (focus.y + focus.h / 2) * target;
    s = base + (target - base) * p;
    tx = tTx * p;
    ty = tTy * p;
  }
  return (
    <div style={{ width, height, overflow: "hidden", position: "relative", background: C.bg, borderRadius: radius }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
        <Img src={staticFile(src)} style={{ width: 1920, height: 1080, display: "block" }} />
        {highlights.map((h, i) => (
          <div key={i} style={{ position: "absolute", left: h.x, top: h.y, width: h.w, height: h.h, border: `${Math.max(3, 3 / s)}px solid ${C.accent}`, borderRadius: 10, boxShadow: `0 0 ${24 / s}px rgba(255,143,85,0.55)`, opacity: h.show }}>
            {h.label ? (
              <div style={{ position: "absolute", ...(h.labelRight ? { right: 0 } : { left: 0 }), top: -46 / s, background: C.accent, color: "#1a0d05", fontFamily: FONT_SANS, fontWeight: 700, fontSize: 24 / s, padding: `${4 / s}px ${12 / s}px`, borderRadius: 8, whiteSpace: "nowrap" }}>{h.label}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export const BrowserFrame: React.FC<{ url: string; width: number; children: React.ReactNode }> = ({ url, width, children }) => (
  <div style={{ width, borderRadius: 18, overflow: "hidden", background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 40px 120px -40px rgba(0,0,0,0.85)" }}>
    <div style={{ height: 52, display: "flex", alignItems: "center", gap: 12, padding: "0 18px", background: C.surface2, borderBottom: `1px solid ${C.line}` }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <span key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c, opacity: 0.85 }} />
      ))}
      <div style={{ marginLeft: 14, flex: 1, height: 32, borderRadius: 16, background: C.bg, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", padding: "0 16px", color: C.dim, fontFamily: FONT_SANS, fontSize: 18 }}>{url}</div>
    </div>
    {children}
  </div>
);

/** Phrase-by-phrase subtitles over `durationFrames`, split at sentence and clause ends. */
export const Captions: React.FC<{ text: string; start: number; durationFrames: number }> = ({ text, start, durationFrames }) => {
  const frame = useCurrentFrame();
  const clean = text.replace(/\bA P I\b/g, "API").replace(/\bC I\b/g, "CI").replace(/\bA I\b/g, "AI");
  const parts = clean.match(/[^.,:;!?]+[.,:;!?]?/g)?.map((p) => p.trim()).filter(Boolean) ?? [clean];
  // merge very short parts into the next so captions don't flicker
  const chunks: string[] = [];
  for (const p of parts) {
    if (chunks.length && chunks[chunks.length - 1].length < 28) chunks[chunks.length - 1] += " " + p;
    else chunks.push(p);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  let acc = 0;
  const idx = chunks.findIndex((c) => {
    const from = start + (acc / total) * durationFrames;
    const to = start + ((acc + c.length) / total) * durationFrames;
    acc += c.length;
    return frame >= from && frame < to;
  });
  if (idx < 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 56, display: "flex", justifyContent: "center", padding: "0 140px" }}>
      <div style={{ background: "rgba(8,8,10,0.78)", border: `1px solid ${C.line}`, borderRadius: 16, padding: "14px 30px", color: C.text, fontFamily: FONT_SANS, fontSize: 40, lineHeight: 1.3, textAlign: "center", maxWidth: 1500, backdropFilter: "blur(6px)" }}>
        {chunks[idx]}
      </div>
    </div>
  );
};

export const Heading: React.FC<{ children: React.ReactNode; size?: number; color?: string }> = ({ children, size = 64, color = C.text }) => (
  <div style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: size, letterSpacing: -1.5, color, lineHeight: 1.05 }}>{children}</div>
);

export const Chip: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = C.accent, style }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: FONT_MONO, fontSize: 22, letterSpacing: 1.5, textTransform: "uppercase", color, border: `1.5px solid ${color}`, borderRadius: 10, padding: "6px 16px", ...style }}>{children}</div>
);

export const fade = (frame: number, total: number, edge = 10) =>
  interpolate(frame, [0, edge, total - edge, total], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

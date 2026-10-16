import type { AddedLine } from "./diff";
import type { Hit, Scar } from "./types";

/** Accepts "pattern" or "/pattern/flags". Returns null when the pattern is invalid. */
export function compileRegex(source: string): RegExp | null {
  const m = /^\/(.*)\/([a-z]*)$/s.exec(source);
  try {
    return m ? new RegExp(m[1], m[2]) : new RegExp(source);
  } catch {
    return null;
  }
}

/** Fast, offline check: run each scar's regex against every added line. */
export function matchRegex(scars: Scar[], added: AddedLine[]): Hit[] {
  const hits: Hit[] = [];
  for (const scar of scars) {
    if (!scar.badRegex) continue;
    const re = compileRegex(scar.badRegex);
    if (!re) continue; // an invalid regex must not break the whole check
    for (const l of added) {
      if (re.test(l.text)) {
        hits.push({
          scarId: scar.id,
          file: l.file,
          line: l.line,
          text: l.text.trim(),
          reason: scar.whatWentWrong,
          via: "regex",
        });
      }
    }
  }
  return hits;
}

const tokens = (s: string) => new Set(s.toLowerCase().match(/[a-z_][a-z0-9_]{2,}/g) ?? []);

/** Offline stand-in for the LLM pass (mock mode): token overlap with the scar's bad pattern. */
export function matchSimilar(scars: Scar[], added: AddedLine[], threshold = 0.6): Hit[] {
  const hits: Hit[] = [];
  for (const scar of scars) {
    const bad = tokens(scar.badPattern);
    if (bad.size < 3) continue;
    for (const l of added) {
      const t = tokens(l.text);
      if (t.size === 0) continue;
      let shared = 0;
      for (const w of t) if (bad.has(w)) shared++;
      if (shared / Math.min(bad.size, t.size) >= threshold) {
        hits.push({
          scarId: scar.id,
          file: l.file,
          line: l.line,
          text: l.text.trim(),
          reason: `Looks like the "${scar.title}" mistake again: ${scar.whatWentWrong}`,
          via: "llm",
        });
      }
    }
  }
  return hits;
}

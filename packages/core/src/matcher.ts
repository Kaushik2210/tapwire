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

const squash = (s: string) => s.toLowerCase().replace(/[\s"'`;]/g, "");

/**
 * Offline stand-in for the LLM pass (mock mode): matches the scar's bad pattern after ignoring
 * whitespace, quote style and semicolons, so reformatted copies of a mistake are still caught.
 */
export function matchSimilar(scars: Scar[], added: AddedLine[]): Hit[] {
  const hits: Hit[] = [];
  for (const scar of scars) {
    const bad = squash(scar.badPattern.split("\n")[0]);
    if (bad.length < 8) continue;
    for (const l of added) {
      if (squash(l.text).includes(bad)) {
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

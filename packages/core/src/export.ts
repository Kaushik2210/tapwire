import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readScars } from "./store";
import type { Scar } from "./types";

export const START = "<!-- scar-tissue:start -->";
export const END = "<!-- scar-tissue:end -->";
export const TARGET_FILES = ["AGENTS.md", "CLAUDE.md"];

export function renderSection(scars: Scar[]): string {
  const body = scars.length
    ? scars
        .map(
          (s) =>
            `### ${s.title} (${s.severity})\n- Went wrong: ${s.whatWentWrong}\n- Never write: \`${s.badPattern.split("\n")[0]}\`\n- Do instead: ${s.goodPattern}`,
        )
        .join("\n\n")
    : "_No scars recorded yet._";
  return `${START}\n## Scars: mistakes already fixed here\nRead these before coding. \`scar check\` blocks them if they come back.\n\n${body}\n${END}`;
}

/** Replace the managed block if present, otherwise append it; everything else is untouched. */
export function upsertSection(existing: string, section: string): string {
  const s = existing.indexOf(START);
  const e = existing.indexOf(END);
  if (s >= 0 && e > s) return existing.slice(0, s) + section + existing.slice(e + END.length);
  const sep = existing.length === 0 ? "" : existing.endsWith("\n") ? "\n" : "\n\n";
  return existing + sep + section + "\n";
}

export function exportScars(repo: string): string[] {
  const section = renderSection(readScars(repo));
  return TARGET_FILES.map((name) => {
    const path = join(repo, name);
    const current = existsSync(path) ? readFileSync(path, "utf8") : "";
    writeFileSync(path, upsertSection(current, section));
    return name;
  });
}

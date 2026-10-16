export interface AddedLine {
  file: string;
  line: number;
  text: string;
}

/** Extract added lines (with new-file line numbers) from a unified diff. */
export function parseAddedLines(diff: string): AddedLine[] {
  const out: AddedLine[] = [];
  let file = "";
  let line = 0;
  for (const raw of diff.split(/\r?\n/)) {
    if (raw.startsWith("+++ ")) {
      const p = raw.slice(4).trim();
      file = p === "/dev/null" ? "" : p.replace(/^b\//, "");
      continue;
    }
    if (raw.startsWith("--- ") || raw.startsWith("diff --git")) continue;
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      line = Number(hunk[1]);
      continue;
    }
    if (!file) continue;
    if (raw.startsWith("+")) {
      out.push({ file, line, text: raw.slice(1) });
      line++;
    } else if (raw.startsWith(" ")) {
      line++;
    }
  }
  return out;
}

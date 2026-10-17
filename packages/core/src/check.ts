import { execFileSync, spawnSync } from "node:child_process";
import { parseAddedLines, type AddedLine } from "./diff";
import { complete, isMock, parseJsonReply, ScarError } from "./llm";
import { matchRegex, matchSimilar } from "./matcher";
import { TARGET_FILES } from "./export";
import { addEvent, readScars, SCARS_DIR } from "./store";
import type { Hit, Scar } from "./types";

export interface CheckResult {
  hits: Hit[];
  notice?: string;
  scarCount: number;
  /** Number of added lines that were examined. */
  checked?: number;
}

const MAX_UNTRACKED_FILES = 50;

/** New files that git does not track yet never show up in `git diff HEAD`, so diff them against /dev/null. */
function untrackedDiff(repo: string): string {
  const listed = spawnSync("git", ["ls-files", "--others", "--exclude-standard", "-z"], { cwd: repo, encoding: "utf8" });
  if (listed.status !== 0) return "";
  const files = listed.stdout.split("\0").filter(Boolean).slice(0, MAX_UNTRACKED_FILES);
  // `git diff --no-index` exits 1 when the files differ, which is the normal case here.
  return files
    .map((f) => spawnSync("git", ["diff", "--no-index", "--unified=0", "--", "/dev/null", f], { cwd: repo, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }).stdout ?? "")
    .join("\n");
}

function workingDiff(repo: string, staged: boolean, base?: string): string {
  if (base) {
    // CI mode: everything this branch changed relative to the base (e.g. origin/main).
    if (base.startsWith("-")) throw new ScarError(`Invalid base ref: ${base}`);
    try {
      return execFileSync("git", ["diff", "--unified=0", `${base}...HEAD`], {
        cwd: repo,
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      const msg = ((err as { stderr?: string }).stderr ?? (err as Error).message).toString().trim();
      throw new ScarError(`git diff ${base}...HEAD failed: ${msg}. Is "${base}" a valid ref, and is the history fetched (in CI use fetch-depth: 0)?`);
    }
  }
  const args = staged ? ["diff", "--cached", "--unified=0"] : ["diff", "HEAD", "--unified=0"];
  try {
    const tracked = execFileSync("git", args, {
      cwd: repo,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return staged ? tracked : `${tracked}\n${untrackedDiff(repo)}`;
  } catch (err) {
    const msg = ((err as { stderr?: string }).stderr ?? (err as Error).message).toString().trim();
    throw new ScarError(`git diff failed: ${msg}`);
  }
}

const SYSTEM = `You compare new code against a list of past mistakes ("scars").
Reply with ONLY a JSON array. Each item: {"scarId": string, "file": string, "line": number, "reason": string}
for added lines that reintroduce one of the scars semantically (even if worded differently). Reply [] if none.`;

async function llmPass(scars: Scar[], added: AddedLine[]): Promise<Hit[]> {
  const listing = scars.map((s) => `- ${s.id} ${s.title}: bad=${s.badPattern} | good=${s.goodPattern}`).join("\n");
  const code = added.slice(0, 400).map((l) => `${l.file}:${l.line}: ${l.text}`).join("\n");
  const items = parseJsonReply<{ scarId: string; file: string; line: number; reason: string }[]>(
    await complete(SYSTEM, `Scars:\n${listing}\n\nAdded lines:\n${code}`),
  );
  const byKey = new Map(added.map((l) => [`${l.file}:${l.line}`, l]));
  return items
    .filter((i) => scars.some((s) => s.id === i.scarId))
    .map((i) => ({
      scarId: i.scarId,
      file: i.file,
      line: i.line,
      text: byKey.get(`${i.file}:${i.line}`)?.text.trim() ?? "",
      reason: i.reason,
      via: "llm" as const,
    }));
}

/**
 * TapWire's own files quote the bad patterns on purpose (the scar store, and the exported
 * instruction files), so they must never be checked against the scars.
 */
export function isManagedFile(file: string): boolean {
  const f = file.replace(/\\/g, "/");
  return f.startsWith(`${SCARS_DIR}/`) || f.includes(`/${SCARS_DIR}/`) || TARGET_FILES.includes(f);
}

/** Pure part of the check: regex hits over the added lines of a unified diff. */
export function checkDiff(scars: Scar[], diff: string) {
  const added = parseAddedLines(diff).filter((l) => !isManagedFile(l.file));
  return { added, regexHits: matchRegex(scars, added) };
}

export interface CheckOptions {
  /** Check only staged changes (what a pre-commit hook sees). */
  staged?: boolean;
  /** Log repeat events (default true). */
  record?: boolean;
  /** Run the semantic pass after the regex pass (default true). False = fast, offline, free. */
  semantic?: boolean;
  /** Compare against a base ref instead of the working tree, for CI (e.g. "origin/main"). */
  base?: string;
}

export async function checkRepo(repo: string, opts: CheckOptions = {}): Promise<CheckResult> {
  const scars = readScars(repo);
  if (scars.length === 0) {
    return { hits: [], scarCount: 0, notice: "No scars saved yet. Run `scar capture <commit-sha>` first." };
  }

  const { added, regexHits } = checkDiff(scars, workingDiff(repo, !!opts.staged, opts.base));
  let hits = [...regexHits];
  let notice: string | undefined;

  if (added.length > 0 && opts.semantic !== false) {
    try {
      hits.push(...(isMock() ? matchSimilar(scars, added) : await llmPass(scars, added)));
    } catch (err) {
      notice = `Semantic pass skipped (${(err as Error).message}). Showing regex results only.`;
    }
  }

  const seen = new Set<string>();
  hits = hits.filter((h) => {
    const k = `${h.scarId}|${h.file}|${h.line}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (opts.record !== false) {
    for (const h of hits) {
      addEvent(repo, { type: "repeat", scarId: h.scarId, file: h.file, line: h.line, reason: h.reason });
    }
  }
  return { hits, notice, scarCount: scars.length, checked: added.length };
}

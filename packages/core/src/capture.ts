import { execFileSync } from "node:child_process";
import { complete, isMock, parseJsonReply, ScarError } from "./llm";
import { compileRegex } from "./matcher";
import { MOCK_SCARS, type ScarDraft } from "./fixtures";
import { addScar } from "./store";
import type { Scar, Severity } from "./types";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

function git(repo: string, args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd: repo,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    const msg = ((err as { stderr?: string }).stderr ?? (err as Error).message).toString().trim();
    throw new ScarError(`git ${args[0]} failed: ${msg}`);
  }
}

export function readCommit(repo: string, sha: string) {
  const message = git(repo, ["show", "-s", "--format=%B", sha]).trim();
  const patch = git(repo, ["show", "--format=", "--patch", sha]);
  const full = git(repo, ["rev-parse", sha]).trim();
  return { sha: full, message, patch };
}

/** Mock mode: recognise the known demo mistakes in the removed lines, else make a generic scar. */
export function mockDraft(message: string, patch: string): ScarDraft {
  const lines = patch.split(/\r?\n/);
  const removed = lines.filter((l) => l.startsWith("-") && !l.startsWith("---"));
  const added = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++"));
  for (const draft of MOCK_SCARS) {
    const re = draft.badRegex ? compileRegex(draft.badRegex) : null;
    if (re && removed.some((l) => re.test(l.slice(1)))) return draft;
  }
  const first = message.split("\n")[0];
  const title = first.replace(/^(fix|bug|hotfix)[:\s]+/i, "").slice(0, 80) || "Past mistake";
  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    whatWentWrong: `Fixed in a past commit: ${first}`,
    badPattern: removed.slice(0, 3).map((l) => l.slice(1).trim()).join("\n") || "(see the fixing commit)",
    goodPattern: added.slice(0, 3).map((l) => l.slice(1).trim()).join("\n") || "(see the fixing commit)",
    severity: "medium",
  };
}

const SYSTEM = `You turn a bug-fix commit into a "scar": a short, reusable description of a mistake an AI coding agent must not repeat.
Reply with ONLY a JSON object with these keys:
title (short), whatWentWrong (1-2 sentences), badPattern (the bad code, as it looked before the fix),
badRegex (optional JavaScript regex source that matches the bad line; may be written as /source/flags), goodPattern (the correct code or rule),
severity (one of critical, high, medium, low).`;

function validate(raw: unknown): ScarDraft {
  const o = (raw ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === "string" && (o[k] as string).trim() ? (o[k] as string).trim() : null);
  const title = str("title");
  const whatWentWrong = str("whatWentWrong");
  const badPattern = str("badPattern");
  const goodPattern = str("goodPattern");
  if (!title || !whatWentWrong || !badPattern || !goodPattern) {
    throw new ScarError("The LLM reply was missing required scar fields.");
  }
  const severity = SEVERITIES.includes(o.severity as Severity) ? (o.severity as Severity) : "medium";
  const badRegex = str("badRegex");
  return { title, whatWentWrong, badPattern, goodPattern, severity, ...(badRegex && compileRegex(badRegex) ? { badRegex } : {}) };
}

export async function captureScar(repo: string, sha: string): Promise<Scar> {
  const commit = readCommit(repo, sha);
  let draft: ScarDraft;
  if (isMock()) {
    draft = mockDraft(commit.message, commit.patch);
  } else {
    const reply = await complete(SYSTEM, `Commit message:\n${commit.message}\n\nDiff:\n${commit.patch.slice(0, 30000)}`);
    draft = validate(parseJsonReply(reply));
  }
  return addScar(repo, { ...draft, sourceCommit: commit.sha.slice(0, 7) });
}

import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DEMO = join(ROOT, "demo-repo");

export function git(args: string[], opts: { date?: string } = {}): string {
  const env = { ...process.env };
  if (opts.date) {
    env.GIT_AUTHOR_DATE = opts.date;
    env.GIT_COMMITTER_DATE = opts.date;
  }
  return execFileSync("git", args, { cwd: DEMO, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** Run the real `scar` CLI against the demo repo, streaming its output. Returns the exit code. */
export function scar(args: string[]): number {
  const res = spawnSync(
    process.execPath,
    ["--import", "tsx", join(ROOT, "packages/cli/src/index.ts"), "--repo", DEMO, ...args],
    { cwd: ROOT, stdio: "inherit", env: { ...process.env, SCAR_MOCK: "1", FORCE_COLOR: "1" } },
  );
  return res.status ?? 1;
}

export function banner(text: string) {
  console.log(`\n\x1b[1m\x1b[36m▍ ${text}\x1b[0m`);
}

export const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

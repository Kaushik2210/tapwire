import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { ScarError } from "./llm";

export const HOOK_MARKER = "# tapwire-managed pre-commit hook";

function hookPath(repo: string): string {
  try {
    const rel = execFileSync("git", ["rev-parse", "--git-path", "hooks/pre-commit"], {
      cwd: repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return resolve(repo, rel);
  } catch {
    throw new ScarError(`${repo} is not a git repository.`);
  }
}

export function renderHook(command: string): string {
  return `#!/bin/sh\n${HOOK_MARKER}\n# Blocks the commit if staged code reintroduces a past mistake. Remove with: scar hook uninstall\n${command} || {\n  echo "TapWire: commit blocked. Fix the repeat above, or bypass once with: git commit --no-verify" >&2\n  exit 1\n}\n`;
}

/** Install a pre-commit hook that runs `scar check --staged`. Never overwrites a hook it did not write. */
export function installHook(repo: string, command: string): string {
  const path = hookPath(repo);
  if (existsSync(path) && !readFileSync(path, "utf8").includes(HOOK_MARKER)) {
    throw new ScarError(`A pre-commit hook already exists at ${path} and was not created by TapWire. Not overwriting it.`);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, renderHook(command));
  chmodSync(path, 0o755);
  return path;
}

/** Remove the hook, but only if TapWire wrote it. Returns whether anything was removed. */
export function uninstallHook(repo: string): boolean {
  const path = hookPath(repo);
  if (!existsSync(path)) return false;
  if (!readFileSync(path, "utf8").includes(HOOK_MARKER)) {
    throw new ScarError(`The pre-commit hook at ${path} was not created by TapWire. Leaving it alone.`);
  }
  rmSync(path);
  return true;
}

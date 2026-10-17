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

/**
 * `command` must exit 0 (clean), 1 (a repeat was found) or anything else (the tool itself failed).
 * Only exit 1 blocks the commit: a broken or missing tool must never stop someone from committing.
 */
export function renderHook(command: string): string {
  return `#!/bin/sh
${HOOK_MARKER}
# Blocks the commit if staged code reintroduces a past mistake. Remove with: scar hook uninstall
# The check runs in a subshell so that nothing it does can end this script before the result is classified.
(
${command}
)
code=$?
if [ "$code" -eq 1 ]; then
  echo "TapWire: commit blocked. Fix the repeat above, or bypass once with: git commit --no-verify" >&2
  exit 1
fi
if [ "$code" -ne 0 ]; then
  echo "TapWire: the check could not run (exit $code), so the commit is allowed." >&2
fi
exit 0
`;
}

/** Install a pre-commit hook that runs `command`. Never overwrites a hook it did not write. */
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

export function isHookInstalled(repo: string): boolean {
  try {
    const path = hookPath(repo);
    return existsSync(path) && readFileSync(path, "utf8").includes(HOOK_MARKER);
  } catch {
    return false;
  }
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

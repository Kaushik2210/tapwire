import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOOK_MARKER, installHook, uninstallHook } from "../src";

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "tapwire-hook-"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  return dir;
}
const hookFile = (dir: string) => join(dir, ".git", "hooks", "pre-commit");

describe("pre-commit hook", () => {
  it("installs a marked hook that runs the given command", () => {
    const dir = repo();
    installHook(dir, "echo checking");
    const body = readFileSync(hookFile(dir), "utf8");
    expect(body).toContain(HOOK_MARKER);
    expect(body).toContain("echo checking");
  });

  it("can be reinstalled and uninstalled", () => {
    const dir = repo();
    installHook(dir, "echo one");
    installHook(dir, "echo two");
    expect(readFileSync(hookFile(dir), "utf8")).toContain("echo two");
    expect(uninstallHook(dir)).toBe(true);
    expect(existsSync(hookFile(dir))).toBe(false);
    expect(uninstallHook(dir)).toBe(false);
  });

  it("never overwrites or removes a hook it did not write", () => {
    const dir = repo();
    mkdirSync(join(dir, ".git", "hooks"), { recursive: true });
    writeFileSync(hookFile(dir), "#!/bin/sh\necho mine\n");
    expect(() => installHook(dir, "echo x")).toThrow(/not created by TapWire/);
    expect(() => uninstallHook(dir)).toThrow(/not created by TapWire/);
    expect(readFileSync(hookFile(dir), "utf8")).toContain("echo mine");
  });

  it("refuses a folder that is not a git repository", () => {
    const dir = mkdtempSync(join(tmpdir(), "tapwire-nogit-"));
    // Stop git walking up into an enclosing repository (e.g. a home directory that is itself a repo).
    const before = process.env.GIT_CEILING_DIRECTORIES;
    process.env.GIT_CEILING_DIRECTORIES = tmpdir();
    try {
      expect(() => installHook(dir, "echo x")).toThrow(/not a git repository/);
    } finally {
      if (before === undefined) delete process.env.GIT_CEILING_DIRECTORIES;
      else process.env.GIT_CEILING_DIRECTORIES = before;
    }
  });
});

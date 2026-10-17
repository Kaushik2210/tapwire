import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MOCK_SCARS, checkRepo, ensureStore, installHook, isHookInstalled, readScars, renderSection, writeScars, type Scar } from "../src";

const saved = { ...process.env };
beforeEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.SCAR_MOCK;
});
afterEach(() => {
  process.env = { ...saved };
});

const git = (cwd: string, ...a: string[]) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "tapwire-wf-"));
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "user.email", "t@example.com");
  git(dir, "config", "user.name", "t");
  git(dir, "config", "commit.gpgsign", "false");
  writeFileSync(join(dir, "app.js"), "// app\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const scars: Scar[] = MOCK_SCARS.map((d, i) => ({ ...d, id: `scar-00${i + 1}`, sourceCommit: "abc1234", createdAt: new Date().toISOString() }));
  writeScars(dir, scars);
  return dir;
}
const BAD = 'res.redirect(req.query.next);\n';

describe("ensureStore", () => {
  it("creates an empty store once and leaves an existing one alone", () => {
    const dir = mkdtempSync(join(tmpdir(), "tapwire-store-"));
    expect(ensureStore(dir)).toBe(true);
    expect(readScars(dir)).toEqual([]);
    expect(ensureStore(dir)).toBe(false);
  });
});

describe("check options", () => {
  it("--base checks what a branch changed since the base, like CI does", async () => {
    const dir = repo();
    git(dir, "checkout", "-q", "-b", "feature");
    writeFileSync(join(dir, "route.js"), BAD);
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "add route");
    // The working tree is clean, so a plain check sees nothing, but the branch diff has the repeat.
    expect((await checkRepo(dir, { record: false })).hits).toHaveLength(0);
    const res = await checkRepo(dir, { base: "main", record: false });
    expect(res.hits.map((h) => `${h.scarId}:${h.file}`)).toEqual(["scar-001:route.js"]);
  });

  it("--base gives a helpful error for a ref that does not exist", async () => {
    await expect(checkRepo(repo(), { base: "origin/nope" })).rejects.toThrow(/fetch-depth: 0/);
  });

  it("rejects a base that looks like a git option", async () => {
    await expect(checkRepo(repo(), { base: "--output=/tmp/x" })).rejects.toThrow(/Invalid base ref/);
  });

  it("semantic: false skips the LLM pass entirely (no notice, still catches regex hits)", async () => {
    const dir = repo();
    writeFileSync(join(dir, "route.js"), BAD);
    const res = await checkRepo(dir, { semantic: false, record: false });
    expect(res.notice).toBeUndefined();
    expect(res.hits).toHaveLength(1);
    // With no key and the semantic pass on, the same check shows a notice instead.
    expect((await checkRepo(dir, { record: false })).notice).toMatch(/Semantic pass skipped/);
  });

  it("reports how many lines it examined", async () => {
    const dir = repo();
    writeFileSync(join(dir, "route.js"), "a();\nb();\n");
    expect((await checkRepo(dir, { semantic: false, record: false })).checked).toBe(2);
  });
});

describe("pre-commit hook in a real git repository", () => {
  function commitWithHook(command: string) {
    const dir = repo();
    installHook(dir, command);
    writeFileSync(join(dir, "route.js"), "x();\n");
    git(dir, "add", "-A");
    const res = spawnSync("git", ["commit", "-m", "try"], { cwd: dir, encoding: "utf8" });
    return { dir, res, count: Number(git(dir, "rev-list", "--count", "HEAD")) };
  }

  it("blocks the commit when the check finds a repeat (exit 1)", () => {
    const { res, count } = commitWithHook("exit 1");
    expect(res.status).not.toBe(0);
    expect(res.stderr).toMatch(/commit blocked/);
    expect(count).toBe(1);
  });

  it("allows the commit when the check is clean (exit 0)", () => {
    const { res, count } = commitWithHook("exit 0");
    expect(res.status).toBe(0);
    expect(count).toBe(2);
  });

  it("never blocks a commit just because the tool itself failed (exit 2, or missing)", () => {
    for (const cmd of ["exit 2", "this-command-does-not-exist-tapwire"]) {
      const { res, count } = commitWithHook(cmd);
      expect(res.status, cmd).toBe(0);
      expect(res.stderr, cmd).toMatch(/could not run/);
      expect(count, cmd).toBe(2);
    }
  });

  it("reports whether the hook is installed", () => {
    const dir = repo();
    expect(isHookInstalled(dir)).toBe(false);
    installHook(dir, "exit 0");
    expect(isHookInstalled(dir)).toBe(true);
  });
});

describe("instructions written for the agent", () => {
  it("tell it to run the check before finishing and name the scars", () => {
    const text = renderSection(readScars(repo()));
    expect(text).toMatch(/run `scar check`/);
    expect(text).toContain("Unvalidated redirect");
    expect(existsSync(join(tmpdir()))).toBe(true);
    expect(readFileSync(join(repo(), ".scars", "scars.json"), "utf8")).toContain("scar-001");
  });
});

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MOCK_SCARS,
  checkRepo,
  filesFromHookInput,
  formatAgentMessage,
  normalizeFile,
  readEvents,
  recordHits,
  watchRepo,
  writeScars,
  type Hit,
  type Scar,
} from "../src";

const saved = { ...process.env };
beforeEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.SCAR_MOCK;
});
afterEach(() => {
  process.env = { ...saved };
});

const git = (cwd: string, ...a: string[]) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const scars: Scar[] = MOCK_SCARS.map((d, i) => ({ ...d, id: `scar-00${i + 1}`, sourceCommit: "abc1234", createdAt: new Date().toISOString() }));

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "tapwire-agent-"));
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "user.email", "t@example.com");
  git(dir, "config", "user.name", "t");
  git(dir, "config", "commit.gpgsign", "false");
  writeFileSync(join(dir, "app.js"), "// app\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  writeScars(dir, scars);
  return dir;
}
const BAD = "res.redirect(req.query.next);\n";
const hit = (over: Partial<Hit> = {}): Hit => ({ scarId: "scar-001", file: "a.js", line: 3, text: "res.redirect(req.query.next);", reason: "r", via: "regex", ...over });

describe("reading an agent's post-edit hook input", () => {
  it("finds the edited file in the common shapes", () => {
    expect(filesFromHookInput(JSON.stringify({ tool_input: { file_path: "src/a.js" } }))).toEqual(["src/a.js"]);
    expect(filesFromHookInput(JSON.stringify({ tool_input: { path: "b.js" } }))).toEqual(["b.js"]);
    expect(filesFromHookInput(JSON.stringify({ file_path: "c.js" }))).toEqual(["c.js"]);
    expect(filesFromHookInput(JSON.stringify({ files: ["d.js", "e.js"] }))).toEqual(["d.js", "e.js"]);
    expect(filesFromHookInput(JSON.stringify({ tool_input: { file_path: "x.js" }, tool_response: { filePath: "x.js" } }))).toEqual(["x.js"]);
  });

  it("returns nothing, and never throws, for empty or malformed input", () => {
    expect(filesFromHookInput("")).toEqual([]);
    expect(filesFromHookInput("not json")).toEqual([]);
    expect(filesFromHookInput("42")).toEqual([]);
    expect(filesFromHookInput("null")).toEqual([]);
  });
});

describe("the message an agent reads", () => {
  it("names the mistake, the line, what the agent wrote and what to do instead", () => {
    const msg = formatAgentMessage([hit()], scars);
    expect(msg).toMatch(/reintroduces a mistake that was already fixed/);
    expect(msg).toContain("Unvalidated redirect (high) at a.js:3");
    expect(msg).toContain("you wrote: res.redirect(req.query.next);");
    expect(msg).toContain("do this instead:");
    expect(msg).toMatch(/Rewrite those lines the correct way now/);
  });

  it("uses plural wording for several hits", () => {
    expect(formatAgentMessage([hit(), hit({ line: 9 })], scars)).toMatch(/reintroduces mistakes that were already fixed/);
  });
});

describe("checking only the file an agent just edited", () => {
  it("reports hits in that file and ignores other files, with relative or absolute paths", async () => {
    const dir = repo();
    writeFileSync(join(dir, "mine.js"), BAD);
    writeFileSync(join(dir, "other.js"), BAD);
    const rel = await checkRepo(dir, { files: ["mine.js"], semantic: false, record: false });
    expect(rel.hits.map((h) => h.file)).toEqual(["mine.js"]);
    const abs = await checkRepo(dir, { files: [join(dir, "mine.js")], semantic: false, record: false });
    expect(abs.hits.map((h) => h.file)).toEqual(["mine.js"]);
    expect(normalizeFile(dir, join(dir, "sub", "x.js"))).toBe("sub/x.js");
    expect(normalizeFile(dir, "./sub/x.js")).toBe("sub/x.js");
  });
});

describe("recording repeats", () => {
  it("records the source, and does not double-count the same line re-edited within minutes", async () => {
    const dir = repo();
    writeFileSync(join(dir, "mine.js"), BAD);
    await checkRepo(dir, { files: ["mine.js"], semantic: false, source: "agent" });
    await checkRepo(dir, { files: ["mine.js"], semantic: false, source: "agent" });
    const repeats = readEvents(dir).filter((e) => e.type === "repeat");
    expect(repeats).toHaveLength(1);
    expect(repeats[0].source).toBe("agent");
  });

  it("does treat a different line as a new repeat", () => {
    const dir = repo();
    expect(recordHits(dir, [hit({ line: 1 })], "hook")).toHaveLength(1);
    expect(recordHits(dir, [hit({ line: 2 })], "hook")).toHaveLength(1);
    expect(recordHits(dir, [hit({ line: 2 })], "hook")).toHaveLength(0);
  });
});

describe("watch mode", () => {
  it("reports a repeat the moment it is written, once, and ignores its own files", async () => {
    const dir = repo();
    const reports: Hit[][] = [];
    const stop = watchRepo(dir, (h) => reports.push(h), { debounceMs: 80 });
    try {
      mkdirSync(join(dir, ".scars"), { recursive: true });
      writeFileSync(join(dir, ".scars", "events.json"), "[]"); // must not trigger anything
      writeFileSync(join(dir, "route.js"), BAD);
      const deadline = Date.now() + 8000;
      while (reports.length === 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
      expect(reports).toHaveLength(1);
      expect(reports[0][0]).toMatchObject({ scarId: "scar-001", file: "route.js" });

      writeFileSync(join(dir, "route.js"), BAD); // touched again, same content: not reported twice
      await new Promise((r) => setTimeout(r, 900));
      expect(reports).toHaveLength(1);
      expect(readEvents(dir).filter((e) => e.type === "repeat" && e.source === "watch")).toHaveLength(1);
    } finally {
      stop();
    }
  }, 20_000);
});

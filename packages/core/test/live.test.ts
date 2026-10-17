import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { captureScar, checkRepo, readEvents, readScars, ScarError, writeScars, type Scar } from "../src";

/**
 * Live mode against a local stand-in for the Anthropic Messages API.
 * The real SDK makes real HTTP requests to it, so request building, response parsing, JSON extraction,
 * validation and failure fallbacks are exercised. It does not test the model's judgement.
 */

let server: Server;
let baseUrl = "";
let status = 200;
let reply = "";
const requests: { headers: Record<string, string | string[] | undefined>; body: any }[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      requests.push({ headers: req.headers, body: raw ? JSON.parse(raw) : null });
      res.writeHead(status, { "content-type": "application/json" });
      if (status !== 200) return res.end(JSON.stringify({ type: "error", error: { type: "api_error", message: "stub failure" } }));
      res.end(
        JSON.stringify({
          id: "msg_stub",
          type: "message",
          role: "assistant",
          model: "stub",
          content: [{ type: "text", text: reply }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
      );
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const saved = { ...process.env };
beforeEach(() => {
  process.env.ANTHROPIC_BASE_URL = baseUrl;
  process.env.ANTHROPIC_API_KEY = "test-key-not-real";
  delete process.env.SCAR_MOCK;
  delete process.env.SCAR_MODEL;
  status = 200;
  requests.length = 0;
});
afterEach(() => {
  process.env = { ...saved };
});

const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function repoWithFix() {
  const dir = mkdtempSync(join(tmpdir(), "tapwire-live-"));
  git(dir, "init", "-q");
  git(dir, "config", "user.email", "t@example.com");
  git(dir, "config", "user.name", "t");
  writeFileSync(join(dir, "a.js"), 'db.query("SELECT * FROM users WHERE id = " + id);\n');
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  writeFileSync(join(dir, "a.js"), 'db.query("SELECT * FROM users WHERE id = ?", [id]);\n');
  git(dir, "commit", "-qam", "fix: SQL injection in user lookup");
  return { dir, sha: git(dir, "rev-parse", "HEAD") };
}

const goodScar = {
  title: "SQL built by concatenation",
  whatWentWrong: "User input was joined into a SQL string.",
  badPattern: 'db.query("SELECT ... " + id)',
  badRegex: "/SELECT.*\"\\s*\\+/i",
  goodPattern: "Use placeholders.",
  severity: "critical",
};

describe("live capture (stubbed API)", () => {
  it("sends the key, model and diff, and saves the parsed scar", async () => {
    const { dir, sha } = repoWithFix();
    reply = "Here you go:\n```json\n" + JSON.stringify(goodScar) + "\n```";
    const scar = await captureScar(dir, sha);

    expect(scar.title).toBe(goodScar.title);
    expect(scar.severity).toBe("critical");
    expect(scar.badRegex).toBe(goodScar.badRegex);
    expect(readScars(dir)).toHaveLength(1);
    expect(readEvents(dir).map((e) => e.type)).toEqual(["new_mistake"]);

    expect(requests).toHaveLength(1);
    expect(requests[0].headers["x-api-key"]).toBe("test-key-not-real");
    expect(requests[0].body.model).toBe("claude-sonnet-5-5");
    expect(JSON.stringify(requests[0].body.messages)).toContain("fix: SQL injection");
    expect(JSON.stringify(requests[0].body.messages)).toContain("WHERE id = ?");
  });

  it("honours SCAR_MODEL", async () => {
    const { dir, sha } = repoWithFix();
    process.env.SCAR_MODEL = "my-model";
    reply = JSON.stringify(goodScar);
    await captureScar(dir, sha);
    expect(requests[0].body.model).toBe("my-model");
  });

  it("drops an invalid regex and normalises an unknown severity", async () => {
    const { dir, sha } = repoWithFix();
    reply = JSON.stringify({ ...goodScar, badRegex: "(", severity: "catastrophic" });
    const scar = await captureScar(dir, sha);
    expect(scar.badRegex).toBeUndefined();
    expect(scar.severity).toBe("medium");
  });

  it("rejects a reply that is not JSON, and writes nothing", async () => {
    const { dir, sha } = repoWithFix();
    reply = "Sorry, I cannot help with that.";
    await expect(captureScar(dir, sha)).rejects.toThrow(ScarError);
    expect(readScars(dir)).toHaveLength(0);
    expect(readEvents(dir)).toHaveLength(0);
  });

  it("rejects a reply missing required fields, and writes nothing", async () => {
    const { dir, sha } = repoWithFix();
    reply = JSON.stringify({ title: "Only a title" });
    await expect(captureScar(dir, sha)).rejects.toThrow(/missing required scar fields/);
    expect(readScars(dir)).toHaveLength(0);
  });

  it("turns an API failure into a friendly error", async () => {
    const { dir, sha } = repoWithFix();
    status = 500;
    await expect(captureScar(dir, sha)).rejects.toThrow(/LLM request failed/);
    expect(readScars(dir)).toHaveLength(0);
  }, 30_000);

  it("explains how to fix a missing key", async () => {
    const { dir, sha } = repoWithFix();
    delete process.env.ANTHROPIC_API_KEY;
    await expect(captureScar(dir, sha)).rejects.toThrow(/ANTHROPIC_API_KEY/);
    expect(requests).toHaveLength(0);
  });
});

describe("live check (stubbed API)", () => {
  function repoWithScar() {
    const { dir } = repoWithFix();
    const scar: Scar = { ...(goodScar as any), id: "scar-001", sourceCommit: "abc1234", createdAt: new Date().toISOString() };
    writeScars(dir, [scar]);
    return dir;
  }
  // A brand-new, untracked file: the case plain `git diff HEAD` misses.
  const edit = (dir: string, text: string) => writeFileSync(join(dir, "b.js"), text);

  it("adds a semantic hit the regex cannot see, and records it", async () => {
    const dir = repoWithScar();
    edit(dir, "const rows = db.query(`SELECT * FROM users WHERE id = ${userId}`);\n");
    reply = JSON.stringify([{ scarId: "scar-001", file: "b.js", line: 1, reason: "Interpolates user input into SQL." }]);
    const res = await checkRepo(dir);
    expect(res.hits).toHaveLength(1);
    expect(res.hits[0]).toMatchObject({ scarId: "scar-001", file: "b.js", line: 1, via: "llm" });
    expect(res.notice).toBeUndefined();
    expect(readEvents(dir).filter((e) => e.type === "repeat")).toHaveLength(1);
    expect(JSON.stringify(requests[0].body.messages)).toContain("b.js:1");
  });

  it("ignores hits for scars that do not exist", async () => {
    const dir = repoWithScar();
    edit(dir, "const x = 1;\n");
    reply = JSON.stringify([{ scarId: "scar-999", file: "b.js", line: 1, reason: "made up" }]);
    const res = await checkRepo(dir);
    expect(res.hits).toEqual([]);
  });

  it("returns no hits for clean code", async () => {
    const dir = repoWithScar();
    edit(dir, 'db.query("SELECT 1 WHERE id = ?", [id]);\n');
    reply = "[]";
    expect((await checkRepo(dir)).hits).toEqual([]);
  });

  it("keeps regex results and shows a notice when the API fails", async () => {
    const dir = repoWithScar();
    edit(dir, 'db.query("SELECT * FROM t WHERE a = " + a);\n');
    status = 500;
    const res = await checkRepo(dir);
    expect(res.hits.map((h) => h.via)).toEqual(["regex"]);
    expect(res.notice).toMatch(/Semantic pass skipped/);
  }, 30_000);

  it("keeps regex results when the reply is not JSON", async () => {
    const dir = repoWithScar();
    edit(dir, 'db.query("SELECT * FROM t WHERE a = " + a);\n');
    reply = "I think this looks fine!";
    const res = await checkRepo(dir);
    expect(res.hits).toHaveLength(1);
    expect(res.notice).toMatch(/Semantic pass skipped/);
  });
});

describe("test hygiene", () => {
  it("did not leave scars in a real repo", () => {
    expect(() => readFileSync(join(process.cwd(), ".scars", "scars.json"))).toThrow();
  });
});

/**
 * Live smoke test against the real Anthropic API (about 4 requests).
 * Needs ANTHROPIC_API_KEY in the environment or in a local .env file (never commit it).
 *
 *   npm run live:test
 *
 * Hard checks must pass. "Soft" checks depend on the model's judgement and are reported but do not fail the run.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureScar, checkRepo, compileRegex, isMock, MODEL, readScars } from "@scar/core";

try {
  process.loadEnvFile(".env");
} catch {
  /* no .env: rely on the environment */
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(`No ANTHROPIC_API_KEY found, so there is nothing to test live.

Put it in a local file that git ignores (do not paste it into chat or commit it):
  1. copy .env.example to .env
  2. set ANTHROPIC_API_KEY=your-key in .env
  3. run: npm run live:test`);
  process.exit(2);
}
delete process.env.SCAR_MOCK;
if (isMock()) throw new Error("Mock mode is still on.");

const git = (cwd: string, ...a: string[]) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const dir = mkdtempSync(join(tmpdir(), "tapwire-live-"));
git(dir, "init", "-q");
git(dir, "config", "user.email", "live@example.com");
git(dir, "config", "user.name", "Live Test");
const BAD = 'function findUser(id) {\n  return db.query("SELECT * FROM users WHERE id = " + id);\n}\n';
const GOOD = 'function findUser(id) {\n  return db.query("SELECT * FROM users WHERE id = ?", [id]);\n}\n';
writeFileSync(join(dir, "users.js"), BAD);
git(dir, "add", "-A");
git(dir, "commit", "-qm", "Initial");
writeFileSync(join(dir, "users.js"), GOOD);
git(dir, "commit", "-qam", "fix: stop building SQL by string concatenation in findUser");
const fixSha = git(dir, "rev-parse", "HEAD");

type Row = { name: string; kind: "hard" | "soft"; ok: boolean; detail: string };
const rows: Row[] = [];
const record = (name: string, kind: Row["kind"], ok: boolean, detail = "") => {
  rows.push({ name, kind, ok, detail });
  console.log(`${ok ? "PASS" : kind === "hard" ? "FAIL" : "WARN"}  [${kind}] ${name}${detail ? `  (${detail})` : ""}`);
};

console.log(`Model: ${MODEL()}\n`);

// 1. Capture
try {
  const scar = await captureScar(dir, fixSha);
  console.log(`Captured: "${scar.title}" (${scar.severity})\n  went wrong: ${scar.whatWentWrong}\n  bad:  ${scar.badPattern}\n  good: ${scar.goodPattern}\n  regex: ${scar.badRegex ?? "(none)"}\n`);
  record("capture returns a complete scar", "hard", !!(scar.title && scar.whatWentWrong && scar.badPattern && scar.goodPattern));
  record("capture logs a new_mistake event", "hard", readScars(dir).length === 1);
  const re = scar.badRegex ? compileRegex(scar.badRegex) : null;
  const badLine = 'return db.query("SELECT * FROM users WHERE id = " + id);';
  record("regex (if given) matches the original bad line", "soft", !scar.badRegex || (!!re && re.test(badLine)), scar.badRegex ? "" : "no regex offered");
  record("regex (if given) does not match the fixed line", "soft", !re || !re.test('return db.query("SELECT * FROM users WHERE id = ?", [id]);'));
} catch (err) {
  record("capture works against the real API", "hard", false, (err as Error).message);
}

// 2. Check
async function scenario(name: string, file: string, code: string, expectHit: boolean, kind: Row["kind"]) {
  writeFileSync(join(dir, file), code);
  try {
    const res = await checkRepo(dir, { record: false });
    const hit = res.hits.length > 0;
    record(name, kind, hit === expectHit, `${res.hits.length} hit(s)${res.hits[0] ? ` via ${res.hits[0].via}` : ""}${res.notice ? `; ${res.notice}` : ""}`);
  } catch (err) {
    record(name, kind, false, (err as Error).message);
  }
  execFileSync("git", ["clean", "-fdq", "--", file], { cwd: dir });
}

if (readScars(dir).length > 0) {
  await scenario("catches the same mistake in a new file", "orders.js", 'db.query("SELECT * FROM orders WHERE user = " + userId);\n', true, "hard");
  await scenario("leaves corrected code alone", "safe.js", 'db.query("SELECT * FROM orders WHERE user = ?", [userId]);\n', false, "hard");
  await scenario("leaves unrelated code alone", "util.js", "export const add = (a, b) => a + b;\nconsole.log(add(1, 2));\n", false, "hard");
  await scenario("catches a reworded repeat the regex cannot see (model judgement)", "tpl.js", "const rows = db.query(`SELECT * FROM orders WHERE user = ${userId}`);\n", true, "soft");
}

const hardFails = rows.filter((r) => r.kind === "hard" && !r.ok).length;
const softFails = rows.filter((r) => r.kind === "soft" && !r.ok).length;
console.log(`\n${rows.length} checks: ${rows.filter((r) => r.ok).length} passed, ${hardFails} hard failures, ${softFails} soft warnings`);
console.log(hardFails === 0 ? "LIVE MODE OK" : "LIVE MODE HAS PROBLEMS: see the FAIL lines above");
process.exit(hardFails === 0 ? 0 : 1);

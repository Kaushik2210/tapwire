// Adoption test: pack the CLI, install the tarball into a brand-new project the way a user would,
// then run the whole workflow in a fresh git repository, including real `git commit` calls.
// Run: npm run test:install   (needs network for `npm install`; uses mock mode, so no API key)
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const win = process.platform === "win32";
const work = mkdtempSync(join(tmpdir(), "tapwire-install-"));
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `\n      ${detail}` : ""}`);
};

const sh = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { encoding: "utf8", shell: win && !opts.noShell, ...opts, env: { ...process.env, ...(opts.env ?? {}) } });
const git = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

try {
  // 1. Pack and install into an empty project.
  const pack = sh("npm", ["pack", "--workspace", "packages/cli", "--pack-destination", work, "--json"], { cwd: root });
  if (pack.status !== 0) throw new Error(`npm pack failed:\n${pack.stderr}`);
  const jsonStart = pack.stdout.indexOf("[");
  const filename = JSON.parse(pack.stdout.slice(jsonStart))[0].filename;
  const tgz = join(work, filename);
  check("npm pack produces a tarball", existsSync(tgz), tgz);

  const consumer = join(work, "consumer");
  mkdirSync(consumer);
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ name: "consumer", version: "1.0.0", private: true }));
  const install = sh("npm", ["install", tgz, "--no-audit", "--no-fund"], { cwd: consumer });
  check("npm install of the tarball succeeds in a clean project", install.status === 0, install.stderr);

  const bin = join(consumer, "node_modules", ".bin");
  const withTapwire = { PATH: `${bin}${delimiter}${process.env.PATH}`, SCAR_MOCK: "1" };
  const withoutTapwire = { SCAR_MOCK: "1" };
  const tw = (cwd, args, env = withTapwire) => sh("tapwire", args, { cwd, env });

  const help = tw(consumer, ["--help"]);
  check("`tapwire` is on the PATH after install and prints help", help.status === 0 && /init/.test(help.stdout), help.stderr);
  check("the short alias `scar` works too", sh("scar", ["--help"], { cwd: consumer, env: withTapwire }).status === 0);
  const installedPkg = JSON.parse(readFileSync(join(consumer, "node_modules/@kaushik2210/tapwire/package.json"), "utf8"));
  check("only the Anthropic SDK is a runtime dependency", Object.keys(installedPkg.dependencies ?? {}).join() === "@anthropic-ai/sdk");

  // 2. A fresh repository with a bug and its fix.
  const proj = join(work, "my-app");
  mkdirSync(proj);
  git(proj, "init", "-q", "-b", "main");
  git(proj, "config", "user.email", "dev@example.com");
  git(proj, "config", "user.name", "Dev");
  git(proj, "config", "commit.gpgsign", "false");
  writeFileSync(join(proj, "users.js"), 'function find(id) {\n  return db.query("SELECT * FROM users WHERE id = " + id);\n}\n');
  git(proj, "add", "-A");
  git(proj, "commit", "-qm", "initial");
  writeFileSync(join(proj, "users.js"), 'function find(id) {\n  return db.query("SELECT * FROM users WHERE id = ?", [id]);\n}\n');
  git(proj, "commit", "-qam", "fix: SQL injection in find()");
  const fixSha = git(proj, "rev-parse", "HEAD");

  // 3. init, capture, status.
  const init = tw(proj, ["init"]);
  check("`tapwire init` sets up the store, hook and agent notes", init.status === 0 && existsSync(join(proj, ".scars/scars.json")) && existsSync(join(proj, ".git/hooks/pre-commit")) && existsSync(join(proj, "AGENTS.md")), init.stderr + init.stdout);

  const capture = tw(proj, ["capture", fixSha, "--export"]);
  check("`tapwire capture <sha> --export` saves a scar", capture.status === 0 && /Captured scar-001/.test(capture.stdout), capture.stderr + capture.stdout);
  const agents = readFileSync(join(proj, "AGENTS.md"), "utf8");
  check("the agent instructions name the mistake and tell it to run the check", /SQL built by string concatenation/.test(agents) && /run `scar check`/.test(agents));

  const status = tw(proj, ["status"]);
  check("`tapwire status` reports the hook, notes and scars", /installed/.test(status.stdout) && /Scars\s+1/.test(status.stdout), status.stdout);

  // 4. The AI "repeats the mistake" in a brand-new file.
  writeFileSync(join(proj, "orders.js"), 'function orders(user) {\n  return db.query("SELECT * FROM orders WHERE user = " + user);\n}\n');
  const offline = tw(proj, ["check", "--offline", "--no-record"]);
  check("`check` exits 1 and names the file when a mistake comes back in a new file", offline.status === 1 && /orders\.js:2/.test(offline.stdout), offline.stdout);
  const json = tw(proj, ["check", "--offline", "--json", "--no-record"]);
  let parsed = null;
  try { parsed = JSON.parse(json.stdout); } catch { /* reported below */ }
  check("`check --json` is valid JSON that tools can read", !!parsed && parsed.ok === false && parsed.hits[0]?.file === "orders.js", json.stdout);

  // 4b. The agent feedback loop: what an agent's post-edit hook would run, fed the edit as JSON on stdin.
  const agentBad = sh("tapwire", ["agent-check"], { cwd: proj, env: withTapwire, input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: join(proj, "orders.js") } }) });
  check("`agent-check` exits 2 with a message the agent can act on when it repeats a mistake", agentBad.status === 2 && /reintroduces a mistake/.test(agentBad.stderr) && /orders\.js:2/.test(agentBad.stderr) && /do this instead/.test(agentBad.stderr) && agentBad.stdout.trim() === "", agentBad.stderr);
  writeFileSync(join(proj, "clean.js"), "export const add = (a, b) => a + b;\n");
  const agentOk = sh("tapwire", ["agent-check"], { cwd: proj, env: withTapwire, input: JSON.stringify({ tool_input: { file_path: "clean.js" } }) });
  check("`agent-check` stays silent (exit 0) when the edited file is clean, even though another file is bad", agentOk.status === 0 && agentOk.stderr.trim() === "", agentOk.stderr);
  const agentNoInput = sh("tapwire", ["agent-check"], { cwd: proj, env: withTapwire, input: "" });
  check("`agent-check` with no hook input falls back to checking the whole tree", agentNoInput.status === 2, agentNoInput.stderr);
  const agentSetup = tw(proj, ["agent-setup"]);
  check("`agent-setup` prints a ready-to-paste hook config", agentSetup.status === 0 && /"command": "tapwire agent-check"/.test(agentSetup.stdout));
  const events = JSON.parse(readFileSync(join(proj, ".scars/events.json"), "utf8"));
  check("repeats caught by the agent hook are recorded once, with their source", events.filter((e) => e.type === "repeat" && e.source === "agent").length === 1, JSON.stringify(events));
  rmSync(join(proj, "clean.js"));

  // 5. The pre-commit hook, with real commits.
  git(proj, "add", "-A");
  const blocked = sh("git", ["commit", "-m", "add orders"], { cwd: proj, env: withTapwire, noShell: true });
  check("the hook BLOCKS a commit that repeats the mistake (tapwire found on PATH)", blocked.status !== 0 && /commit blocked/.test(blocked.stderr), blocked.stderr);
  const blockedNoPath = sh("git", ["commit", "-m", "add orders"], { cwd: proj, env: withoutTapwire, noShell: true });
  check("the hook still blocks when `tapwire` is NOT on the PATH (uses the recorded install path)", blockedNoPath.status !== 0 && /commit blocked/.test(blockedNoPath.stderr), blockedNoPath.stderr);
  check("no bad commit was created", git(proj, "log", "--oneline").split("\n").length === 2);

  writeFileSync(join(proj, "orders.js"), 'function orders(user) {\n  return db.query("SELECT * FROM orders WHERE user = ?", [user]);\n}\n');
  git(proj, "add", "-A");
  const ok = sh("git", ["commit", "-m", "add orders safely"], { cwd: proj, env: withTapwire, noShell: true });
  check("a clean commit goes through (including the managed .scars and AGENTS.md files)", ok.status === 0, ok.stderr);

  // 6. CI mode on a branch.
  git(proj, "checkout", "-q", "-b", "feature");
  writeFileSync(join(proj, "report.js"), 'q = "SELECT * FROM t WHERE a = " + a;\n');
  git(proj, "add", "-A");
  git(proj, "commit", "-qm", "report", "--no-verify");
  const ci = tw(proj, ["check", "--base", "main", "--offline", "--no-record"]);
  check("CI mode (`--base main`) fails a branch that repeats a mistake", ci.status === 1 && /report\.js/.test(ci.stdout), ci.stdout);
  const ciBad = tw(proj, ["check", "--base", "origin/missing", "--offline"]);
  check("CI mode explains a bad ref instead of crashing", ciBad.status === 2 && /fetch-depth/.test(ciBad.stderr), ciBad.stderr);

  // 6b. Watch mode, as a live process: it must flag a repeat the moment a file is written.
  git(proj, "checkout", "-q", "main");
  const watcher = spawn("tapwire", ["watch"], { cwd: proj, env: { ...process.env, ...withTapwire }, shell: win, stdio: ["ignore", "pipe", "pipe"] });
  let watched = "";
  watcher.stdout.on("data", (d) => (watched += d));
  const waitFor = async (re, ms) => {
    const end = Date.now() + ms;
    while (!re.test(watched) && Date.now() < end) await new Promise((r) => setTimeout(r, 150));
    return re.test(watched);
  };
  check("`tapwire watch` starts and says what it is watching", await waitFor(/Watching/, 8000), watched);
  writeFileSync(join(proj, "live.js"), 'const q = "SELECT * FROM t WHERE a = " + a;\n');
  check("`tapwire watch` flags the repeat the moment the file is written", await waitFor(/repeated at live\.js:1/, 10000), watched);
  if (win) spawnSync("taskkill", ["/pid", String(watcher.pid), "/t", "/f"]);
  else watcher.kill("SIGTERM");
  const afterWatch = JSON.parse(readFileSync(join(proj, ".scars/events.json"), "utf8"));
  check("the watch catch is recorded with source `watch`", afterWatch.some((e) => e.source === "watch" && e.file === "live.js"));
  rmSync(join(proj, "live.js"));

  // 6c. `capture` with no argument uses the latest commit.
  writeFileSync(join(proj, "pagination.js"), "const page = items.slice(page * size, (page + 1) * size);\n");
  git(proj, "add", "pagination.js");
  git(proj, "commit", "-qm", "init pagination", "--no-verify");
  writeFileSync(join(proj, "pagination.js"), "const page = items.slice((page - 1) * size, page * size);\n");
  git(proj, "commit", "-qam", "fix: pagination skipped the first page", "--no-verify");
  const capHead = tw(proj, ["capture"]);
  check("`tapwire capture` with no argument captures the latest commit", capHead.status === 0 && /Captured scar-002/.test(capHead.stdout), capHead.stdout + capHead.stderr);

  // 7. Uninstall.
  const un = tw(proj, ["hook", "uninstall"]);
  check("`tapwire hook uninstall` removes only its own hook", un.status === 0 && !existsSync(join(proj, ".git/hooks/pre-commit")), un.stderr);
} catch (err) {
  check("test run completed without an unexpected error", false, String(err?.stack ?? err));
} finally {
  rmSync(work, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length} checks, ${failed} failed`);
console.log(failed === 0 ? "INSTALL TEST OK: a stranger can adopt this" : "INSTALL TEST FAILED");
process.exit(failed === 0 ? 0 : 1);

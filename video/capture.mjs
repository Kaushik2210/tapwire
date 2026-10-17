// Records the real product for the demo video:
//  - real terminal output of the real commands (saved as text), and
//  - 1920x1080 screenshots of the real dashboard (local, plus the live Vercel site).
// Run from the video/ folder:  node capture.mjs        (needs the dashboard built: npm run build --workspace @scar/dashboard)
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..");
const SHOTS = join(here, "public", "shots");
const DATA = join(here, "public", "data");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "http://localhost:3000";
const LIVE = "https://tapwire-xi.vercel.app";
mkdirSync(SHOTS, { recursive: true });
mkdirSync(DATA, { recursive: true });

const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", shell: process.platform === "win32" && !opts.noShell, ...opts, env: { ...process.env, SCAR_MOCK: "1", FORCE_COLOR: "0", ...(opts.env ?? {}) } });
const npm = (...a) => run("npm", ["run", "-s", ...a]);
const tapwire = (...a) => run(process.execPath, [join(ROOT, "packages/cli/dist/tapwire.mjs"), "--repo", join(ROOT, "demo-repo"), ...a], { noShell: true });
const demoGit = (...a) => run("git", a, { cwd: join(ROOT, "demo-repo"), noShell: true });

// 1. Start the dashboard (production build) against demo-repo.
const server = spawn("npm", ["run", "start", "--workspace", "@scar/dashboard"], { cwd: ROOT, shell: true, stdio: "ignore" });
const stopServer = () => spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
process.on("exit", stopServer);
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(BASE)).ok) break;
  } catch {
    /* not up yet */
  }
  await new Promise((r) => setTimeout(r, 1000));
}

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: "dark", deviceScaleFactor: 1 });
const page = await ctx.newPage();

async function shot(name, path, { full = false, base = BASE, waitMs = 2600 } = {}) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(waitMs); // let entrance animations and the meter settle
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: full });
  console.log("shot", name);
}

const terminal = {};

// STATE A: the seeded demo repo.
npm("demo:setup");
await shot("overview-a", "/");
await shot("scars-a", "/scars");
terminal.gitLog = strip(demoGit("log", "--oneline", "-4").stdout).trim();

// STATE B: capture the newest fix, as a user would.
terminal.capture = strip(tapwire("capture", "--export").stdout).trim();
await shot("scars-b", "/scars");
await shot("overview-b", "/");

// STATE C: an agent repeats a fixed mistake and is told immediately.
terminal.agent = strip(npm("demo:agent").stdout).trim();

// The pre-commit hook refusing a real commit.
tapwire("hook", "install");
const authPath = join(ROOT, "demo-repo", "src/routes/auth.js");
run("node", ["-e", `const fs=require("fs");const p=${JSON.stringify(authPath)};fs.writeFileSync(p,fs.readFileSync(p,"utf8").replace("res.redirect(safeNext(req.query.next));","res.redirect(req.query.next);"))`], { noShell: true });
demoGit("add", "src/routes/auth.js");
const commit = demoGit("commit", "-m", "tidy login flow");
terminal.commit = strip(`${commit.stdout}${commit.stderr}`).trim();
terminal.commitExit = commit.status;
demoGit("reset", "-q");
demoGit("checkout", "--", ".");
tapwire("hook", "uninstall");

await shot("overview-c", "/");
await shot("repeats-c", "/repeats");
await shot("scar-detail-c", "/scars/scar-001");
await shot("scars-c", "/scars");

// The Try it page, with a result.
async function tryIt(base, name) {
  await page.goto(`${base}/try`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Check against scars" }).click();
  await page.waitForSelector(".try-hits", { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
  console.log("shot", name);
}
await tryIt(BASE, "try-result");
await tryIt(LIVE, "live-try");
await shot("live-overview", "/", { base: LIVE, waitMs: 3000 });

await browser.close();
writeFileSync(join(DATA, "terminal.json"), JSON.stringify(terminal, null, 2));
console.log("terminal.json written. commit exit code:", terminal.commitExit);
stopServer();

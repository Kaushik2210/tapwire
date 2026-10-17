/**
 * Demo: the agent feedback loop.
 * A scripted "agent" edits a file and writes a mistake that was already fixed. Its post-edit hook runs
 * `tapwire agent-check` (fed the edit as JSON on stdin, exactly like a real agent hook). TapWire answers
 * with a message the agent can act on; the "agent" then rewrites the line correctly and the next check is clean.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEMO, ROOT, banner, git, pause } from "./lib";

const FILE = "src/routes/auth.js";
const BAD = "res.redirect(req.query.next);";
const GOOD = "res.redirect(safeNext(req.query.next));";

function agentCheck(): { status: number; stderr: string } {
  const hookInput = JSON.stringify({ tool_name: "Edit", tool_input: { file_path: join(DEMO, FILE) } });
  const res = spawnSync(process.execPath, ["--import", "tsx", join(ROOT, "packages/cli/src/index.ts"), "--repo", DEMO, "agent-check"], {
    cwd: ROOT,
    input: hookInput,
    encoding: "utf8",
    env: { ...process.env, SCAR_MOCK: "1" },
  });
  return { status: res.status ?? 1, stderr: res.stderr };
}

git(["checkout", "--", "."]); // start from a clean tree so this can be replayed
const file = join(DEMO, FILE);
const original = readFileSync(file, "utf8");

banner("Agent task: “tidy the login flow”");
await pause(700);
console.log(`  \x1b[2magent edits ${FILE}\x1b[0m`);
writeFileSync(file, original.replace(GOOD, BAD));
console.log(`  \x1b[31m- ${GOOD}\x1b[0m`);
console.log(`  \x1b[32m+ ${BAD}\x1b[0m`);
await pause(1100);

banner("post-edit hook → tapwire agent-check");
await pause(500);
const first = agentCheck();
console.log(`\x1b[2m  exit code ${first.status}: the message below goes back to the agent\x1b[0m\n`);
console.log(first.stderr.trimEnd().split("\n").map((l) => `  ${l}`).join("\n"));
await pause(1800);

banner("The agent reads the message and fixes it");
await pause(600);
console.log(`  \x1b[2magent rewrites ${FILE}\x1b[0m`);
writeFileSync(file, original);
console.log(`  \x1b[31m- ${BAD}\x1b[0m`);
console.log(`  \x1b[32m+ ${GOOD}\x1b[0m`);
await pause(1000);

banner("post-edit hook → tapwire agent-check");
await pause(400);
const second = agentCheck();
console.log(second.status === 0 ? "  \x1b[32m✔ clean: nothing repeated (exit code 0)\x1b[0m" : `  \x1b[31m✖ still failing (exit code ${second.status})\x1b[0m\n${second.stderr}`);
console.log("\n\x1b[2mThe repeat was caught the instant it was written, and fixed in the same turn, before any commit.\x1b[0m");
process.exit(first.status === 2 && second.status === 0 ? 0 : 1);

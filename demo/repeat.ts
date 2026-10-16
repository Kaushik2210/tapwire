/**
 * Demo step 2: a scripted "agent" reintroduces a mistake that was already fixed.
 * Scar Tissue catches it, and the Scars section is refreshed for the agent.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEMO, banner, git, pause, scar } from "./lib";

// Start from a clean working tree so this can be replayed.
git(["checkout", "--", "."]);

banner("The agent is asked to “tidy the login flow” …");
const file = join(DEMO, "src/routes/auth.js");
const before = readFileSync(file, "utf8");
const after = before.replace("res.redirect(safeNext(req.query.next));", "res.redirect(req.query.next);");
if (after === before) throw new Error("Could not apply the demo edit: src/routes/auth.js changed.");
writeFileSync(file, after);
console.log("  edited src/routes/auth.js:  - res.redirect(safeNext(req.query.next));");
console.log("                              + res.redirect(req.query.next);");
await pause(900);

banner("scar check");
const code = scar(["check"]);
await pause(600);

banner("scar export");
scar(["export"]);

console.log(`\n\x1b[2mscar check exited with code ${code} (non-zero blocks the commit). Refresh the dashboard to see the repeat.\x1b[0m`);

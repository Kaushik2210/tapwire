/**
 * Copies demo-repo/.scars/*.json into apps/dashboard/demo-data/ so the dashboard can show sample data
 * on a host that has no demo repo (for example a deployed site). Run after demo:setup / capture / repeat.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DEMO, ROOT } from "./lib";

const out = join(ROOT, "apps/dashboard/demo-data");
mkdirSync(out, { recursive: true });
for (const f of ["scars.json", "events.json"]) {
  const src = join(DEMO, ".scars", f);
  if (!existsSync(src)) throw new Error(`${src} not found. Run "npm run demo:setup" first.`);
  copyFileSync(src, join(out, f));
}
console.log(`\x1b[32m✔ Sample data written to ${out}\x1b[0m`);

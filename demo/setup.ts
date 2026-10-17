/**
 * Builds demo-repo/: a tiny Express app with a real git history of "bug fixes",
 * five captured scars and about two weeks of sample events.
 * Everything here is seed data for the demo, not real usage history.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { captureScar, readScars, writeEvents, writeScars, type ScarEvent } from "@scar/core";
import { DEMO, ROOT, git } from "./lib";

process.env.SCAR_MOCK = "1";

const DAY = 86_400_000;
const daysAgo = (d: number, hour = 10) => {
  const t = new Date(Date.now() - d * DAY);
  t.setUTCHours(hour, 15, 0, 0);
  return t;
};

type Files = Record<string, string>;
const write = (files: Files) => {
  for (const [name, body] of Object.entries(files)) {
    const p = join(DEMO, name);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, body);
  }
};
const commit = (message: string, when: Date) => {
  git(["add", "-A"]);
  git(["commit", "-q", "-m", message], { date: when.toISOString() });
  return git(["rev-parse", "HEAD"]);
};

// ---- the app, in its buggy and fixed forms ---------------------------------

const authBad = `const express = require("express");
const router = express.Router();

router.get("/login/done", (req, res) => {
  res.redirect(req.query.next);
});

module.exports = router;
`;
const authGood = `const express = require("express");
const router = express.Router();

function safeNext(next) {
  return typeof next === "string" && /^\\/(?!\\/)/.test(next) ? next : "/";
}

router.get("/login/done", (req, res) => {
  res.redirect(safeNext(req.query.next));
});

module.exports = router;
`;
const usersBad = `const db = require("./connection");

function findUser(id) {
  return db.query("SELECT * FROM users WHERE id = " + id);
}

module.exports = { findUser };
`;
const usersGood = usersBad.replace(
  'db.query("SELECT * FROM users WHERE id = " + id)',
  'db.query("SELECT * FROM users WHERE id = ?", [id])',
);
const configBad = `const STRIPE_API_KEY = "sk_live_demo_1234567890abcdef";

module.exports = { STRIPE_API_KEY, port: 3000 };
`;
const configGood = `const STRIPE_API_KEY = process.env.STRIPE_API_KEY;

module.exports = { STRIPE_API_KEY, port: 3000 };
`;
const profileBad = `const express = require("express");
const { loadUser } = require("../db/users");
const router = express.Router();

router.get("/profile/:id", async (req, res) => {
  const user = loadUser(req.params.id);
  res.json({ name: user.name });
});

module.exports = router;
`;
const profileGood = profileBad.replace("= loadUser(", "= await loadUser(");
const errorsBad = `module.exports = function errorHandler(err, req, res, next) {
  res.status(500).send(err.stack);
};
`;
const errorsGood = `module.exports = function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(500).send("Something went wrong");
};
`;
const pageBad = `// page is 1-based
function paginate(items, page, size) {
  return items.slice(page * size, (page + 1) * size);
}

module.exports = { paginate };
`;
const pageGood = pageBad.replace("items.slice(page * size, (page + 1) * size)", "items.slice((page - 1) * size, page * size)");

const base: Files = {
  "package.json": JSON.stringify({ name: "demo-shop-api", version: "1.0.0", private: true, main: "src/server.js", dependencies: { express: "^4.19.0" } }, null, 2) + "\n",
  "AGENTS.md": "# Agent notes\n\nThis is a small Express API. Keep routes short and name things clearly.\n",
  "src/server.js": `const express = require("express");
const config = require("./config");
const errorHandler = require("./errors");

const app = express();
app.use(require("./routes/auth"));
app.use(require("./routes/profile"));
app.use(errorHandler);

app.listen(config.port);
`,
  "src/routes/auth.js": authBad,
  "src/db/users.js": usersBad,
  "src/config.js": configBad,
  "src/routes/profile.js": profileBad,
  "src/errors.js": errorsBad,
  "src/lib/paginate.js": pageBad,
};

// ---- build ------------------------------------------------------------------

if (existsSync(DEMO)) {
  if (!DEMO.startsWith(ROOT) || !DEMO.endsWith("demo-repo")) throw new Error(`Refusing to delete ${DEMO}`);
  rmSync(DEMO, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
}
mkdirSync(DEMO, { recursive: true });
git(["init", "-q", "-b", "main"]);
git(["config", "user.name", "Demo Developer"]);
git(["config", "user.email", "demo@example.com"]);

write(base);
commit("Initial shop API", daysAgo(16));

const fixes: { message: string; files: Files; day: number }[] = [
  { message: "fix: validate the redirect target after login", files: { "src/routes/auth.js": authGood }, day: 14 },
  { message: "fix: use a parameterized query for user lookup", files: { "src/db/users.js": usersGood }, day: 12 },
  { message: "fix: read the Stripe key from the environment", files: { "src/config.js": configGood }, day: 10 },
  { message: "fix: await loadUser in the profile route", files: { "src/routes/profile.js": profileGood }, day: 7 },
  { message: "fix: stop sending stack traces to clients", files: { "src/errors.js": errorsGood }, day: 5 },
];
const shas: string[] = [];
for (const f of fixes) {
  write(f.files);
  shas.push(commit(f.message, daysAgo(f.day)));
}
// The newest fix is left uncaptured on purpose: `npm run demo:capture` captures it live.
write({ "src/lib/paginate.js": pageGood });
commit("fix: pagination skipped the first page of results", new Date(Date.now() - 3_600_000));

// ---- scars (created by the real capture code, in mock mode) ------------------

for (const sha of shas) await captureScar(DEMO, sha);
const scars = readScars(DEMO).map((s, i) => ({ ...s, createdAt: daysAgo(fixes[i].day).toISOString() }));
writeScars(DEMO, scars);

// ---- sample event history ----------------------------------------------------

const history: { day: number; type: ScarEvent["type"]; scar: number; file?: string; line?: number; reason?: string; source?: ScarEvent["source"] }[] = [
  { day: 14, type: "new_mistake", scar: 1 },
  { day: 13, type: "repeat", scar: 1, file: "src/routes/auth.js", line: 6, reason: "The agent rebuilt the login redirect from req.query again.", source: "check" },
  { day: 12, type: "new_mistake", scar: 2 },
  { day: 10, type: "new_mistake", scar: 3 },
  { day: 9, type: "repeat", scar: 2, file: "src/db/orders.js", line: 8, reason: "A new orders query was built by concatenating the id into the SQL string.", source: "hook" },
  { day: 7, type: "new_mistake", scar: 4 },
  { day: 5, type: "new_mistake", scar: 5 },
];
const events: ScarEvent[] = history.map((h, i) => ({
  id: `evt-${String(i + 1).padStart(3, "0")}`,
  type: h.type,
  scarId: `scar-${String(h.scar).padStart(3, "0")}`,
  ...(h.file ? { file: h.file, line: h.line, reason: h.reason, ...(h.source ? { source: h.source } : {}) } : {}),
  at: daysAgo(h.day, 9 + (i % 5)).toISOString(),
}));
writeEvents(DEMO, events);

console.log(`\x1b[32m✔ Demo repo ready at ${DEMO}\x1b[0m`);
console.log(`  ${scars.length} scars, ${events.length} sample events (seed data), 1 uncaptured fix commit waiting for the live demo.`);

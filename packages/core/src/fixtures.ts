import type { Scar } from "./types";

export type ScarDraft = Omit<Scar, "id" | "createdAt" | "sourceCommit">;

/** Mock-mode "LLM answers" for the mistakes used in the demo. */
export const MOCK_SCARS: ScarDraft[] = [
  {
    title: "Unvalidated redirect",
    whatWentWrong:
      "The route redirected to a URL taken straight from the request, so an attacker could send users to any site.",
    badPattern: "res.redirect(req.query.next)",
    badRegex: String.raw`res\.redirect\(\s*req\.(query|body|params)`,
    goodPattern: "Only redirect to relative paths that start with a single slash, otherwise fall back to '/'.",
    severity: "high",
  },
  {
    title: "SQL built by string concatenation",
    whatWentWrong: "A query was assembled by joining user input into the SQL string, which allows SQL injection.",
    badPattern: 'db.query("SELECT * FROM users WHERE id = " + id)',
    badRegex: String.raw`/(SELECT|INSERT|UPDATE|DELETE)\b.*["'\x60]\s*\+\s*[A-Za-z_]/i`,
    goodPattern: 'Use placeholders: db.query("SELECT * FROM users WHERE id = ?", [id])',
    severity: "critical",
  },
  {
    title: "Hardcoded secret",
    whatWentWrong: "A key or password was written directly in source code and ended up in version control.",
    badPattern: 'const API_KEY = "sk_live_abcdef123456"',
    badRegex: String.raw`/(api_?key|secret|token|password)\w*\s*=\s*["'][A-Za-z0-9_\-]{12,}["']/i`,
    goodPattern: "Read it from the environment: const API_KEY = process.env.API_KEY",
    severity: "critical",
  },
  {
    title: "Missing await on async call",
    whatWentWrong: "An async function was called without await, so the code used a Promise instead of the real value.",
    badPattern: "const user = loadUser(id)",
    badRegex: String.raw`=\s*(?!await\b)(load|fetch)[A-Z]\w*\(`,
    goodPattern: "const user = await loadUser(id)",
    severity: "medium",
  },
];

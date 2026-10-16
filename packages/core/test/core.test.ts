import { describe, expect, it } from "vitest";
import {
  MOCK_SCARS,
  checkDiff,
  compileRegex,
  computeAmnesiaRate,
  matchRegex,
  matchSimilar,
  mockDraft,
  parseAddedLines,
  trendByDay,
  upsertSection,
  renderSection,
  START,
  END,
  type Scar,
  type ScarEvent,
} from "../src";

const scars: Scar[] = MOCK_SCARS.map((d, i) => ({
  ...d,
  id: `scar-00${i + 1}`,
  sourceCommit: "abc1234",
  createdAt: "2026-10-01T00:00:00.000Z",
}));

const ev = (type: ScarEvent["type"], at: string, n = 1): ScarEvent => ({
  id: `evt-${type}-${at}-${n}`,
  type,
  scarId: "scar-001",
  at,
});

function diffOf(file: string, lines: string[]) {
  return [
    `diff --git a/${file} b/${file}`,
    `--- a/${file}`,
    `+++ b/${file}`,
    `@@ -1,0 +10,${lines.length} @@`,
    ...lines.map((l) => `+${l}`),
  ].join("\n");
}

describe("computeAmnesiaRate", () => {
  it("is null when there are no events (no divide by zero)", () => {
    expect(computeAmnesiaRate([])).toEqual({ repeats: 0, newMistakes: 0, rate: null });
  });

  it("is repeats / (repeats + new mistakes)", () => {
    const events = [ev("new_mistake", "2026-10-01T10:00:00Z", 1), ev("new_mistake", "2026-10-02T10:00:00Z", 2), ev("new_mistake", "2026-10-03T10:00:00Z", 3), ev("repeat", "2026-10-04T10:00:00Z")];
    const r = computeAmnesiaRate(events);
    expect(r.repeats).toBe(1);
    expect(r.newMistakes).toBe(3);
    expect(r.rate).toBeCloseTo(0.25);
  });

  it("is 0 with only new mistakes and 1 with only repeats", () => {
    expect(computeAmnesiaRate([ev("new_mistake", "2026-10-01T00:00:00Z")]).rate).toBe(0);
    expect(computeAmnesiaRate([ev("repeat", "2026-10-01T00:00:00Z")]).rate).toBe(1);
  });
});

describe("trendByDay", () => {
  it("returns the cumulative rate at the end of each day, in date order", () => {
    const events = [ev("repeat", "2026-10-02T09:00:00Z"), ev("new_mistake", "2026-10-01T09:00:00Z"), ev("new_mistake", "2026-10-02T12:00:00Z", 2)];
    const t = trendByDay(events);
    expect(t.map((p) => p.date)).toEqual(["2026-10-01", "2026-10-02"]);
    expect(t[0].rate).toBe(0);
    expect(t[1].rate).toBeCloseTo(1 / 3);
  });
});

describe("parseAddedLines", () => {
  it("reports file and new-file line numbers for added lines only", () => {
    const diff = [
      "diff --git a/x.js b/x.js",
      "--- a/x.js",
      "+++ b/x.js",
      "@@ -3,2 +5,3 @@",
      " context",
      "-old",
      "+new one",
      "+new two",
    ].join("\n");
    expect(parseAddedLines(diff)).toEqual([
      { file: "x.js", line: 6, text: "new one" },
      { file: "x.js", line: 7, text: "new two" },
    ]);
  });
});

describe("regex matcher", () => {
  it("flags each demo mistake when it is reintroduced", () => {
    const cases: [string, string][] = [
      ["scar-001", "res.redirect(req.query.next);"],
      ["scar-002", 'db.query("SELECT * FROM t WHERE a = " + a);'],
      ["scar-003", 'const API_KEY = "sk_live_abcdef123456";'],
      ["scar-004", "const user = loadUser(id);"],
    ];
    for (const [id, line] of cases) {
      const { regexHits } = checkDiff(scars, diffOf("app.js", [line]));
      expect(regexHits.map((h) => h.scarId), line).toContain(id);
    }
  });

  it("does not flag the correct patterns", () => {
    const good = [
      "res.redirect(safeNext);",
      'db.query("SELECT * FROM t WHERE a = ?", [a]);',
      "const API_KEY = process.env.API_KEY;",
      "const user = await loadUser(id);",
    ];
    const { regexHits } = checkDiff(scars, diffOf("app.js", good));
    expect(regexHits).toEqual([]);
  });

  it("reports the file and line of the hit", () => {
    const { regexHits } = checkDiff(scars, diffOf("src/routes.js", ["ok();", "res.redirect(req.query.next);"]));
    expect(regexHits[0]).toMatchObject({ scarId: "scar-001", file: "src/routes.js", line: 11, via: "regex" });
  });

  it("ignores invalid regexes instead of throwing", () => {
    const broken: Scar = { ...scars[0], id: "scar-009", badRegex: "(" };
    expect(compileRegex("(")).toBeNull();
    expect(() => matchRegex([broken], [{ file: "a", line: 1, text: "(" }])).not.toThrow();
  });
});

describe("semantic stand-in (mock mode)", () => {
  it("catches a reworded version of a past mistake", () => {
    const added = [{ file: "a.js", line: 1, text: "  res.redirect( req.query.next ) ;" }];
    expect(matchSimilar(scars, added).map((h) => h.scarId)).toContain("scar-001");
  });

  it("does not flag the corrected code", () => {
    const added = [
      { file: "a.js", line: 1, text: "const user = await loadUser(id)" },
      { file: "a.js", line: 2, text: "db.query(\"SELECT * FROM users WHERE id = ?\", [id])" },
    ];
    expect(matchSimilar(scars, added)).toEqual([]);
  });

  it("stays quiet on unrelated code", () => {
    const added = [{ file: "a.js", line: 1, text: "console.log('hello world')" }];
    expect(matchSimilar(scars, added)).toEqual([]);
  });
});

describe("mockDraft", () => {
  it("recognises a known mistake from the removed lines of a fix", () => {
    const patch = "-  res.redirect(req.query.next);\n+  res.redirect(safe(req.query.next));";
    expect(mockDraft("fix: redirect", patch).title).toBe("Unvalidated redirect");
  });

  it("falls back to a generic scar built from the commit", () => {
    const d = mockDraft("fix: off by one in paging", "-  i <= n\n+  i < n");
    expect(d.title).toBe("Off by one in paging");
    expect(d.badPattern).toContain("i <= n");
  });
});

describe("export section", () => {
  it("appends once and replaces in place afterwards, keeping other content", () => {
    const section = renderSection(scars);
    const once = upsertSection("# My agent notes\n", section);
    const twice = upsertSection(once, renderSection(scars.slice(0, 1)));
    expect(once.startsWith("# My agent notes")).toBe(true);
    expect(twice.split(START).length - 1).toBe(1);
    expect(twice.split(END).length - 1).toBe(1);
    expect(twice).toContain("Unvalidated redirect");
    expect(twice).not.toContain("Hardcoded secret");
  });
});

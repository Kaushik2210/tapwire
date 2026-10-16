"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { checkSnippet, type TryResult } from "../app/try/actions";

const SAMPLES: { label: string; code: string }[] = [
  {
    label: "Open redirect",
    code: `app.get("/login/done", (req, res) => {\n  res.redirect(req.query.next);\n});`,
  },
  {
    label: "SQL concatenation",
    code: `function findOrders(userId) {\n  return db.query("SELECT * FROM orders WHERE user_id = " + userId);\n}`,
  },
  {
    label: "Hardcoded secret",
    code: `const STRIPE_API_KEY = "sk_live_demo_1234567890abcdef";\nmodule.exports = { STRIPE_API_KEY };`,
  },
  {
    label: "Missing await",
    code: `router.get("/profile/:id", async (req, res) => {\n  const user = loadUser(req.params.id);\n  res.json({ name: user.name });\n});`,
  },
  {
    label: "Clean code",
    code: `router.get("/profile/:id", async (req, res) => {\n  const user = await loadUser(req.params.id);\n  res.redirect(safeNext(req.query.next));\n  res.json({ name: user.name });\n});`,
  },
];

export function Playground() {
  const [state, action, pending] = useActionState<TryResult | null, FormData>(checkSnippet, null);
  const [code, setCode] = useState(SAMPLES[0].code);
  const form = useRef<HTMLFormElement>(null);
  const hitLines = new Map((state?.hits ?? []).map((h) => [h.line, h]));
  const lines = code.split(/\r?\n/);

  return (
    <div className="try">
      <form ref={form} action={action} className="panel try-editor">
        <div className="samples" role="group" aria-label="Example snippets">
          <span className="eyebrow">Try an example</span>
          {SAMPLES.map((s) => (
            <button key={s.label} type="button" className="chip-btn" onClick={() => setCode(s.code)}>
              {s.label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="code">Code to check</label>
        <textarea
          id="code"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") form.current?.requestSubmit();
          }}
          spellCheck={false}
          rows={10}
          placeholder="Paste code an agent wrote…"
        />
        <div className="try-actions">
          <button type="submit" className="button" disabled={pending}>
            {pending ? "Checking…" : "Check against scars"}
          </button>
          <span className="hint"><kbd>Ctrl</kbd> <kbd>Enter</kbd> to run</span>
        </div>
      </form>

      <section className="panel try-result" aria-live="polite" aria-label="Result">
        {!state && (
          <div className="try-empty">
            <p className="eyebrow">Result</p>
            <p className="verdict">Paste code, then check it.</p>
            <p className="verdict-sub">TapWire compares it with every saved scar and points to the exact line.</p>
          </div>
        )}

        {state?.error && <p className="try-error" role="alert">{state.error}</p>}

        {state && !state.error && state.hits.length === 0 && (
          <div className="try-ok">
            <p className="chip tone-good">No repeats</p>
            <p className="verdict">Clean. Nothing here repeats a past scar.</p>
            <p className="verdict-sub">Checked {state.checked} {state.checked === 1 ? "line" : "lines"} against {state.scarCount} scars.</p>
          </div>
        )}

        {state && !state.error && state.hits.length > 0 && (
          <div>
            <p className="chip tone-bad">{state.hits.length} {state.hits.length === 1 ? "repeat" : "repeats"} caught</p>
            <p className="verdict">This code reintroduces {state.hits.length === 1 ? "a past mistake" : "past mistakes"}.</p>

            <pre className="try-code">
              {lines.slice(0, 60).map((l, i) => {
                const h = hitLines.get(i + 1);
                return (
                  <span key={i} className={h ? "try-line is-hit" : "try-line"}>
                    <span className="no">{i + 1}</span>
                    <span className="tx">{l || " "}</span>
                  </span>
                );
              })}
            </pre>

            <ul className="try-hits">
              {state.hits.map((h) => (
                <li key={`${h.scarId}-${h.line}`} className={`sev-${h.severity}`}>
                  <div className="incident-top">
                    <Link href={`/scars/${h.scarId}`} className="try-hit-title">{h.title}</Link>
                    <span className={`sev sev-${h.severity}`}>{h.severity}</span>
                  </div>
                  <p className="where">line {h.line}</p>
                  <p className="try-why">{h.reason}</p>
                  <p className="try-instead"><b>Instead:</b> {h.instead}</p>
                </li>
              ))}
            </ul>
            <p className="verdict-sub">Offline check: regex and pattern match. The CLI adds an LLM pass in live mode.</p>
          </div>
        )}
      </section>
    </div>
  );
}

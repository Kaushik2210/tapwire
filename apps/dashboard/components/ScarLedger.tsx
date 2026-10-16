"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Severity } from "@scar/core";

export interface LedgerScar {
  id: string;
  title: string;
  whatWentWrong: string;
  severity: Severity;
  sourceCommit: string;
  createdAt: string;
  created: string; // pre-formatted on the server so it can't mismatch on the client
  repeats: number;
}

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
const RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
type Sort = "newest" | "repeated" | "severity";

export function ScarLedger({ scars }: { scars: LedgerScar[] }) {
  const [q, setQ] = useState("");
  const [sev, setSev] = useState<Severity | null>(null);
  const [sort, setSort] = useState<Sort>("newest");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = scars.filter(
      (s) =>
        (!sev || s.severity === sev) &&
        (!needle || `${s.id} ${s.title} ${s.whatWentWrong} ${s.sourceCommit}`.toLowerCase().includes(needle)),
    );
    return list.sort((a, b) =>
      sort === "repeated"
        ? b.repeats - a.repeats || b.createdAt.localeCompare(a.createdAt)
        : sort === "severity"
          ? RANK[a.severity] - RANK[b.severity] || b.createdAt.localeCompare(a.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
    );
  }, [scars, q, sev, sort]);

  return (
    <>
      <div className="toolbar">
        <label className="field">
          <span className="sr-only">Search scars</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" placeholder="Filter by title, id or commit" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="select">
          <span className="sr-only">Sort scars</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="newest">Newest first</option>
            <option value="repeated">Most repeated</option>
            <option value="severity">Most severe</option>
          </select>
        </label>
      </div>

      <div className="filters" role="group" aria-label="Filter by severity">
        <button type="button" aria-pressed={sev === null} onClick={() => setSev(null)}>
          All <span>{scars.length}</span>
        </button>
        {SEVERITIES.map((v) => (
          <button key={v} type="button" aria-pressed={sev === v} onClick={() => setSev(sev === v ? null : v)}>
            {v[0].toUpperCase() + v.slice(1)} <span>{scars.filter((s) => s.severity === v).length}</span>
          </button>
        ))}
      </div>

      <p className="sr-only" role="status">{shown.length} {shown.length === 1 ? "scar" : "scars"} shown</p>

      {shown.length === 0 ? (
        <div className="notice">
          <h2>No scars match</h2>
          <p>Nothing fits that search and filter.</p>
          <button type="button" className="button" onClick={() => { setQ(""); setSev(null); }}>Clear filters</button>
        </div>
      ) : (
        <ol className="ledger">
          {shown.map((s) => (
            <li key={s.id}>
              <Link className={`entry sev-${s.severity}`} href={`/scars/${s.id}`}>
                <div>
                  <p className="entry-id">{s.id} · captured {s.created} · commit {s.sourceCommit}</p>
                  <p className="entry-title">{s.title}</p>
                  <p className="entry-desc">{s.whatWentWrong}</p>
                </div>
                <div className="entry-side">
                  <span className={s.repeats ? "times hot" : "times"}>{s.repeats === 0 ? "never repeated" : `repeated ×${s.repeats}`}</span>
                  <span className={`sev sev-${s.severity}`}>{s.severity}</span>
                  <span className="chev" aria-hidden="true">→</span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

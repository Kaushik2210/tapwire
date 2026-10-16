import Link from "next/link";
import type { Severity } from "@scar/core";
import { formatDate, loadRepo } from "../../lib/data";
import { EmptyState, ErrorPanel, PageHead, SEVERITIES, SeverityBadge } from "../../components/ui";

export const dynamic = "force-dynamic";

export default async function Scars({ searchParams }: { searchParams: Promise<{ sev?: string }> }) {
  const { sev } = await searchParams;
  const { scars, events, error } = loadRepo();
  if (error) return (<><PageHead title="Scars" /><ErrorPanel message={error} /></>);

  const filter = SEVERITIES.includes(sev as Severity) ? (sev as Severity) : null;
  const repeats = new Map<string, number>();
  for (const e of events) if (e.type === "repeat") repeats.set(e.scarId, (repeats.get(e.scarId) ?? 0) + 1);
  const sorted = [...scars].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter((s) => !filter || s.severity === filter);

  return (
    <>
      <PageHead
        eyebrow={<>Scars · <b>{scars.length} tracked</b></>}
        title="Every mistake, now a rule."
        lede="Each scar came from a fixing commit. Newest first; the count shows how often the mistake has come back."
      />

      {scars.length === 0 ? (
        <EmptyState title="No scars yet" command="scar capture <commit-sha>">
          A scar is a fixed mistake the agent must not repeat. Capture your first from a fixing commit.
        </EmptyState>
      ) : (
        <>
          <nav className="filters rise" aria-label="Filter by severity">
            <Link href="/scars" aria-current={filter === null}>All <span>{scars.length}</span></Link>
            {SEVERITIES.map((v) => (
              <Link key={v} href={`/scars?sev=${v}`} aria-current={filter === v}>
                {v[0].toUpperCase() + v.slice(1)} <span>{scars.filter((s) => s.severity === v).length}</span>
              </Link>
            ))}
          </nav>

          {sorted.length === 0 ? (
            <EmptyState title={`No ${filter} scars`}>Nothing matches this filter. Try another severity.</EmptyState>
          ) : (
            <ol className="ledger">
              {sorted.map((s, i) => {
                const n = repeats.get(s.id) ?? 0;
                return (
                  <li key={s.id} className="rise" style={{ ["--d" as string]: `${60 + i * 50}ms` }}>
                    <Link className={`entry sev-${s.severity}`} href={`/scars/${s.id}`}>
                      <div>
                        <p className="entry-id">{s.id} · captured {formatDate(s.createdAt)} · commit {s.sourceCommit}</p>
                        <p className="entry-title">{s.title}</p>
                        <p className="entry-desc">{s.whatWentWrong}</p>
                      </div>
                      <div className="entry-side">
                        <span className={n ? "times hot" : "times"}>{n === 0 ? "never repeated" : `repeated ×${n}`}</span>
                        <SeverityBadge severity={s.severity} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </>
  );
}

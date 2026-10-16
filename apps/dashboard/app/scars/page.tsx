import Link from "next/link";
import { formatDate, loadRepo } from "../../lib/data";
import { EmptyState, ErrorPanel, PageHead, SeverityBadge } from "../../components/ui";

export const dynamic = "force-dynamic";

export default function Scars() {
  const { repo, scars, events, error } = loadRepo();
  if (error) return (<><PageHead title="Scars" /><ErrorPanel message={error} /></>);

  const repeats = new Map<string, number>();
  for (const e of events) if (e.type === "repeat") repeats.set(e.scarId, (repeats.get(e.scarId) ?? 0) + 1);
  const sorted = [...scars].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageHead title="Scars" lede="Every mistake that has been turned into a rule, newest first." repo={repo} />
      {sorted.length === 0 ? (
        <EmptyState title="No scars yet" command="scar capture <commit-sha>">
          A scar is a fixed mistake the agent must not repeat. Capture your first from a fixing commit.
        </EmptyState>
      ) : (
        <ol className="timeline">
          {sorted.map((s) => {
            const n = repeats.get(s.id) ?? 0;
            return (
              <li key={s.id}>
                <Link className="row" href={`/scars/${s.id}`}>
                  <div className="row-top">
                    <span className="row-title">{s.title}</span>
                    <SeverityBadge severity={s.severity} />
                  </div>
                  <p className="row-meta">{s.whatWentWrong}</p>
                  <p className="row-meta">
                    Captured {formatDate(s.createdAt)} · commit <span className="mono">{s.sourceCommit}</span> ·{" "}
                    {n === 0 ? "never repeated" : `repeated ${n} ${n === 1 ? "time" : "times"}`}
                  </p>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

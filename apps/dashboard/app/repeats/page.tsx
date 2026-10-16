import Link from "next/link";
import { formatDateTime, loadRepo } from "../../lib/data";
import { EmptyState, ErrorPanel, PageHead, SeverityBadge } from "../../components/ui";

export const dynamic = "force-dynamic";

export default function Repeats() {
  const { repo, scars, events, error } = loadRepo();
  if (error) return (<><PageHead title="Caught repeats" /><ErrorPanel message={error} /></>);

  const byId = new Map(scars.map((s) => [s.id, s]));
  const repeats = events.filter((e) => e.type === "repeat").sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <PageHead
        title="Caught repeats"
        lede="Times the agent tried to reintroduce a fixed mistake and TapWire flagged it."
        repo={repo}
      />
      {repeats.length === 0 ? (
        <EmptyState title="Nothing caught yet" command="scar check">
          When code reintroduces a past scar, it shows up here. Run the check before you commit.
        </EmptyState>
      ) : (
        <ul className="list">
          {repeats.map((e) => {
            const s = byId.get(e.scarId);
            return (
              <li key={e.id} className="row feed-item">
                <span className="feed-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></svg>
                </span>
                <div className="feed-body">
                  <div className="row-top">
                    <Link className="row-title" href={`/scars/${e.scarId}`} style={{ textDecoration: "none" }}>{s?.title ?? e.scarId}</Link>
                    {s && <SeverityBadge severity={s.severity} />}
                  </div>
                  <p className="row-meta mono">{e.file}:{e.line}</p>
                  {e.reason && <p className="row-meta">{e.reason}</p>}
                  <p className="row-meta">{formatDateTime(e.at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

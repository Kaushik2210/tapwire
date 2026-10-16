import type { Metadata } from "next";
import Link from "next/link";
import { dayLabel, formatDateTime, loadRepo } from "../../lib/data";
import { EmptyState, ErrorPanel, PageHead, SeverityBadge } from "../../components/ui";

export const metadata: Metadata = { title: "Caught repeats" };
export const dynamic = "force-dynamic";

export default function Repeats() {
  const { scars, events, error } = loadRepo();
  if (error) return (<><PageHead title="Caught repeats" /><ErrorPanel message={error} /></>);

  const byId = new Map(scars.map((s) => [s.id, s]));
  const repeats = events.filter((e) => e.type === "repeat").sort((a, b) => b.at.localeCompare(a.at));

  const groups: { day: string; items: typeof repeats }[] = [];
  for (const e of repeats) {
    const day = dayLabel(e.at);
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(e);
    else groups.push({ day, items: [e] });
  }

  return (
    <>
      <PageHead
        eyebrow={<>Incident log · <b>{repeats.length} blocked</b></>}
        title="Times the agent tried again."
        lede="Each entry is a fixed mistake the agent tried to reintroduce, and the line where TapWire caught it."
      />
      {repeats.length === 0 ? (
        <EmptyState title="Nothing caught yet" command="scar check">
          When code reintroduces a past scar, it shows up here. Run the check before you commit.
        </EmptyState>
      ) : (
        groups.map((g) => (
          <section key={g.day} aria-label={g.day} className="group">
            <h2 className="day">{g.day}</h2>
            <div className="log">
              {g.items.map((e) => {
                const s = byId.get(e.scarId);
                return (
                  <article key={e.id} className="incident rise">
                    <div className="incident-top">
                      <h3><Link href={`/scars/${e.scarId}`}>{s?.title ?? e.scarId}</Link></h3>
                      <span style={{ display: "inline-flex", gap: "0.625rem", alignItems: "center" }}>
                        {s && <SeverityBadge severity={s.severity} />}
                        <span className="blocked">Blocked</span>
                      </span>
                    </div>
                    <span className="where">{e.file}:{e.line}</span>
                    {e.reason && <p>{e.reason}</p>}
                    <p className="when">{formatDateTime(e.at)}</p>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </>
  );
}

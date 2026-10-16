import Link from "next/link";
import { computeAmnesiaRate, trendByDay } from "@scar/core";
import { formatDateTime, loadRepo, pct } from "../lib/data";
import { EmptyState, ErrorPanel, Gauge, PageHead, TrendChart } from "../components/ui";

export const dynamic = "force-dynamic";

export default function Overview() {
  const { repo, scars, events, error } = loadRepo();
  if (error) return (<><PageHead title="Overview" /><ErrorPanel message={error} /></>);

  const summary = computeAmnesiaRate(events);
  const trend = trendByDay(events);
  const titles = new Map(scars.map((s) => [s.id, s.title]));
  const recent = events.filter((e) => e.type === "repeat").sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);

  const peak = trend.reduce((m, p) => (p.rate !== null && (m === null || p.rate > (m.rate ?? 0)) ? p : m), null as (typeof trend)[number] | null);
  const fellFromPeak = peak && summary.rate !== null && peak.rate !== null && summary.rate < peak.rate;

  return (
    <>
      <PageHead
        title="Is your agent repeating itself?"
        lede="The Amnesia Rate shows how often a mistake you already fixed comes back."
        repo={repo}
      />

      {events.length === 0 ? (
        <EmptyState title="No scars yet" command={`scar capture <commit-sha>`}>
          Fix a bug, then capture the fixing commit. Scar Tissue turns it into a rule and starts measuring repeats.
        </EmptyState>
      ) : (
        <div className="grid">
          <section className="card col-5" aria-labelledby="g">
            <h2 id="g">Amnesia Rate</h2>
            <Gauge rate={summary.rate} />
          </section>

          <section className="card col-7" aria-labelledby="h">
            <h2 id="h">Headline</h2>
            <p className="big-number">{summary.repeats}</p>
            <p className="big-label">
              {summary.repeats === 1 ? "repeat" : "repeats"} caught across {scars.length} {scars.length === 1 ? "scar" : "scars"}
              {fellFromPeak ? ` · down from a peak of ${pct(peak!.rate)} on ${peak!.date.slice(5)}` : ""}
            </p>
            <div className="stats">
              <div><div className="stat-n">{summary.newMistakes}</div><div className="stat-l">new mistakes</div></div>
              <div><div className="stat-n">{summary.repeats}</div><div className="stat-l">repeats</div></div>
              <div><div className="stat-n">{pct(summary.rate)}</div><div className="stat-l">amnesia rate</div></div>
            </div>
          </section>

          <section className="card col-12" aria-labelledby="t">
            <h2 id="t">Amnesia Rate over time</h2>
            <TrendChart points={trend} />
          </section>

          <section className="card col-12" aria-labelledby="r">
            <h2 id="r">Latest caught repeats</h2>
            {recent.length === 0 ? (
              <p className="lede">Nothing caught yet. Run <code>scar check</code> before you commit.</p>
            ) : (
              <ul className="list">
                {recent.map((e) => (
                  <li key={e.id}>
                    <Link className="row" href={`/scars/${e.scarId}`}>
                      <div className="row-top">
                        <span className="row-title">{titles.get(e.scarId) ?? e.scarId}</span>
                        <span className="row-meta">{formatDateTime(e.at)}</span>
                      </div>
                      <p className="row-meta mono">{e.file}:{e.line}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p style={{ marginTop: "1rem" }}><Link href="/repeats">See the full feed →</Link></p>
          </section>
        </div>
      )}
    </>
  );
}

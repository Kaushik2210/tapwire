import Link from "next/link";
import { computeAmnesiaRate, trendByDay } from "@scar/core";
import { formatDateTime, loadRepo } from "../lib/data";
import { EmptyState, ErrorPanel, Meter, PageHead, SEVERITIES, SeverityBadge, TrendChart, status } from "../components/ui";

export const dynamic = "force-dynamic";

export default function Overview() {
  const { scars, events, error } = loadRepo();
  if (error) return (<><PageHead title="Overview" /><ErrorPanel message={error} /></>);

  if (events.length === 0) {
    return (
      <>
        <PageHead eyebrow="Overview" title="Is your agent repeating itself?" />
        <EmptyState title="No scars yet" command="scar capture <commit-sha>">
          Fix a bug, then capture the fixing commit. TapWire turns it into a rule and starts measuring repeats.
        </EmptyState>
      </>
    );
  }

  const summary = computeAmnesiaRate(events);
  const trend = trendByDay(events);
  const s = status(summary.rate);
  const total = summary.repeats + summary.newMistakes;
  const titles = new Map(scars.map((x) => [x.id, x]));
  const recent = events.filter((e) => e.type === "repeat").sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4);
  const first = Math.min(...events.map((e) => Date.parse(e.at)));
  const days = Math.max(1, Math.ceil((Date.now() - first) / 86_400_000));
  const bySeverity = SEVERITIES.map((sev) => ({ sev, n: scars.filter((x) => x.severity === sev).length }));
  const maxSev = Math.max(1, ...bySeverity.map((b) => b.n));
  const pctWhole = summary.rate === null ? "—" : String(Math.round(summary.rate * 100));

  return (
    <>
      <PageHead
        eyebrow={<>Overview · <b>last {days} days</b></>}
        title="Is your agent repeating itself?"
        lede="The Amnesia Rate is the share of recorded mistakes that were ones you had already fixed."
      />

      <section className={`panel hero rise ${s.tone}`} style={{ ["--d" as string]: "80ms" }} aria-label="Amnesia Rate">
        <div>
          <p className="eyebrow">Amnesia rate</p>
          <p className="score" aria-label={summary.rate === null ? "no data" : `${pctWhole} percent`}>
            <span className="score-n">{pctWhole}</span>
            {summary.rate !== null && <span className="score-u">%</span>}
          </p>
          <p className="verdict">
            {total > 0 ? `${summary.repeats} of ${total} recorded mistakes were repeats. ` : ""}
            {s.verdict}
          </p>
          <p className="verdict-sub" style={{ marginBottom: "1rem" }}>{s.sub}</p>
          <span className="chip">{s.label}</span>
          <Meter rate={summary.rate} />
        </div>

        <div>
          <dl className="facts">
            <div className="fact"><dt>Scars tracked</dt><dd>{scars.length}</dd></div>
            <div className="fact"><dt>New mistakes captured</dt><dd>{summary.newMistakes}</dd></div>
            <div className="fact"><dt>Repeats caught</dt><dd>{summary.repeats}</dd></div>
            <div className="fact"><dt>Watching for</dt><dd>{days}<small>days</small></dd></div>
          </dl>
          <p className="why">
            A caught repeat still counts: it shows the agent tried an old mistake. The rate falls as you capture new scars
            and the agent stops repeating.
          </p>
        </div>
      </section>

      <section className="panel panel-pad rise" style={{ marginTop: "1.5rem", ["--d" as string]: "160ms" }} aria-labelledby="trend">
        <div className="panel-title">
          <h2 id="trend">Rate over time</h2>
          <p className="legend">
            <span><i className="l-new" />New mistake captured</span>
            <span><i className="l-repeat" />Repeat caught</span>
          </p>
        </div>
        <TrendChart points={trend} events={events} />
      </section>

      <div className="two-col rise" style={{ ["--d" as string]: "240ms" }}>
        <section className="panel panel-pad" aria-labelledby="latest">
          <div className="panel-title">
            <h2 id="latest">Latest caught repeats</h2>
            <Link href="/repeats">View all →</Link>
          </div>
          {recent.length === 0 ? (
            <p className="lede" style={{ marginTop: 0 }}>Nothing caught yet. Run <code>scar check</code> before you commit.</p>
          ) : (
            <ol className="ledger">
              {recent.map((e) => {
                const sc = titles.get(e.scarId);
                return (
                  <li key={e.id}>
                    <Link href={`/scars/${e.scarId}`} className={`entry sev-${sc?.severity ?? "low"}`}>
                      <div>
                        <p className="entry-id">{e.scarId} · {formatDateTime(e.at)}</p>
                        <p className="entry-title">{sc?.title ?? e.scarId}</p>
                        <p className="entry-desc mono">{e.file}:{e.line}</p>
                      </div>
                      <div className="entry-side"><span className="blocked">Blocked</span></div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="panel panel-pad" aria-labelledby="sev">
          <div className="panel-title"><h2 id="sev">Scars by severity</h2></div>
          <div className="bars">
            {bySeverity.map(({ sev, n }) => (
              <div key={sev} className={`bar-row sev-${sev}`}>
                <SeverityBadge severity={sev} />
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(n / maxSev) * 100}%` }} /></div>
                <span className="bar-n">{n}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

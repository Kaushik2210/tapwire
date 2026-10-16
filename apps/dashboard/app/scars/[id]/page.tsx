import { notFound } from "next/navigation";
import { formatDate, formatDateTime, loadRepo } from "../../../lib/data";
import { BackLink, DiffView, ErrorPanel, PageHead, SeverityBadge } from "../../../components/ui";

export const dynamic = "force-dynamic";

export default async function ScarDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { repo, scars, events, error } = loadRepo();
  if (error) return (<><BackLink href="/scars">All scars</BackLink><ErrorPanel message={error} /></>);

  const scar = scars.find((s) => s.id === id);
  if (!scar) notFound();
  const repeats = events.filter((e) => e.type === "repeat" && e.scarId === scar.id).sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <BackLink href="/scars">All scars</BackLink>
      <PageHead title={scar.title} repo={repo} />
      <p style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <SeverityBadge severity={scar.severity} />
        <span className="row-meta">Captured {formatDate(scar.createdAt)} from commit <span className="mono">{scar.sourceCommit}</span></span>
      </p>

      <section className="section">
        <h2>What went wrong</h2>
        <p>{scar.whatWentWrong}</p>
      </section>

      <section className="section">
        <h2>Before and after</h2>
        <DiffView before={scar.badPattern} after={scar.goodPattern} />
      </section>

      {scar.badRegex && (
        <section className="section">
          <h2>Detection pattern</h2>
          <pre className="code-chip">{scar.badRegex}</pre>
        </section>
      )}

      <section className="section">
        <h2>Times it came back ({repeats.length})</h2>
        {repeats.length === 0 ? (
          <p className="lede">This mistake has not been repeated. The rule is working.</p>
        ) : (
          <ul className="list">
            {repeats.map((e) => (
              <li key={e.id} className="row">
                <div className="row-top">
                  <span className="mono">{e.file}:{e.line}</span>
                  <span className="row-meta">{formatDateTime(e.at)}</span>
                </div>
                {e.reason && <p className="row-meta">{e.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

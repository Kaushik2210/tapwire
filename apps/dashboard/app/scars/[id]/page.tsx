import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyButton } from "../../../components/CopyButton";
import { formatDate, formatDateTime, loadRepo } from "../../../lib/data";
import { BackLink, DiffView, ErrorPanel, SeverityBadge } from "../../../components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const scar = loadRepo().scars.find((s) => s.id === id);
  return { title: scar ? scar.title : "Scar not found" };
}

export default async function ScarDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { scars, events, error } = loadRepo();
  if (error) return (<><BackLink href="/scars">All scars</BackLink><ErrorPanel message={error} /></>);

  const scar = scars.find((s) => s.id === id);
  if (!scar) notFound();
  const repeats = events.filter((e) => e.type === "repeat" && e.scarId === scar.id).sort((a, b) => b.at.localeCompare(a.at));

  const ordered = [...scars].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const at = ordered.findIndex((s) => s.id === scar.id);
  const older = ordered[at - 1];
  const newer = ordered[at + 1];

  const rule = `### ${scar.title} (${scar.severity})\n- Went wrong: ${scar.whatWentWrong}\n- Never write: \`${scar.badPattern.split("\n")[0]}\`\n- Do instead: ${scar.goodPattern}`;

  return (
    <>
      <BackLink href="/scars">All scars</BackLink>

      <header className="page-head rise">
        <p className="eyebrow">{scar.id} · <b>scar</b></p>
        <h1 className="title">{scar.title}</h1>
        <p className="detail-lede">{scar.whatWentWrong}</p>
        <div className="meta-row">
          <SeverityBadge severity={scar.severity} />
          <span>captured {formatDate(scar.createdAt)}</span>
          <span>from commit {scar.sourceCommit}</span>
          <span>{repeats.length === 0 ? "never repeated" : `repeated ×${repeats.length}`}</span>
          <CopyButton text={rule} label="Copy as agent rule" className="copy-solid" />
        </div>
      </header>

      <section className="section rise" style={{ ["--d" as string]: "100ms" }}>
        <h2>Before and after</h2>
        <DiffView before={scar.badPattern} after={scar.goodPattern} />
      </section>

      {scar.badRegex && (
        <section className="section rise" style={{ ["--d" as string]: "160ms" }}>
          <h2>How it’s detected</h2>
          <div className="cmd">
            <code className="regex">{scar.badRegex}</code>
            <CopyButton text={scar.badRegex} label="Copy regex" />
          </div>
        </section>
      )}

      <section className="section rise" style={{ ["--d" as string]: "220ms" }}>
        <h2>Times it came back</h2>
        {repeats.length === 0 ? (
          <div className="notice"><p>This mistake has not been repeated. The rule is working.</p></div>
        ) : (
          <div className="log">
            {repeats.map((e) => (
              <article key={e.id} className="incident">
                <div className="incident-top">
                  <span className="where">{e.file}:{e.line}</span>
                  <span className="when">{formatDateTime(e.at)}</span>
                </div>
                {e.reason && <p>{e.reason}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      {(older || newer) && (
        <nav className="pager" aria-label="Neighbouring scars">
          {older ? (
            <Link href={`/scars/${older.id}`} className="pager-link">
              <span className="eyebrow">← Older</span>
              <span className="pager-title">{older.title}</span>
            </Link>
          ) : <span />}
          {newer ? (
            <Link href={`/scars/${newer.id}`} className="pager-link pager-next">
              <span className="eyebrow">Newer →</span>
              <span className="pager-title">{newer.title}</span>
            </Link>
          ) : <span />}
        </nav>
      )}
    </>
  );
}

import type { Metadata } from "next";
import { formatDate, loadRepo } from "../../lib/data";
import { ScarLedger } from "../../components/ScarLedger";
import { EmptyState, ErrorPanel, PageHead } from "../../components/ui";

export const metadata: Metadata = { title: "Scars" };
export const dynamic = "force-dynamic";

export default function Scars() {
  const { scars, events, error } = loadRepo();
  if (error) return (<><PageHead title="Scars" /><ErrorPanel message={error} /></>);

  const repeats = new Map<string, number>();
  for (const e of events) if (e.type === "repeat") repeats.set(e.scarId, (repeats.get(e.scarId) ?? 0) + 1);
  const rows = scars.map((s) => ({
    id: s.id,
    title: s.title,
    whatWentWrong: s.whatWentWrong,
    severity: s.severity,
    sourceCommit: s.sourceCommit,
    createdAt: s.createdAt,
    created: formatDate(s.createdAt),
    repeats: repeats.get(s.id) ?? 0,
  }));

  return (
    <>
      <PageHead
        eyebrow={<>Scars · <b>{scars.length} tracked</b></>}
        title="Every mistake, now a rule."
        lede="Each scar came from a fixing commit. Search, filter and sort; the count shows how often the mistake has come back."
      />
      {scars.length === 0 ? (
        <EmptyState title="No scars yet" command="scar capture <commit-sha>">
          A scar is a fixed mistake the agent must not repeat. Capture your first from a fixing commit.
        </EmptyState>
      ) : (
        <ScarLedger scars={rows} />
      )}
    </>
  );
}

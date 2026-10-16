import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { Severity } from "@scar/core";
import { CopyButton } from "./CopyButton";
import { pct } from "../lib/data";

export const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`sev sev-${severity}`}>{severity}</span>;
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="notice notice-error" role="alert">
      <h2>Can’t read this repository</h2>
      <p>{message}</p>
      <pre>{`# point the dashboard at a repo that has a .scars folder
SCAR_REPO=/path/to/repo npm run dev --workspace @scar/dashboard`}</pre>
    </div>
  );
}

export function EmptyState({ title, children, command }: { title: string; children: ReactNode; command?: string }) {
  return (
    <div className="notice">
      <h2>{title}</h2>
      <p>{children}</p>
      {command ? (
        <div className="cmd">
          <pre>{command}</pre>
          <CopyButton text={command} />
        </div>
      ) : null}
    </div>
  );
}

export function status(rate: number | null) {
  if (rate === null) return { tone: "tone-warn", label: "No data yet", verdict: "Nothing recorded yet.", sub: "Capture your first scar to start measuring." };
  if (rate <= 0.25)
    return { tone: "tone-good", label: "Healthy", verdict: "Your agent is mostly learning from its fixes.", sub: "Few fixed mistakes are coming back." };
  if (rate <= 0.5)
    return { tone: "tone-warn", label: "Watch", verdict: "Some fixed mistakes are still coming back.", sub: "Every blocked repeat is a scar doing its job." };
  return { tone: "tone-bad", label: "Repeating", verdict: "Fixed mistakes keep coming back.", sub: "Export your scars so the agent reads them first." };
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function PageHead({ eyebrow, title, lede }: { eyebrow?: ReactNode; title: string; lede?: string }) {
  return (
    <header className="page-head rise">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="title">{title}</h1>
      {lede && <p className="lede">{lede}</p>}
    </header>
  );
}

export const BackLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <p className="crumbs">
    <Link href={href}>← {children}</Link>
  </p>
);

/** 50-segment meter: one segment per 2 points of Amnesia Rate. */
export function Meter({ rate }: { rate: number | null }) {
  const N = 50;
  const s = status(rate);
  const filled = rate === null ? 0 : Math.max(rate > 0 ? 1 : 0, Math.round(rate * N));
  return (
    <div className={s.tone}>
      <div className="meter" role="img" aria-label={rate === null ? "Amnesia Rate: no data yet" : `Amnesia Rate ${pct(rate)}, ${s.label}`}>
        {Array.from({ length: N }, (_, i) => (
          <span key={i} className={i < filled ? "seg on" : "seg"} style={{ "--i": i } as CSSProperties} />
        ))}
      </div>
      <div className="meter-scale" aria-hidden="true">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function CodePane({ kind, label, text }: { kind: "bad" | "good"; label: string; text: string }) {
  return (
    <div className={`code code-${kind}`}>
      <div className="code-head">{label}</div>
      <pre>
        {text.split("\n").map((l, i) => (
          <code key={i} className="code-line">
            <span className="no">{i + 1}</span>
            <span className="tx" data-sign={kind === "bad" ? "−" : "+"}>{l}</span>
          </code>
        ))}
      </pre>
    </div>
  );
}

export function DiffView({ before, after }: { before: string; after: string }) {
  return (
    <div className="diff">
      <CodePane kind="bad" label="Before · the mistake" text={before} />
      <CodePane kind="good" label="After · the rule" text={after} />
    </div>
  );
}

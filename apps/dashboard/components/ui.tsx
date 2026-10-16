import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { ScarEvent, Severity, TrendPoint } from "@scar/core";
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
      {command ? <pre>{command}</pre> : null}
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

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Rate over time (line) with every event on a lane beneath it: hollow = new mistake, filled = repeat caught. */
export function TrendChart({ points, events }: { points: TrendPoint[]; events: ScarEvent[] }) {
  const W = 720, H = 300, L = 44, R = 20, T = 28;
  const iw = W - L - R;
  const plotBottom = 188, laneY = 232, axisY = 284;
  const times = events.map((e) => Date.parse(e.at));
  const HALF_DAY = 12 * 3_600_000;
  const t0 = Math.min(...times) - HALF_DAY;
  const t1 = Math.max(...times) + HALF_DAY;
  const x = (t: number) => L + ((t - t0) / (t1 - t0)) * iw;
  const y = (r: number) => T + (1 - r) * (plotBottom - T);

  const pts = points
    .filter((p) => p.rate !== null)
    .map((p) => ({ p, x: x(Math.min(Math.max(Date.parse(`${p.date}T12:00:00Z`), t0), t1)), y: y(p.rate!) }));
  const line = pts.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" ");
  const area = pts.length ? `${line} L${pts[pts.length - 1].x.toFixed(1)} ${plotBottom} L${pts[0].x.toFixed(1)} ${plotBottom} Z` : "";
  const peak = pts.reduce((m, q) => (m === null || q.p.rate! > m.p.rate! ? q : m), null as (typeof pts)[number] | null);
  const last = pts[pts.length - 1];
  const first = points[0];
  const lastPoint = points[points.length - 1];
  const summary = `Amnesia Rate over time, from ${pct(first.rate)} on ${first.date} to ${pct(lastPoint.rate)} on ${lastPoint.date}. ${events.filter((e) => e.type === "repeat").length} repeats caught and ${events.filter((e) => e.type === "new_mistake").length} new mistakes captured.`;
  const ticks = [0, 1 / 3, 2 / 3, 1].map((f) => t0 + f * (t1 - t0));

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line className="tick" x1={L} x2={W - R} y1={y(t)} y2={y(t)} strokeDasharray={t === 0 ? undefined : "2 5"} />
          <text x={L - 10} y={y(t) + 4} textAnchor="end">{Math.round(t * 100)}%</text>
        </g>
      ))}
      {area && <path d={area} fill="url(#area-fill)" />}
      {line && <path className="line" d={line} />}
      {pts.map((q) => (
        <circle key={q.p.date} className="dot" cx={q.x} cy={q.y} r={4}>
          <title>{`${q.p.date}: ${pct(q.p.rate)} (${q.p.repeats} repeats, ${q.p.newMistakes} new)`}</title>
        </circle>
      ))}
      {peak && peak !== last && (
        <text className="peak" x={peak.x} y={peak.y - 12} textAnchor="middle">{pct(peak.p.rate)}</text>
      )}
      {last && <text className="peak" x={last.x} y={last.y - 12} textAnchor="end">{pct(last.p.rate)} now</text>}

      <text x={L - 10} y={laneY + 4} textAnchor="end" style={{ fontSize: 10 }}>events</text>
      <rect className="lane" x={L} y={laneY - 14} width={iw} height={28} rx={14} />
      {events.map((e) => {
        const cx = x(Date.parse(e.at));
        return e.type === "repeat" ? (
          <g key={e.id}>
            <circle className="ev-repeat-ring" cx={cx} cy={laneY} r={9} />
            <circle className="ev-repeat" cx={cx} cy={laneY} r={5}>
              <title>{`Repeat caught, ${e.file ?? ""}:${e.line ?? ""}`}</title>
            </circle>
          </g>
        ) : (
          <circle key={e.id} className="ev-new" cx={cx} cy={laneY} r={5}>
            <title>{`New mistake captured (${e.scarId})`}</title>
          </circle>
        );
      })}
      {ticks.map((t, i) => (
        <text key={i} x={x(t)} y={axisY} textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}>
          {shortDate.format(new Date(t))}
        </text>
      ))}
    </svg>
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

import Link from "next/link";
import type { ReactNode } from "react";
import type { Severity, TrendPoint } from "@scar/core";
import { pct } from "../lib/data";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge sev-${severity}`}>{severity}</span>;
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="notice notice-error" role="alert">
      <h2>Can’t read this repository</h2>
      <p>{message}</p>
      <pre>{`# point the dashboard at a repo with a .scars folder
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
  if (rate === null) return { cls: "status-warn", label: "No data yet" };
  if (rate <= 0.25) return { cls: "status-good", label: "Healthy" };
  if (rate <= 0.5) return { cls: "status-warn", label: "Watch" };
  return { cls: "status-bad", label: "Repeating too often" };
}

const ARC = "M 30 120 A 90 90 0 0 1 210 120";

export function Gauge({ rate }: { rate: number | null }) {
  const s = status(rate);
  const color = s.cls === "status-good" ? "var(--good)" : s.cls === "status-bad" ? "var(--bad)" : "var(--warn)";
  const label = rate === null ? "Amnesia Rate: no data yet" : `Amnesia Rate ${pct(rate)}, ${s.label}`;
  return (
    <div className="gauge-wrap">
      <svg className="gauge" viewBox="0 0 240 150" role="img" aria-label={label}>
        <path d={ARC} fill="none" stroke="var(--surface-2)" strokeWidth="16" strokeLinecap="round" pathLength={100} />
        {rate !== null && (
          <path
            className="gauge-arc"
            d={ARC}
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - Math.max(rate * 100, 0.5)}
          />
        )}
        <text x="120" y="112" textAnchor="middle" className="gauge-value" fill="var(--text)">
          {pct(rate)}
        </text>
        <text x="30" y="144" textAnchor="middle" fontSize="11" fill="var(--text-2)">0%</text>
        <text x="210" y="144" textAnchor="middle" fontSize="11" fill="var(--text-2)">100%</text>
      </svg>
      <span className={`status-chip ${s.cls}`}>{s.label}</span>
      <p className="formula">repeats ÷ (repeats + new mistakes). Lower is better.</p>
    </div>
  );
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const W = 640, H = 220, L = 40, R = 16, T = 12, B = 28;
  const iw = W - L - R, ih = H - T - B;
  const x = (i: number) => L + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (r: number) => T + (1 - r) * ih;
  const valid = points.map((p, i) => ({ p, i })).filter(({ p }) => p.rate !== null);
  const line = valid.map(({ p, i }, k) => `${k ? "L" : "M"}${x(i).toFixed(1)} ${y(p.rate!).toFixed(1)}`).join(" ");
  const area = valid.length
    ? `${line} L${x(valid[valid.length - 1].i).toFixed(1)} ${y(0)} L${x(valid[0].i).toFixed(1)} ${y(0)} Z`
    : "";
  const first = points[0], last = points[points.length - 1];
  const summary = `Amnesia Rate over time, from ${pct(first.rate)} on ${first.date} to ${pct(last.rate)} on ${last.date}.`;
  const labelIdx = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line className="grid-line" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
          <text x={L - 8} y={y(t) + 4} textAnchor="end">{Math.round(t * 100)}%</text>
        </g>
      ))}
      {area && <path className="area" d={area} />}
      {line && <path className="line" d={line} />}
      {valid.map(({ p, i }) => (
        <circle key={p.date} className="dot" cx={x(i)} cy={y(p.rate!)} r={points.length > 20 ? 2.5 : 4}>
          <title>{`${p.date}: ${pct(p.rate)} (${p.repeats} repeats, ${p.newMistakes} new)`}</title>
        </circle>
      ))}
      {labelIdx.map((i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>
          {points[i].date.slice(5)}
        </text>
      ))}
    </svg>
  );
}

export function DiffView({ before, after }: { before: string; after: string }) {
  const lines = (s: string) => s.split("\n");
  return (
    <div className="diff">
      <div className="diff-pane diff-before">
        <div className="diff-head">Before: the mistake</div>
        <pre>{lines(before).map((l, i) => <code key={i} className="diff-line" data-sign="−">{l}</code>)}</pre>
      </div>
      <div className="diff-pane diff-after">
        <div className="diff-head">After: the rule</div>
        <pre>{lines(after).map((l, i) => <code key={i} className="diff-line" data-sign="+">{l}</code>)}</pre>
      </div>
    </div>
  );
}

export function PageHead({ title, lede, repo }: { title: string; lede?: string; repo?: string }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {repo && <span className="repo-pill" title={repo}>{repo}</span>}
    </div>
  );
}

export const BackLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <p className="crumbs"><Link href={href}>← {children}</Link></p>
);

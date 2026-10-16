"use client";

import { useState } from "react";
import type { ScarEvent, TrendPoint } from "@scar/core";

const W = 720, H = 300, L = 44, R = 20, T = 28;
const iw = W - L - R;
const plotBottom = 188, laneY = 232, axisY = 284;
const HALF_DAY = 12 * 3_600_000;

const pct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)}%`);
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/**
 * Rate over time with an event lane beneath it. Hover, touch or use the arrow keys to inspect a day.
 * Hollow dot = new mistake captured, filled dot = repeat caught.
 */
export function TrendChart({ points, events, titles }: { points: TrendPoint[]; events: ScarEvent[]; titles: Record<string, string> }) {
  const [active, setActive] = useState<number | null>(null);

  const times = events.map((e) => Date.parse(e.at));
  const t0 = Math.min(...times) - HALF_DAY;
  const t1 = Math.max(...times) + HALF_DAY;
  const x = (t: number) => L + ((t - t0) / (t1 - t0)) * iw;
  const y = (r: number) => T + (1 - r) * (plotBottom - T);

  const pts = points
    .map((p, i) => ({ p, i, x: x(Math.min(Math.max(Date.parse(`${p.date}T12:00:00Z`), t0), t1)), y: p.rate === null ? null : y(p.rate) }))
    .filter((q): q is typeof q & { y: number } => q.y !== null);
  const line = pts.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" ");
  const area = pts.length ? `${line} L${pts[pts.length - 1].x.toFixed(1)} ${plotBottom} L${pts[0].x.toFixed(1)} ${plotBottom} Z` : "";
  const peak = pts.reduce<(typeof pts)[number] | null>((m, q) => (m === null || q.p.rate! > m.p.rate! ? q : m), null);
  const last = pts[pts.length - 1];
  const ticks = [0, 1 / 3, 2 / 3, 1].map((f) => t0 + f * (t1 - t0));

  const current = active === null ? null : pts[active] ?? null;
  const dayEvents = current ? events.filter((e) => e.at.slice(0, 10) === current.p.date) : [];

  const summary = `Amnesia Rate over time, from ${pct(points[0].rate)} on ${points[0].date} to ${pct(points[points.length - 1].rate)} on ${points[points.length - 1].date}. Use the arrow keys to step through days.`;

  function onPointer(e: React.PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    pts.forEach((q, i) => {
      if (Math.abs(q.x - px) < Math.abs(pts[best].x - px)) best = i;
    });
    setActive(best);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setActive((a) => (a === null ? 0 : Math.min(a + 1, pts.length - 1)));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActive((a) => (a === null ? pts.length - 1 : Math.max(a - 1, 0)));
    } else if (e.key === "Escape") setActive(null);
  }

  return (
    <div
      className="chart-wrap"
      tabIndex={0}
      role="group"
      aria-label={summary}
      onPointerMove={onPointer}
      onPointerDown={onPointer}
      onPointerLeave={() => setActive(null)}
      onKeyDown={onKey}
      onBlur={() => setActive(null)}
    >
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
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
        {current && <line className="guide" x1={current.x} x2={current.x} y1={T - 6} y2={laneY + 16} />}
        {pts.map((q, i) => (
          <circle key={q.p.date} className={i === active ? "dot is-active" : "dot"} cx={q.x} cy={q.y} r={i === active ? 6.5 : 4} />
        ))}
        {active === null && peak && peak !== last && <text className="peak" x={peak.x} y={peak.y - 12} textAnchor="middle">{pct(peak.p.rate)}</text>}
        {active === null && last && <text className="peak" x={last.x} y={last.y - 12} textAnchor="end">{pct(last.p.rate)} now</text>}

        <text x={L - 10} y={laneY + 4} textAnchor="end" style={{ fontSize: 10 }}>events</text>
        <rect className="lane" x={L} y={laneY - 14} width={iw} height={28} rx={14} />
        {events.map((e) => {
          const cx = x(Date.parse(e.at));
          const hot = current !== null && e.at.slice(0, 10) === current.p.date;
          return e.type === "repeat" ? (
            <g key={e.id} opacity={current && !hot ? 0.35 : 1}>
              <circle className="ev-repeat-ring" cx={cx} cy={laneY} r={9} />
              <circle className="ev-repeat" cx={cx} cy={laneY} r={5} />
            </g>
          ) : (
            <circle key={e.id} className="ev-new" cx={cx} cy={laneY} r={5} opacity={current && !hot ? 0.35 : 1} />
          );
        })}
        {ticks.map((t, i) => (
          <text key={i} x={x(t)} y={axisY} textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}>
            {shortDate.format(new Date(t))}
          </text>
        ))}
      </svg>

      {current && (
        <div className="tip" style={{ left: `${Math.min(Math.max((current.x / W) * 100, 16), 84)}%` }} role="status">
          <p className="tip-date">{longDate.format(new Date(`${current.p.date}T12:00:00Z`))}</p>
          <p className="tip-rate">{pct(current.p.rate)}</p>
          <p className="tip-sub">{current.p.repeats} repeats · {current.p.newMistakes} new mistakes so far</p>
          {dayEvents.length > 0 && (
            <ul className="tip-list">
              {dayEvents.slice(0, 4).map((e) => (
                <li key={e.id}>
                  <i className={e.type === "repeat" ? "d-repeat" : "d-new"} />
                  <span>{titles[e.scarId] ?? e.scarId}</span>
                  <em>{e.type === "repeat" ? "repeat caught" : "new scar"}</em>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

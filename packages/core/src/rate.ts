import type { ScarEvent } from "./types";

export interface RateSummary {
  repeats: number;
  newMistakes: number;
  /** repeats / (repeats + newMistakes), or null when there are no events. */
  rate: number | null;
}

export function computeAmnesiaRate(events: ScarEvent[]): RateSummary {
  const repeats = events.filter((e) => e.type === "repeat").length;
  const newMistakes = events.filter((e) => e.type === "new_mistake").length;
  const total = repeats + newMistakes;
  return { repeats, newMistakes, rate: total === 0 ? null : repeats / total };
}

export interface TrendPoint extends RateSummary {
  date: string; // YYYY-MM-DD (UTC)
}

/** Cumulative Amnesia Rate at the end of each day that had events. */
export function trendByDay(events: ScarEvent[]): TrendPoint[] {
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  const days = [...new Set(sorted.map((e) => e.at.slice(0, 10)))];
  return days.map((date) => ({
    date,
    ...computeAmnesiaRate(sorted.filter((e) => e.at.slice(0, 10) <= date)),
  }));
}

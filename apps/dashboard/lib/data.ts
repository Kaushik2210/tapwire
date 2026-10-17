import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { readEvents, readScars, type Scar, type ScarEvent } from "@scar/core";
import sampleScars from "../demo-data/scars.json";
import sampleEvents from "../demo-data/events.json";

export interface RepoData {
  repo: string;
  scars: Scar[];
  events: ScarEvent[];
  error?: string;
  /** True when showing the bundled sample data instead of a real repository. */
  sample?: boolean;
}

export function repoPath() {
  return resolve(process.env.SCAR_REPO || resolve(process.cwd(), "../../demo-repo"));
}

/** Never throws: problems come back as `error` so pages can show a friendly message. */
export function loadRepo(): RepoData {
  const repo = repoPath();
  // No repo configured and no demo repo on disk (for example a deployed site): show the bundled sample data.
  if (process.env.SCAR_SAMPLE === "1" || (!process.env.SCAR_REPO && !existsSync(repo))) {
    return { repo: "demo-repo", scars: sampleScars as unknown as Scar[], events: sampleEvents as unknown as ScarEvent[], sample: true };
  }
  if (!existsSync(repo) || !statSync(repo).isDirectory()) {
    return {
      repo,
      scars: [],
      events: [],
      error: `The repository path does not exist: ${repo}. Run "npm run demo:setup" or set SCAR_REPO to a repo that has a .scars folder.`,
    };
  }
  try {
    return { repo, scars: readScars(repo), events: readEvents(repo) };
  } catch (err) {
    return { repo, scars: [], events: [], error: (err as Error).message };
  }
}

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => timeFmt.format(new Date(iso));
/** "Today", "Yesterday" or "Oct 3": used to group the incident log. */
export function dayLabel(iso: string, now = new Date()) {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return dateFmt.format(d);
}

export const pct =(rate: number | null) => (rate === null ? "—" : `${Math.round(rate * 100)}%`);

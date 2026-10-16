import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { readEvents, readScars, type Scar, type ScarEvent } from "@scar/core";

export interface RepoData {
  repo: string;
  scars: Scar[];
  events: ScarEvent[];
  error?: string;
}

export function repoPath() {
  return resolve(process.env.SCAR_REPO || resolve(process.cwd(), "../../demo-repo"));
}

/** Never throws: problems come back as `error` so pages can show a friendly message. */
export function loadRepo(): RepoData {
  const repo = repoPath();
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
export const pct = (rate: number | null) => (rate === null ? "—" : `${Math.round(rate * 100)}%`);

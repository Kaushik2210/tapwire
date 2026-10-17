import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Scar, ScarEvent } from "./types";

export const SCARS_DIR = ".scars";

export function scarsPath(repo: string, file: "scars.json" | "events.json") {
  return join(repo, SCARS_DIR, file);
}

function readJson<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8").trim();
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Could not parse ${path}: file is not valid JSON.`);
  }
  if (!Array.isArray(parsed)) throw new Error(`Expected ${path} to contain a JSON array.`);
  return parsed as T[];
}

function writeJson(path: string, data: unknown[]) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

export const readScars = (repo: string) => readJson<Scar>(scarsPath(repo, "scars.json"));
export const readEvents = (repo: string) => readJson<ScarEvent>(scarsPath(repo, "events.json"));
export const writeScars = (repo: string, scars: Scar[]) => writeJson(scarsPath(repo, "scars.json"), scars);
export const writeEvents = (repo: string, events: ScarEvent[]) => writeJson(scarsPath(repo, "events.json"), events);

/** Create an empty `.scars/` store if there isn't one. Returns true if anything was created. */
export function ensureStore(repo: string): boolean {
  let created = false;
  for (const file of ["scars.json", "events.json"] as const) {
    const path = scarsPath(repo, file);
    if (!existsSync(path)) {
      writeJson(path, []);
      created = true;
    }
  }
  return created;
}

export function nextId(prefix: string, existing: { id: string }[]) {
  const max = existing.reduce((m, e) => {
    const n = Number(e.id.split("-").pop());
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

export function addScar(repo: string, scar: Omit<Scar, "id" | "createdAt">, at = new Date()): Scar {
  const scars = readScars(repo);
  const full: Scar = { ...scar, id: nextId("scar", scars), createdAt: at.toISOString() };
  writeScars(repo, [...scars, full]);
  addEvent(repo, { type: "new_mistake", scarId: full.id }, at);
  return full;
}

export function addEvent(repo: string, event: Omit<ScarEvent, "id" | "at">, at = new Date()): ScarEvent {
  const events = readEvents(repo);
  const full: ScarEvent = { ...event, id: nextId("evt", events), at: at.toISOString() };
  writeEvents(repo, [...events, full]);
  return full;
}

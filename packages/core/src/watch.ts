import { watch, type FSWatcher } from "node:fs";
import { checkRepo, isManagedFile } from "./check";
import { recordHits } from "./check";
import type { Hit } from "./types";

const IGNORED_DIRS = [".git", "node_modules", ".next", "dist", ".scars"];

const ignored = (file: string) => {
  const f = file.replace(/\\/g, "/");
  return f.split("/").some((part) => IGNORED_DIRS.includes(part)) || isManagedFile(f);
};

export interface WatchOptions {
  /** Wait this long after the last change before checking (default 300 ms). */
  debounceMs?: number;
  /** Also run the semantic pass (default false: fast and free). */
  semantic?: boolean;
  /** Called when a check itself fails. */
  onError?: (err: Error) => void;
}

/**
 * Watch a repository and report a repeat of a past mistake the moment it is written to disk.
 * Each hit is reported once, recorded as a "watch" event, and the returned function stops watching.
 */
export function watchRepo(repo: string, onHits: (hits: Hit[]) => void, opts: WatchOptions = {}): () => void {
  const seen = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let again = false;

  async function run() {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      const res = await checkRepo(repo, { record: false, semantic: !!opts.semantic });
      const fresh = res.hits.filter((h) => {
        const key = `${h.scarId}|${h.file}|${h.line}|${h.text}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (fresh.length) {
        const recorded = recordHits(repo, fresh, "watch");
        onHits(recorded.length ? recorded : fresh);
      }
    } catch (err) {
      opts.onError?.(err as Error);
    } finally {
      running = false;
      if (again) {
        again = false;
        void run();
      }
    }
  }

  const watcher: FSWatcher = watch(repo, { recursive: true }, (_event, filename) => {
    if (!filename || ignored(String(filename))) return;
    clearTimeout(timer);
    timer = setTimeout(() => void run(), opts.debounceMs ?? 300);
  });

  return () => {
    clearTimeout(timer);
    watcher.close();
  };
}

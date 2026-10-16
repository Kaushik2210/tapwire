"use server";

import { matchRegex, matchSimilar, type Hit, type Severity } from "@scar/core";
import { loadRepo } from "../../lib/data";

export interface TryHit {
  scarId: string;
  title: string;
  severity: Severity;
  line: number;
  text: string;
  reason: string;
  instead: string;
  via: Hit["via"];
}

export interface TryResult {
  checked: number;
  scarCount: number;
  hits: TryHit[];
  error?: string;
}

const MAX_CHARS = 20_000;

/** Offline check of pasted code against the repo's scars. Pure: it records nothing. */
export async function checkSnippet(_prev: TryResult | null, formData: FormData): Promise<TryResult> {
  const code = String(formData.get("code") ?? "");
  const { scars, error } = loadRepo();
  if (error) return { checked: 0, scarCount: 0, hits: [], error };
  if (!code.trim()) return { checked: 0, scarCount: scars.length, hits: [], error: "Paste some code first." };
  if (code.length > MAX_CHARS) return { checked: 0, scarCount: scars.length, hits: [], error: "That is too long. Paste 20,000 characters or fewer." };

  const added = code.split(/\r?\n/).map((text, i) => ({ file: "your snippet", line: i + 1, text }));
  const seen = new Set<string>();
  const hits = [...matchRegex(scars, added), ...matchSimilar(scars, added)]
    .filter((h) => {
      const k = `${h.scarId}|${h.line}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.line - b.line)
    .map((h) => {
      const s = scars.find((x) => x.id === h.scarId)!;
      return { scarId: s.id, title: s.title, severity: s.severity, line: h.line, text: h.text, reason: h.reason, instead: s.goodPattern, via: h.via };
    });

  return { checked: added.length, scarCount: scars.length, hits };
}

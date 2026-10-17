import type { Hit, Scar } from "./types";

/**
 * Pull the edited file path(s) out of the JSON that an agent's post-edit hook sends on stdin.
 * Handles the common shapes: { tool_input: { file_path } }, { tool_input: { path } }, { file_path }, { path }, { files: [] }.
 */
export function filesFromHookInput(raw: string): string[] {
  if (!raw.trim()) return [];
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  const out = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === "string" && v.trim()) out.add(v);
  };
  for (const obj of [data, data?.tool_input, data?.tool_response, data?.input]) {
    if (!obj || typeof obj !== "object") continue;
    add(obj.file_path);
    add(obj.filePath);
    add(obj.path);
    add(obj.notebook_path);
    if (Array.isArray(obj.files)) obj.files.forEach(add);
    if (Array.isArray(obj.edits)) obj.edits.forEach((e: any) => add(e?.file_path ?? e?.path));
  }
  return [...out];
}

/** The message an agent reads right after its edit: specific, short, and ends with what to do. */
export function formatAgentMessage(hits: Hit[], scars: Scar[]): string {
  const byId = new Map(scars.map((s) => [s.id, s]));
  const items = hits.map((h) => {
    const s = byId.get(h.scarId);
    return [
      `- ${s?.title ?? h.scarId}${s ? ` (${s.severity})` : ""} at ${h.file}:${h.line}`,
      h.text ? `    you wrote: ${h.text}` : "",
      `    why it is wrong: ${s?.whatWentWrong ?? h.reason}`,
      s ? `    do this instead: ${s.goodPattern}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });
  return [
    `TapWire: that edit reintroduces ${hits.length === 1 ? "a mistake" : "mistakes"} that ${hits.length === 1 ? "was" : "were"} already fixed in this repository.`,
    "",
    ...items,
    "",
    "Rewrite those lines the correct way now, then carry on with the task.",
  ].join("\n");
}

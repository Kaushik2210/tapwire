export type Severity = "critical" | "high" | "medium" | "low";

export interface Scar {
  id: string;
  title: string;
  whatWentWrong: string;
  badPattern: string;
  badRegex?: string;
  goodPattern: string;
  severity: Severity;
  sourceCommit: string;
  createdAt: string;
}

export type EventType = "new_mistake" | "repeat";

export interface ScarEvent {
  id: string;
  type: EventType;
  scarId: string;
  file?: string;
  line?: number;
  reason?: string;
  at: string;
}

export interface Hit {
  scarId: string;
  file: string;
  line: number;
  text: string;
  reason: string;
  via: "regex" | "llm";
}

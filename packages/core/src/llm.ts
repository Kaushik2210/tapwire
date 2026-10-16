import Anthropic from "@anthropic-ai/sdk";

export class ScarError extends Error {}

export const isMock = () => ["1", "true"].includes((process.env.SCAR_MOCK ?? "").toLowerCase());

export const MODEL = () => process.env.SCAR_MODEL || "claude-sonnet-5-5";

/** One LLM round trip. Throws a friendly ScarError when no key is configured. */
export async function complete(system: string, user: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ScarError(
      "No ANTHROPIC_API_KEY found. Set it in your environment (see .env.example), or run with SCAR_MOCK=1 to use built-in fixtures.",
    );
  }
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: MODEL(),
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: user }],
    });
    return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  } catch (err) {
    throw new ScarError(`The LLM request failed: ${(err as Error).message}`);
  }
}

/** Pull the first JSON value out of a reply, tolerating code fences and chatter. */
export function parseJsonReply<T>(text: string): T {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.search(/[[{]/);
  if (start < 0) throw new ScarError("The LLM reply did not contain JSON.");
  try {
    return JSON.parse(body.slice(start)) as T;
  } catch {
    throw new ScarError("The LLM reply was not valid JSON.");
  }
}

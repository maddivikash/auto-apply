/**
 * Minimal Workers AI REST client. gpt-oss-120b is the model that produced clean
 * structured output on the free plan in testing; Llama 3.3 is the fallback.
 */

const ACCOUNT = process.env.CF_ACCOUNT_ID || "56949d76e6637308478ff6924e242173";
const TOKEN = process.env.CF_API_TOKEN;

export const WRITER_MODEL = process.env.CF_AI_MODEL || "@cf/openai/gpt-oss-120b";
export const FALLBACK_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

type Msg = { role: "system" | "user" | "assistant"; content: string };

async function run(model: string, body: Record<string, unknown>): Promise<string> {
  if (!TOKEN) throw new Error("CF_API_TOKEN is not set");
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000)
  });
  const data = await r.json();
  if (!r.ok || data.success === false) {
    throw new Error(`Workers AI ${model} failed: ${JSON.stringify(data.errors || data).slice(0, 400)}`);
  }
  const res = data.result;
  // gpt-oss returns the Responses-style shape; Llama returns { response }.
  if (typeof res?.response === "string") return res.response;
  if (Array.isArray(res?.output)) {
    const msg = res.output.find((o: any) => o.type === "message");
    const text = msg?.content?.map((c: any) => c.text || "").join("") || "";
    if (text) return text;
  }
  if (typeof res === "string") return res;
  throw new Error(`Unexpected Workers AI response shape: ${JSON.stringify(res).slice(0, 300)}`);
}

export async function chat(messages: Msg[], opts: { model?: string; maxTokens?: number } = {}): Promise<string> {
  const model = opts.model || WRITER_MODEL;
  if (model.includes("gpt-oss")) {
    const instructions = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const input = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content }));
    return run(model, { instructions, input, reasoning: { effort: "medium" }, max_output_tokens: opts.maxTokens ?? 4000 });
  }
  return run(model, { messages, max_tokens: opts.maxTokens ?? 4000 });
}

/** Ask for JSON and parse it, tolerating code fences and stray prose around the object. */
export async function chatJson<T>(messages: Msg[], opts: { model?: string; maxTokens?: number } = {}): Promise<T> {
  const text = await chat(messages, opts);
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error(`No JSON object in model output: ${text.slice(0, 200)}`);
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

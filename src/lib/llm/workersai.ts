/**
 * Minimal Workers AI REST client. gpt-oss-120b is the model that produced clean
 * structured output on the free plan in testing; Llama 3.3 is the fallback.
 *
 * Latency on the free plan is uneven: the same request takes 40 s one minute and
 * over two minutes the next. A call that times out, is rate limited or hits a 5xx
 * is retried once on the fallback model, and the primary is skipped for a while
 * so the repair round in the same run does not time out again.
 */

const ACCOUNT = process.env.CF_ACCOUNT_ID || "56949d76e6637308478ff6924e242173";
const TOKEN = process.env.CF_API_TOKEN;

export const WRITER_MODEL = process.env.CF_AI_MODEL || "@cf/openai/gpt-oss-120b";
export const FALLBACK_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
/** gpt-oss reasoning effort. "low" is enough for select-and-regroup work and is several times faster than "medium". */
const REASONING = process.env.CF_AI_REASONING || "low";
/** Per-call limits. The whole pipeline (two model calls at most, then a PDF render) has to fit in Vercel's 300 s. */
const TIMEOUT_MS = Number(process.env.CF_AI_TIMEOUT_MS || 100_000);
const FALLBACK_TIMEOUT_MS = Number(process.env.CF_AI_FALLBACK_TIMEOUT_MS || 75_000);
const DEMOTE_MS = 10 * 60_000;

let primarySlowUntil = 0;

type Msg = { role: "system" | "user" | "assistant"; content: string };

/** Transient: timeout, network, 429, 5xx. Anything else (bad token, bad prompt) is not retried. */
class WorkersAiUnavailable extends Error {}

const secs = (ms: number) => `${Math.round(ms / 1000)} s`;

async function run(model: string, body: Record<string, unknown>, timeoutMs: number): Promise<string> {
  if (!TOKEN) throw new Error("CF_API_TOKEN is not set");
  let r: Response;
  try {
    r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${model}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (e) {
    const err = e as Error & { cause?: { name?: string; message?: string } };
    const timedOut = err.name === "TimeoutError" || err.name === "AbortError" || err.cause?.name === "TimeoutError";
    throw new WorkersAiUnavailable(timedOut ? `${model} did not answer within ${secs(timeoutMs)}` : `${model} unreachable: ${err.cause?.message || err.message}`);
  }
  const data = await r.json().catch(() => ({}));
  if (r.status === 429 || r.status >= 500) {
    throw new WorkersAiUnavailable(`${model} returned ${r.status}: ${JSON.stringify(data.errors || data).slice(0, 200)}`);
  }
  if (!r.ok || data.success === false) {
    throw new Error(`Workers AI ${model} failed: ${JSON.stringify(data.errors || data).slice(0, 400)}`);
  }
  const res = data.result;
  // gpt-oss returns the Responses-style shape; Llama returns { response }.
  if (typeof res?.response === "string") return res.response;
  if (Array.isArray(res?.output)) {
    const msg = (res.output as { type?: string; content?: { text?: string }[] }[]).find((o) => o.type === "message");
    const text = msg?.content?.map((c) => c.text || "").join("") || "";
    if (text) return text;
  }
  if (typeof res === "string") return res;
  throw new Error(`Unexpected Workers AI response shape: ${JSON.stringify(res).slice(0, 300)}`);
}

function payload(model: string, messages: Msg[], maxTokens: number): Record<string, unknown> {
  if (model.includes("gpt-oss")) {
    const instructions = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const input = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content }));
    return { instructions, input, reasoning: { effort: REASONING }, max_output_tokens: maxTokens };
  }
  return { messages, max_tokens: maxTokens };
}

export async function chat(messages: Msg[], opts: { model?: string; maxTokens?: number } = {}): Promise<string> {
  const maxTokens = opts.maxTokens ?? 4000;
  const requested = opts.model || WRITER_MODEL;
  const primaryDemoted = requested !== FALLBACK_MODEL && Date.now() < primarySlowUntil;
  const model = primaryDemoted ? FALLBACK_MODEL : requested;
  try {
    return await run(model, payload(model, messages, maxTokens), model === FALLBACK_MODEL ? FALLBACK_TIMEOUT_MS : TIMEOUT_MS);
  } catch (e) {
    if (!(e instanceof WorkersAiUnavailable) || model === FALLBACK_MODEL) {
      if (e instanceof WorkersAiUnavailable) throw new Error(`The resume writer is not responding (${e.message}). Press Try again in a minute.`);
      throw e;
    }
    primarySlowUntil = Date.now() + DEMOTE_MS;
    console.warn(`Workers AI: ${e.message}; retrying with ${FALLBACK_MODEL}`);
    try {
      return await run(FALLBACK_MODEL, payload(FALLBACK_MODEL, messages, maxTokens), FALLBACK_TIMEOUT_MS);
    } catch (e2) {
      const second = e2 instanceof Error ? e2.message : String(e2);
      throw new Error(`The resume writer is not responding (${e.message}; fallback ${second}). Press Try again in a minute.`);
    }
  }
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

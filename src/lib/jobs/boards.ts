/**
 * Which companies hire through Greenhouse, Lever or Ashby, and what they have open. The catalog
 * started from 134 boards verified live on 19 Sep 2026; users add their own by pasting a careers URL.
 * Listings come from each board's public JSON API and are cached for six hours per board.
 */
import { getDoc, putDoc } from "../docs";
import type { Board } from "./fetch";

export type Company = { board: Board; token: string; name: string };
export type Listing = { board: Board; company: string; token: string; id: string; title: string; location: string; remote: boolean; url: string; postedAt?: string };

const gh = (t: string, n?: string): Company => ({ board: "greenhouse", token: t, name: n || pretty(t) });
const ab = (t: string, n?: string): Company => ({ board: "ashby", token: t, name: n || pretty(t) });
const lv = (t: string, n?: string): Company => ({ board: "lever", token: t, name: n || pretty(t) });
const pretty = (t: string) => t.replace(/[-_.]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bAi\b/g, "AI");

export const CATALOG: Company[] = [
  ...["6sense", "affirm", "agoda", "airbnb", "airtable", "amplitude", "asana", "bloomreach", "braze", "brex", "calendly", "carta", "chime", "cloudflare", "coherehealth", "coinbase", "databricks", "datadog", "discord", "dropbox", "duolingo", "elastic", "epicgames", "faire", "figma", "flexport", "gitlab", "gleanwork", "gomotive", "gusto", "instacart", "intercom", "lucidmotors", "lyft", "mixpanel", "mongodb", "neo4j", "nuro", "okta", "opswat", "pinterest", "pubmatic", "reddit", "robinhood", "roblox", "roku", "samsara", "scaleai", "sezzle", "smartsheet", "spacex", "squarespace", "toast", "togetherai", "truveta", "twilio", "waymo", "webflow", "zenoti", "zetaglobal"].map((t) => gh(t)),
  gh("gleanwork", "Glean"), gh("togetherai", "Together AI"), gh("scaleai", "Scale AI"), gh("epicgames", "Epic Games"), gh("lucidmotors", "Lucid Motors"), gh("gomotive", "Motive"),
  ...["Sierra", "Wisdom-AI", "aiprise", "applied", "artian", "baseten", "blaxel", "browserbase", "cartesia", "character", "clerk", "cohere", "crusoe", "elevenlabs", "exa", "friendliai", "genera", "granica", "harvey", "hatch", "infisical", "intentlab", "linear", "liveflow", "livekit", "mintlify", "monaco", "nanonets", "neon", "netic", "notion", "openai", "opengov", "outmarket", "perplexity", "posthog", "prosper-ai", "protege", "quora", "railway", "ramp", "reacher", "reflectionai", "render", "replit", "resend", "runpod", "sema4.ai", "spector-ai", "supabase", "tempo", "titan-ai", "tolken", "traba", "vooma", "warp", "writer"].map((t) => ab(t)),
  ab("Wisdom-AI", "Wisdom AI"), ab("openai", "OpenAI"), ab("elevenlabs", "ElevenLabs"), ab("posthog", "PostHog"), ab("livekit", "LiveKit"), ab("runpod", "RunPod"), ab("sema4.ai", "Sema4.ai"), ab("spector-ai", "Spector AI"), ab("prosper-ai", "Prosper AI"), ab("titan-ai", "Titan AI"), ab("reflectionai", "Reflection AI"), ab("friendliai", "FriendliAI"),
  ...["binance", "brillio-2", "cred", "cyara", "levelai", "meesho", "neuron7", "palantir", "smart-working-solutions", "spotify"].map((t) => lv(t)),
  lv("brillio-2", "Brillio"), lv("levelai", "Level AI"), lv("neuron7", "Neuron7")
].concat([gh("gitlab", "GitLab"), gh("mongodb", "MongoDB"), gh("spacex", "SpaceX"), gh("6sense", "6sense"), ab("elevenlabs", "ElevenLabs")])
  // Later entries with a proper display name win over the auto-prettified duplicate.
  .reduce<Company[]>((acc, c) => { const j = acc.findIndex((x) => x.board === c.board && x.token.toLowerCase() === c.token.toLowerCase()); if (j >= 0) acc[j] = c; else acc.push(c); return acc; }, []);

/** A board or careers URL (jobs.ashbyhq.com/acme, boards.greenhouse.io/acme, jobs.lever.co/acme) to a catalog entry. */
export function companyFromUrl(raw: string): Company | null {
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const parts = u.pathname.split("/").filter(Boolean);
    if (u.hostname.endsWith("greenhouse.io") && parts[0] && parts[0] !== "embed") return gh(parts[0]);
    if (u.hostname.endsWith("greenhouse.io") && parts[0] === "embed") { const f = u.searchParams.get("for"); return f ? gh(f) : null; }
    if (u.hostname.endsWith("ashbyhq.com") && parts[0]) return ab(parts[0]);
    if (u.hostname.endsWith("lever.co") && parts[0]) return lv(parts[0]);
  } catch { /* not a URL */ }
  return null;
}

// ---- per-user additions -------------------------------------------------------
export const userCompanies = async (userId: string) => (await getDoc<Company[]>(`users/${userId}/companies.json`)) ?? [];
export async function addUserCompany(userId: string, c: Company) {
  const list = await userCompanies(userId);
  if (!list.some((x) => x.board === c.board && x.token.toLowerCase() === c.token.toLowerCase())) { list.push(c); await putDoc(`users/${userId}/companies.json`, list); }
  return list;
}
export async function allCompanies(userId?: string): Promise<Company[]> {
  const mine = userId ? await userCompanies(userId) : [];
  return [...CATALOG, ...mine.filter((m) => !CATALOG.some((c) => c.board === m.board && c.token.toLowerCase() === m.token.toLowerCase()))];
}

// ---- listings -------------------------------------------------------------------
const TTL_MS = 6 * 60 * 60 * 1000;
type Cached = { at: number; listings: Listing[] };

async function fetchJson(url: string): Promise<unknown> {
  const r = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "auto-apply/1.0" }, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

async function fetchBoard(c: Company): Promise<Listing[]> {
  const base = { board: c.board, company: c.name, token: c.token };
  if (c.board === "greenhouse") {
    const d = (await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${c.token}/jobs`)) as { jobs?: { id: number; title: string; location?: { name: string }; absolute_url: string; updated_at?: string }[] };
    return (d.jobs || []).map((j) => ({ ...base, id: String(j.id), title: j.title, location: j.location?.name || "", remote: /remote/i.test(j.location?.name || ""), url: j.absolute_url, postedAt: j.updated_at }));
  }
  if (c.board === "ashby") {
    const d = (await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${c.token}`)) as { jobs?: { id: string; title: string; location?: string; isRemote?: boolean; jobUrl: string; publishedAt?: string }[] };
    return (d.jobs || []).map((j) => ({ ...base, id: j.id, title: j.title, location: j.location || "", remote: !!j.isRemote || /remote/i.test(j.location || ""), url: j.jobUrl, postedAt: j.publishedAt }));
  }
  const d = (await fetchJson(`https://api.lever.co/v0/postings/${c.token}?mode=json`)) as { id: string; text: string; categories?: { location?: string; allLocations?: string[] }; hostedUrl: string; createdAt?: number; workplaceType?: string }[];
  return (Array.isArray(d) ? d : []).map((j) => ({ ...base, id: j.id, title: j.text, location: j.categories?.location || j.categories?.allLocations?.join(", ") || "", remote: j.workplaceType === "remote" || /remote/i.test(j.categories?.location || ""), url: j.hostedUrl, postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : undefined }));
}

export async function boardListings(c: Company, force = false): Promise<Listing[]> {
  const key = `cache/boards/${c.board}/${c.token.toLowerCase()}.json`;
  const cached = force ? null : await getDoc<Cached>(key);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.listings;
  try {
    const listings = await fetchBoard(c);
    await putDoc(key, { at: Date.now(), listings } satisfies Cached);
    return listings;
  } catch { return cached?.listings ?? []; }
}

/** Fan out over every board with bounded concurrency. */
export async function allListings(companies: Company[], force = false): Promise<Listing[]> {
  const out: Listing[] = []; let i = 0;
  const worker = async () => { while (i < companies.length) { const c = companies[i++]; out.push(...(await boardListings(c, force))); } };
  await Promise.all(Array.from({ length: 12 }, worker));
  return out;
}

// ---- search -------------------------------------------------------------------------
const INDIA = /\b(india|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|gurugram|gurgaon|delhi|noida|kolkata|ahmedabad|kochi|jaipur|indore|apac)\b/i;
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 1);

export type SearchOptions = { query: string; location?: string; limit?: number; boards?: Board[] };

export function rankListings(listings: Listing[], opts: SearchOptions): (Listing & { score: number })[] {
  const q = words(opts.query || "").filter((w) => !["engineer", "software", "developer", "senior", "and", "or"].includes(w));
  const loc = (opts.location || "").trim();
  const wantsRemote = /remote|anywhere/i.test(loc);
  const wantsIndia = INDIA.test(loc) || /india/i.test(loc);
  const locWords = words(loc).filter((w) => !["remote", "or", "and", "india"].includes(w));
  const scored = listings.map((l) => {
    const title = l.title.toLowerCase();
    let score = 0;
    for (const w of q) if (title.includes(w)) score += 3;
    if (q.length && score === 0) return null;
    if (/engineer|developer/i.test(title)) score += 1;
    if (/(staff|principal|director|vp|head|manager|intern)\b/i.test(title)) score -= 2;
    const inIndia = INDIA.test(l.location); const isRemote = l.remote;
    if (loc) {
      let ok = false;
      if (wantsIndia && inIndia) { ok = true; score += 3; }
      // Remote counts, but a remote role in the person's own country counts more than one elsewhere.
      if (wantsRemote && isRemote) { ok = true; score += wantsIndia && !inIndia && /canada|united states|\bus\b|usa|uk|united kingdom|europe|emea/i.test(l.location) ? 0.5 : 2; }
      if (locWords.some((w) => l.location.toLowerCase().includes(w))) { ok = true; score += 3; }
      if (!ok) return null;
    }
    if (l.postedAt) { const days = (Date.now() - new Date(l.postedAt).getTime()) / 86400000; if (days < 14) score += 1; }
    if (opts.boards?.length && !opts.boards.includes(l.board)) return null;
    return { ...l, score };
  }).filter((x): x is Listing & { score: number } => !!x);
  return scored.sort((a, b) => b.score - a.score || (b.postedAt || "").localeCompare(a.postedAt || "")).slice(0, opts.limit ?? 50);
}

export async function searchJobs(userId: string | undefined, opts: SearchOptions) {
  const companies = await allCompanies(userId);
  const listings = await allListings(companies);
  return { total: listings.length, companies: companies.length, results: rankListings(listings, opts) };
}

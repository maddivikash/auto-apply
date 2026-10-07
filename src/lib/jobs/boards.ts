/**
 * Which companies hire through Greenhouse, Lever or Ashby, and what they have open. The catalog
 * started from 134 boards verified live on 19 Sep 2026; users add their own by pasting a careers URL.
 * Listings come from each board's public JSON API and are cached for six hours per board.
 */
import { after } from "next/server";
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
  const r = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "lazy-apply/1.0" }, signal: AbortSignal.timeout(12000) });
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

export async function boardListings(c: Company, force = false, serveStale = false): Promise<Listing[]> {
  const key = `cache/boards/${c.board}/${c.token.toLowerCase()}.json`;
  const cached = force ? null : await getDoc<Cached>(key);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.listings;
  const refresh = async () => {
    try {
      const listings = await fetchBoard(c);
      await putDoc(key, { at: Date.now(), listings } satisfies Cached);
      return listings;
    } catch { return cached?.listings ?? []; }
  };
  // A stale copy is served at once and refreshed after the response, like the catalog: a page never
  // waits on a job board (up to 12 s each) just because six hours have passed.
  if (cached && serveStale) { after(() => refresh().then(() => undefined)); return cached.listings; }
  return refresh();
}

/** Fan out over boards with bounded concurrency. */
async function fanOut(companies: Company[], force: boolean, serveStale = false): Promise<Listing[]> {
  const out: Listing[] = []; let i = 0;
  const worker = async () => { while (i < companies.length) { const c = companies[i++]; out.push(...(await boardListings(c, force, serveStale))); } };
  await Promise.all(Array.from({ length: 12 }, worker));
  return out;
}

// The shared catalog is read on every Discover visit, so its listings are kept as a few chunked
// documents (and in memory on a warm instance) instead of 130+ reads. A stale copy is served at once
// and refreshed in the background; only the very first visit waits for the boards.
const ALL_KEY = "cache/boards/_catalog";
const CHUNK = 3000;
let memo: Cached | null = null;
let refreshing: Promise<Cached> | null = null;

async function readCatalog(): Promise<Cached | null> {
  const meta = await getDoc<{ at: number; parts: number }>(`${ALL_KEY}/meta.json`);
  if (!meta) return null;
  const parts = await Promise.all(Array.from({ length: meta.parts }, (_, i) => getDoc<Listing[]>(`${ALL_KEY}/${i}.json`)));
  return parts.every(Boolean) ? { at: meta.at, listings: parts.flat() as Listing[] } : null;
}

async function writeCatalog(c: Cached): Promise<void> {
  const parts = Math.max(1, Math.ceil(c.listings.length / CHUNK));
  await Promise.all(Array.from({ length: parts }, (_, i) => putDoc(`${ALL_KEY}/${i}.json`, c.listings.slice(i * CHUNK, (i + 1) * CHUNK))));
  await putDoc(`${ALL_KEY}/meta.json`, { at: c.at, parts });
}

function refreshCatalog(force = false): Promise<Cached> {
  refreshing ??= fanOut(CATALOG, force)
    .then(async (listings) => {
      const c = { at: Date.now(), listings }; memo = c;
      // Saving is an optimisation: if it fails, the per-board caches and this instance's memory still work.
      await writeCatalog(c).catch((e) => console.error("catalog cache write failed", e));
      return c;
    })
    .finally(() => { refreshing = null; });
  return refreshing;
}

async function catalogListings(force: boolean): Promise<Listing[]> {
  if (force) return (await refreshCatalog(true)).listings;
  memo ??= await readCatalog();
  if (!memo) return (await refreshCatalog()).listings;
  if (Date.now() - memo.at >= TTL_MS) after(() => refreshCatalog().then(() => undefined));
  return memo.listings;
}

/** Every open role across the catalog plus the companies this user added. */
export async function allListings(companies: Company[], force = false): Promise<Listing[]> {
  const extra = companies.filter((m) => !CATALOG.some((c) => c.board === m.board && c.token.toLowerCase() === m.token.toLowerCase()));
  const [catalog, mine] = await Promise.all([catalogListings(force), fanOut(extra, force, !force)]);
  return [...catalog, ...mine];
}

// ---- search -------------------------------------------------------------------------
const INDIA = /\b(india|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|gurugram|gurgaon|delhi|noida|kolkata|ahmedabad|kochi|jaipur|indore|apac)\b/i;
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 1);

/**
 * Job fields for the Discover dropdown, matched on the title. A role can sit in several at once:
 * "Product Marketing Manager" is product, marketing and management; "Data Engineer" is software and analytics.
 */
export const JOB_FIELDS = [
  { id: "software", label: "Software engineering", match: /\b(engineer|engineering|developer|sde|swe|programmer|devops|sre|architect|firmware|full[- ]?stack|back[- ]?end|front[- ]?end|mobile|ios|android)\b/i },
  { id: "product", label: "Product management", match: /\bproduct (manager|owner|lead|director|management|operations|analyst|strategy|marketing)|\b(head|vp|director) of product|\bproduct manager|\bgroup pm\b|\bapm\b/i },
  { id: "analytics", label: "Analytics and data", match: /\b(analyst|analytics|data scien\w*|data engineer\w*|business intelligence|\bbi\b|insights|statistic\w*|quantitative|machine learning|ml engineer)\b/i },
  { id: "marketing", label: "Marketing", match: /\b(marketing|marketer|growth|seo|sem|content|brand|demand gen\w*|communications|social media|campaigns?|lifecycle|community|pr manager|copywriter)\b/i },
  { id: "management", label: "Management", match: /\b(manager|director|head of|vp|vice president|chief|general manager|team lead|lead,)\b/i },
] as const;
export type JobField = (typeof JOB_FIELDS)[number]["id"];

/** Every field a title belongs to. A plain "Product Manager" is product, not people management. */
export function fieldsOf(title: string): JobField[] {
  return JOB_FIELDS.filter((f) => f.match.test(title) && !(f.id === "management" && /^\s*(senior |sr\.? |lead |principal |associate |group )?product manager\b/i.test(title))).map((f) => f.id);
}

export type SearchOptions = { query: string; location?: string; limit?: number; boards?: Board[]; field?: JobField };

export function rankListings(listings: Listing[], opts: SearchOptions): (Listing & { score: number })[] {
  const q = words(opts.query || "").filter((w) => !["engineer", "software", "developer", "senior", "and", "or"].includes(w));
  const loc = (opts.location || "").trim();
  const wantsRemote = /remote|anywhere/i.test(loc);
  const wantsIndia = INDIA.test(loc) || /india/i.test(loc);
  const locWords = words(loc).filter((w) => !["remote", "or", "and", "india"].includes(w));
  const scored = listings.map((l) => {
    const title = l.title.toLowerCase();
    if (opts.field && !fieldsOf(l.title).includes(opts.field)) return null;
    const engineering = !opts.field || opts.field === "software";
    let score = 0;
    for (const w of q) if (title.includes(w)) score += 3;
    if (q.length && score === 0) return null;
    if (engineering && /engineer|developer/i.test(title)) score += 1;
    if (/(staff|principal|intern)\b/i.test(title) || (opts.field !== "management" && /(director|vp|head|manager)\b/i.test(title) && engineering)) score -= 2;
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

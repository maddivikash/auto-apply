import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getProfile, getSettings } from "@/lib/store";
import { Settings } from "@/lib/profile/types";
import { withProfileFallback } from "@/lib/apply/answers";
import { allCompanies, allListings, rankListings } from "@/lib/jobs/boards";
import type { Board } from "@/lib/jobs/fetch";
import { createApplicationAction, addCompanyAction } from "../../actions";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BOARDS: Board[] = ["greenhouse", "ashby", "lever"];
const BOARD_NAME: Record<Board, string> = { greenhouse: "Greenhouse", ashby: "Ashby", lever: "Lever" };

/** A starting query from the profile: the current title plus the skill groups that name a specialty. */
function defaultQuery(title: string, skills: Record<string, string[]>): string {
  const words = new Set<string>();
  for (const w of title.split(/[\s,/&-]+/)) if (w.length > 2 && !/^(senior|junior|staff|lead|developer|engineer|software|sde|ii|iii)$/i.test(w)) words.add(w);
  for (const k of Object.keys(skills)) { if (/ai|agent|llm|ml|data|platform|backend|frontend|full/i.test(k)) for (const w of k.split(/[\s,/&-]+/)) if (/ai|agent|llm|ml|platform|backend|frontend|full|stack|data/i.test(w)) words.add(w); }
  return [...words].slice(0, 7).join(" ") || "software engineer";
}

export default async function Discover({ searchParams }: { searchParams: Promise<{ q?: string; location?: string; board?: string; added?: string; error?: string }> }) {
  const uid = await requireUserId();
  const sp = await searchParams;
  const [profile, settings, companies] = await Promise.all([getProfile(uid), getSettings(uid), allCompanies(uid)]);
  const known = withProfileFallback(Settings.parse(settings ?? {}), profile);
  const q = sp.q ?? (profile ? defaultQuery(known.currentTitle || profile.roles[0]?.title || "", profile.skills) : "software engineer");
  const location = sp.location ?? (known.workAuthorizedCountries ? `${known.workAuthorizedCountries.split(",")[0].trim()}, Remote` : "Remote");
  const boards = (sp.board || "").split(",").filter((b): b is Board => BOARDS.includes(b as Board));
  const listings = await allListings(companies);
  const results = rankListings(listings, { query: q, location, limit: 60, boards: boards.length ? boards : undefined });
  const openByToken = new Map<string, number>();
  for (const l of listings) openByToken.set(`${l.board}/${l.token.toLowerCase()}`, (openByToken.get(`${l.board}/${l.token.toLowerCase()}`) || 0) + 1);
  const toggleBoard = (b: Board) => { const set = new Set(boards); if (set.has(b)) set.delete(b); else set.add(b); const p = new URLSearchParams({ q, location }); if (set.size) p.set("board", [...set].join(",")); return `/discover?${p}`; };
  return (
    <div className="space-y-8">
      <PageHeader title="Discover" description={`${listings.length.toLocaleString()} open roles across ${companies.length} companies that hire through Greenhouse, Ashby or Lever. Anything here can be prepared with one click.`} />

      <form method="get" className="panel flex flex-col gap-2 p-2 md:flex-row">
        <input name="q" defaultValue={q} placeholder="Title words: AI agents, platform, full stack" className="field mono h-11 flex-1 text-[13.5px]" aria-label="Title words" />
        <input name="location" defaultValue={location} placeholder="Location: Bengaluru, India, Remote" className="field mono h-11 md:w-64 text-[13.5px]" aria-label="Location" />
        {boards.length > 0 && <input type="hidden" name="board" value={boards.join(",")} />}
        <button className="btn-primary h-11 px-5">Search</button>
      </form>
      <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className="text-muted">Boards:</span>
        {BOARDS.map((b) => <Link key={b} href={toggleBoard(b)} className={`pill border ${boards.includes(b) || !boards.length ? "border-line-strong text-fg" : "border-line text-faint"}`}>{BOARD_NAME[b]}</Link>)}
        <span className="ml-auto text-faint">Listings refresh every six hours.</span>
      </div>

      <section className="panel overflow-hidden">
        <div className="panel-head"><h2 className="text-[15px] font-semibold">Best matches</h2><span className="meta">{results.length} shown</span></div>
        {results.length === 0 ? <p className="px-5 py-10 text-center text-[13.5px] text-muted">Nothing matched those words in that location. Try fewer words, or widen the location to a country or Remote.</p> : (
          <ul className="divide-rows">
            {results.map((l) => (
              <li key={`${l.board}/${l.id}`} className="grid gap-3 px-5 py-3.5 md:grid-cols-[1fr_auto_auto] md:items-center md:gap-5">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium">{l.company}, {l.title}</div>
                  <div className="meta mt-1 flex flex-wrap items-center gap-x-3"><span className="truncate">{l.location || (l.remote ? "Remote" : "Location not listed")}</span><span>{BOARD_NAME[l.board]}</span>{l.postedAt && <span>{new Date(l.postedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}</div>
                </div>
                <a href={l.url} target="_blank" rel="noreferrer" className="btn-quiet h-8 text-[12.5px]"><ExternalLink size={13} /> Posting</a>
                <form action={createApplicationAction}><input type="hidden" name="url" value={l.url} /><SubmitButton pending="Preparing" className="btn-ghost h-8 text-[12.5px]">Prepare</SubmitButton></form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><h2 className="text-[15px] font-semibold">Companies you can apply to</h2><span className="meta">{companies.length} companies</span></div>
        <div className="grid gap-6 p-5 md:grid-cols-3">
          {BOARDS.map((b) => (
            <div key={b}>
              <div className="mb-2 flex items-baseline justify-between"><h3 className="text-[13.5px] font-medium">{BOARD_NAME[b]}</h3><span className="meta">{companies.filter((c) => c.board === b).length}</span></div>
              <ul className="flex flex-wrap gap-1.5">
                {companies.filter((c) => c.board === b).sort((x, y) => x.name.localeCompare(y.name)).map((c) => {
                  const n = openByToken.get(`${c.board}/${c.token.toLowerCase()}`) || 0;
                  const href = c.board === "greenhouse" ? `https://job-boards.greenhouse.io/${c.token}` : c.board === "ashby" ? `https://jobs.ashbyhq.com/${c.token}` : `https://jobs.lever.co/${c.token}`;
                  return <a key={c.token} href={href} target="_blank" rel="noreferrer" className="pill border border-line text-fg hover:border-line-strong" title={`${n} open roles`}>{c.name}<span className="text-faint">{n}</span></a>;
                })}
              </ul>
            </div>
          ))}
        </div>
        <form action={addCompanyAction} className="flex flex-col gap-2 border-t border-line p-5 md:flex-row md:items-center">
          <label className="text-[13px] text-muted md:w-64">Add a company by its careers URL</label>
          <input name="careersUrl" placeholder="https://jobs.ashbyhq.com/acme" className="field mono flex-1 text-[13px]" aria-label="Careers URL" />
          <SubmitButton pending="Adding" className="btn-ghost">Add company</SubmitButton>
          {sp.added && <span className="text-[13px] text-go">Added {sp.added}.</span>}
          {sp.error && <span className="text-[13px] text-danger">{sp.error}</span>}
        </form>
      </section>
    </div>
  );
}

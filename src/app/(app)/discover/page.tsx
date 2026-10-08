import Link from "next/link";
import { ExternalLink, SearchX } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getProfile, getSettings, saveSettings } from "@/lib/store";
import { Settings } from "@/lib/profile/types";
import { withProfileFallback } from "@/lib/apply/answers";
import { allCompanies, allListings, rankListings, fieldsOf, JOB_FIELDS, type JobField } from "@/lib/jobs/boards";
import type { Board } from "@/lib/jobs/fetch";
import { createApplicationAction, addCompanyAction, setSearchCountryAction } from "../../actions";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { AutoSubmitForm, FilterLink, FilterProvider, PendingRegion } from "@/components/auto-submit-form";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BOARDS: Board[] = ["greenhouse", "ashby", "lever"];
/** Earliest posting time for the "posted within" filter; 0 means any time. */
const cutoff = (posted: string) => (posted === "all" ? 0 : Date.now() - Number(posted) * 86400000);
const PAGE_SIZE = 20;
const BOARD_NAME: Record<Board, string> = { greenhouse: "Greenhouse", ashby: "Ashby", lever: "Lever" };

/** A starting query from the profile: the current title plus the skill groups that name a specialty. */
function defaultQuery(title: string, skills: Record<string, string[]>): string {
  const words = new Set<string>();
  for (const w of title.split(/[\s,/&-]+/)) if (w.length > 2 && !/^(senior|junior|staff|lead|developer|engineer|software|sde|ii|iii)$/i.test(w)) words.add(w);
  for (const k of Object.keys(skills)) { if (/ai|agent|llm|ml|data|platform|backend|frontend|full/i.test(k)) for (const w of k.split(/[\s,/&-]+/)) if (/ai|agent|llm|ml|platform|backend|frontend|full|stack|data/i.test(w)) words.add(w); }
  return [...words].slice(0, 7).join(" ") || "software engineer";
}

export default async function Discover({ searchParams }: { searchParams: Promise<{ q?: string; location?: string; board?: string; added?: string; error?: string; page?: string; field?: string; from?: string; sort?: string; posted?: string }> }) {
  const uid = await requireUserId();
  const sp = await searchParams;
  const [profile, settings, companies] = await Promise.all([getProfile(uid), getSettings(uid), allCompanies(uid)]);
  const known = withProfileFallback(Settings.parse(settings ?? {}), profile);
  // The field comes from the URL when picked, otherwise from the last pick; a new pick is remembered.
  const isField = (f: string): f is JobField => JOB_FIELDS.some((x) => x.id === f);
  const picked = sp.field ?? known.jobField;
  const field: JobField | undefined = picked && isField(picked) ? picked : undefined;
  if (sp.field !== undefined && sp.field !== (settings?.jobField ?? "")) await saveSettings(uid, { ...Settings.parse(settings ?? {}), jobField: field ?? "" });
  // Title words default from the profile only for software roles; other fields start from the field itself.
  const q = sp.q ?? (field && field !== "software" ? "" : profile ? defaultQuery(known.currentTitle || profile.roles[0]?.title || "", profile.skills) : field ? "" : "software engineer");
  const country = known.workAuthorizedCountries.split(",")[0].trim();
  const needsCountry = !country && !sp.location;
  const location = sp.location ?? (country ? `${country}, Remote` : "");
  // Anything different from what a fresh visit shows: words and place from the profile, all fields and boards, 30 days, best match.
  const defaultQ = profile ? defaultQuery(known.currentTitle || profile.roles[0]?.title || "", profile.skills) : "software engineer";
  const defaultLocation = country ? `${country}, Remote` : "";
  const filtered = !!field || q !== defaultQ || location !== defaultLocation || (sp.posted ?? "30") !== "30" || sp.sort === "newest" || !!sp.board;
  const boards = (sp.board || "").split(",").filter((b): b is Board => BOARDS.includes(b as Board));
  const listings = await allListings(companies);
  // Posted within: last 30 days unless chosen otherwise. Roles without a date only show under "Any time".
  const posted = (["7", "30", "90", "all"] as const).find((x) => x === sp.posted) ?? "30";
  const sort = sp.sort === "newest" ? "newest" : "match";
  const since = cutoff(posted);
  const recent = since ? listings.filter((l) => l.postedAt && new Date(l.postedAt).getTime() >= since) : listings;
  let ranked = rankListings(recent, { query: q, location, limit: 200, boards: boards.length ? boards : undefined, field });
  // By time, not by text: boards write dates with different time-zone offsets.
  if (sort === "newest") ranked = [...ranked].sort((a, b) => (Date.parse(b.postedAt || "") || 0) - (Date.parse(a.postedAt || "") || 0));
  const pages = Math.max(1, Math.ceil(ranked.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(sp.page) || 1));
  const results = ranked.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageHref = (n: number) => { const p = new URLSearchParams({ q, location, field: field ?? "", posted, sort }); if (boards.length) p.set("board", boards.join(",")); if (n > 1) p.set("page", String(n)); return `/discover?${p}`; };
  const openByToken = new Map<string, number>();
  for (const l of listings) openByToken.set(`${l.board}/${l.token.toLowerCase()}`, (openByToken.get(`${l.board}/${l.token.toLowerCase()}`) || 0) + 1);
  const toggleBoard = (b: Board) => { const set = new Set(boards); if (set.has(b)) set.delete(b); else set.add(b); const p = new URLSearchParams({ q, location, field: field ?? "", posted, sort }); if (set.size) p.set("board", [...set].join(",")); return `/discover?${p}`; };
  return (
    <FilterProvider>
    <div className="space-y-8">
      <PageHeader title="Discover" description={`${listings.length.toLocaleString()} open roles across ${companies.length} companies that hire through Greenhouse, Ashby or Lever. Refreshed every six hours and completely free. Anything here can be prepared with one click.`} />

      {sp.from === "answers" && <p className="rounded-[var(--radius-ctl)] bg-go-soft px-4 py-3 text-[13.5px]"><span className="font-medium text-go">You are set up.</span> Pick a role below and press Prepare, or paste any Greenhouse, Lever or Ashby link on Applications.</p>}
      {needsCountry && (
        <form action={setSearchCountryAction} className="flex flex-col gap-3 border border-line-strong bg-surface p-4 md:flex-row md:items-center md:px-5">
          <div className="flex items-start gap-3 md:flex-1">
            <span className="mt-[3px] h-2 w-2 shrink-0 bg-accent" aria-hidden />
            <div><div className="text-[14px] font-medium">Which country do you want to work in?</div><p className="mt-0.5 text-[13px] text-muted">Suggestions below are ranked for that country plus remote roles. Change it any time on the Answers page.</p></div>
          </div>
          <input name="country" placeholder="India" className="field mono h-9 md:w-48" aria-label="Country" required />
          <SubmitButton pending="Saving" className="btn-primary h-9">Show roles</SubmitButton>
        </form>
      )}
      {/* Keyed by the active filters, so the boxes show them after Reset or Back instead of what was last typed. */}
      <AutoSubmitForm key={[field, q, location, posted, sort].join("|")} className="space-y-3">
        <div className="panel flex flex-col gap-2 p-2 md:flex-row">
        <select name="field" defaultValue={field ?? ""} className="field h-11 text-[13.5px] md:w-52" aria-label="Job field">
          <option value="">All job fields</option>
          {JOB_FIELDS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <input name="q" defaultValue={q} placeholder="Title words: AI agents, platform, growth" className="field mono h-11 flex-1 text-[13.5px]" aria-label="Title words" />
        <input name="location" defaultValue={location} placeholder="Location: Bengaluru, India, Remote" className="field mono h-11 md:w-64 text-[13.5px]" aria-label="Location" />
        {boards.length > 0 && <input type="hidden" name="board" value={boards.join(",")} />}
        <button className="btn-primary h-11 px-5">Search</button>
        </div>
        {/* Applied the moment they change; the search words above need Enter or Search. */}
        <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
          <span className="text-muted">Posted</span>
        <select name="posted" defaultValue={posted} className="field h-8 w-auto py-0 pl-2.5 text-[12.5px]" aria-label="Posted">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 3 months</option>
          <option value="all">Any time</option>
        </select>
          <span className="ml-2 text-muted">Sort by</span>
        <select name="sort" defaultValue={sort} className="field h-8 w-auto py-0 pl-2.5 text-[12.5px]" aria-label="Sort by">
          <option value="match">Best match</option>
          <option value="newest">Newest first</option>
        </select>
        {filtered && <FilterLink href="/discover?field=" className="ml-2 inline-flex h-8 items-center gap-1 rounded-[var(--radius-ctl)] px-2.5 text-accent hover:bg-accent-soft">↺ Reset filters</FilterLink>}
        </div>
      </AutoSubmitForm>
      <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className="text-muted">Boards:</span>
        {BOARDS.map((b) => <FilterLink key={b} href={toggleBoard(b)} className={`pill border ${boards.includes(b) || !boards.length ? "border-line-strong text-fg" : "border-line text-faint"}`}>{BOARD_NAME[b]}</FilterLink>)}
        <span className="ml-auto text-faint">Listings refresh every six hours.</span>
      </div>

      <PendingRegion>
      <section className="panel overflow-hidden">
        <div className="panel-head"><h2 className="text-[15px] font-semibold">{sort === "newest" ? "Newest first" : needsCountry ? "Matches everywhere" : "Best matches"}{posted !== "all" ? <span className="ml-2 text-[12.5px] font-normal text-muted">posted in the last {posted === "7" ? "7 days" : posted === "30" ? "30 days" : "3 months"}</span> : null}</h2><span className="meta">{ranked.length ? `${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + results.length} of ${ranked.length}${ranked.length >= 200 ? "+" : ""}` : "0"}{needsCountry ? ", set a country above to rank by place" : ""}</span></div>
        {results.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-surface-2 text-accent"><SearchX size={22} /></span>
            <h3 className="mt-4 text-[16px] font-medium">No roles matched</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted">Try fewer words, widen the location to a country or Remote, or pick a different field.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2"><Link href={`/discover?${new URLSearchParams({ q: "", location, field: field ?? "", posted, sort })}`} className="btn-ghost h-9">Clear the search words</Link><Link href={`/discover?${new URLSearchParams({ q, location: "Remote", field: field ?? "", posted, sort })}`} className="btn-ghost h-9">Show remote roles</Link>{posted !== "all" && <Link href={`/discover?${new URLSearchParams({ q, location, field: field ?? "", posted: "all", sort })}`} className="btn-ghost h-9">Show older roles</Link>}</div>
          </div>
        ) : (
          <ul className="divide-rows">
            {results.map((l) => (
              <li key={`${l.board}/${l.id}`} className="grid gap-3 px-5 py-3.5 md:grid-cols-[1fr_auto_auto] md:items-center md:gap-5">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium">{l.company}, {l.title}</div>
                  <div className="meta mt-1 flex flex-wrap items-center gap-x-3"><span className="truncate">{l.location || (l.remote ? "Remote" : "Location not listed")}</span><span>{BOARD_NAME[l.board]}</span>{fieldsOf(l.title).map((f) => <span key={f} className={f === field ? "text-accent" : ""}>{JOB_FIELDS.find((x) => x.id === f)!.label}</span>)}{l.postedAt && <span>{new Date(l.postedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}</div>
                </div>
                <a href={l.url} target="_blank" rel="noreferrer" className="btn-quiet h-8 text-[12.5px]"><ExternalLink size={13} /> Posting</a>
                {profile
                  ? <form action={createApplicationAction}><input type="hidden" name="url" value={l.url} /><SubmitButton pending="Preparing" className="btn-ghost h-8 text-[12.5px]">Prepare</SubmitButton></form>
                  : <button type="button" disabled title="Upload your resume first: every application is written from it" className="btn-ghost h-8 cursor-not-allowed text-[12.5px] opacity-40">Prepare</button>}
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <nav className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px]" aria-label="Pages">
            {page > 1 ? <FilterLink href={pageHref(page - 1)} className="btn-ghost h-8">Previous</FilterLink> : <span />}
            <span className="meta">Page {page} of {pages}</span>
            {page < pages ? <FilterLink href={pageHref(page + 1)} className="btn-ghost h-8">Next</FilterLink> : <span />}
          </nav>
        )}
      </section>
      </PendingRegion>

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
    </FilterProvider>
  );
}

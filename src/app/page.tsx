import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { userId } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { AtsBadge } from "@/components/ats-badge";
import { resumeHtml, TEMPLATES } from "@/lib/resume/templates";
import { SAMPLE_PROFILE, SHOWCASE } from "@/lib/resume/sample";
import { ScoreRing } from "@/components/score-ring";
import { HowItWorks, RewriteDemo } from "@/components/landing-interactive";
import { AutoApplyDemo } from "@/components/auto-apply-demo";
import { TemplateCarousel } from "@/components/template-carousel";

/** Screen recordings of the real app in test mode, with a fictional applicant. Made by scripts/record-how.mts. */
const HOW = [
  { title: "Paste a job link", body: "Drop in any Greenhouse, Lever or Ashby posting. The job is read from the board itself, and a tailored one-page resume is ready in about a minute.", video: "/how/1-paste.mp4", poster: "/how/1-paste.jpg" },
  { title: "Edit any line, or let AI rewrite it", body: "Change a bullet by hand or ask for a rewrite. The fit score and the keywords you match update as you type, and nothing invents a number you did not give it.", video: "/how/2-edit.mp4", poster: "/how/2-edit.jpg" },
  { title: "Switch templates instantly", body: "Seven ATS-safe layouts. Click one and the page changes on the spot; save and the PDF is rendered in that layout.", video: "/how/3-templates.mp4", poster: "/how/3-templates.jpg" },
  { title: "Approve, and press Submit yourself", body: "Answers come from what you told us once. A runner on your machine fills the form and stops. Nothing goes out until you press Submit.", video: "/how/4-approve.mp4", poster: "/how/4-approve.jpg" }
];

export default async function Landing() {
  if (await userId()) redirect("/dashboard");
  return (
    <main className="min-h-screen overflow-x-clip bg-bg text-fg">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-4">
        <Brand />
        <nav className="hidden items-center gap-7 text-[14px] text-muted md:flex">
          <a href="#how" className="hover:text-fg">How it works</a>
          <a href="#toolkit" className="hover:text-fg">Features</a>
          <a href="#templates" className="hover:text-fg">Templates</a>
          <Link href="/sprint" className="hover:text-fg">Done for you</Link>
        </nav>
        <nav className="flex items-center gap-2"><Link href="/sign-in" className="btn-quiet">Sign in</Link><Link href="/sign-up" className="btn-ink">Start free</Link></nav>
      </header>

      {/* Hero: the pitch on the left, one application playing through on the right. */}
      <section className="px-3">
        <div className="hero-grad navy relative mx-auto grid max-w-[1900px] grid-cols-1 items-center gap-12 overflow-hidden rounded-[24px] px-5 py-14 sm:px-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:py-20 xl:px-20">
          <div className="rise min-w-0 max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-1.5 text-[13px] text-muted"><span className="h-1.5 w-1.5 rounded-full bg-accent pulse-soft" />Auto-apply for Greenhouse, Lever and Ashby</span>
            <h1 className="display mt-6 text-[42px] sm:text-[56px] xl:text-[64px]">Paste a job link.<br />We do the <span className="serif-i text-accent">applying.</span></h1>
            <p className="mt-6 text-[17.5px] leading-relaxed text-muted">Lazy Apply converts your resume into one tailored for that exact role, fills the application form from answers you gave once, and stops at Submit. You press it.</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/sign-up" className="btn-primary btn-lg">Start auto-applying</Link>
              <Link href="#how" className="btn-lg inline-flex items-center px-3 text-[15px] text-muted hover:text-fg">Watch it work →</Link>
            </div>
            <ul className="mt-9 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-5 text-[12.5px] text-muted">
              <li><span className="block text-[22px] font-medium text-fg">~60s</span>link to tailored resume</li>
              <li><span className="block text-[22px] font-medium text-fg">130+</span>company boards</li>
              <li><span className="block text-[22px] font-medium text-fg">3</span>applications free</li>
            </ul>
          </div>
          <div className="rise-2 min-w-0"><AutoApplyDemo /></div>
        </div>
      </section>

      {/* How: real screen recordings */}
      <section id="how" className="mx-auto max-w-[1240px] px-6 pt-28">
        <div className="eyebrow">How it works</div>
        <h2 className="display mt-4 max-w-2xl text-[36px] sm:text-[46px]">One link in. <span className="serif-i">A finished application out.</span></h2>
        <p className="mt-4 max-w-xl text-[16px] text-muted">Recorded in the real app with a sample applicant. Pick a step or let it play.</p>
        <div className="mt-12"><HowItWorks steps={HOW} /></div>
      </section>

      {/* Stats */}
      <section className="px-3 pt-24">
        <div className="lilac-grad mx-auto max-w-[1900px] rounded-[22px] px-6 py-16">
          <div className="mx-auto max-w-[1040px]">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <h2 className="display max-w-md text-[36px] sm:text-[44px]">Less typing. <span className="serif-i">More interviews.</span></h2>
              <p className="max-w-xs text-[14px] text-muted">Roles come straight from each company&apos;s own job board, refreshed every six hours.</p>
            </div>
            <ul className="mt-10 grid border-t border-fg/70 sm:grid-cols-3">
              {[["130+", "company boards watched for new roles", true], ["~60s", "from pasting a link to a resume ready to review", false], ["0", "applications sent without your Submit", false]].map(([n, label, blue]) => (
                <li key={String(label)} className="border-line-strong py-6 sm:border-l sm:px-6 sm:first:border-l-0 sm:first:pl-0">
                  <div className={`display text-[64px] sm:text-[80px] ${blue ? "text-accent" : ""}`}>{n}</div>
                  <div className="mt-2 max-w-[220px] text-[14px] text-muted">{label}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Toolkit */}
      <section id="toolkit" className="px-3 pt-28">
        <div className="navy mx-auto max-w-[1900px] rounded-[22px] px-6 py-20">
          <div className="mx-auto max-w-[1040px]">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div><div className="eyebrow">Under the hood</div><h2 className="display mt-4 max-w-xl text-[40px] sm:text-[52px]">From link to Submit, <span className="serif-i">nothing to retype.</span></h2></div>
              <div className="max-w-xs"><p className="text-[14px] text-muted">The writing is grounded in your profile. The submitting is yours.</p><Link href="/sign-up" className="paper btn-ghost mt-4">Start free</Link></div>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <Tile n="01" title="Your resume, converted for each job." wide>
                <RewriteDemo />
              </Tile>
              <Tile n="02" title="Scored before you send it.">
                <div className="mt-6 flex items-center gap-4"><ScoreRing value={28} size={96} tone="var(--accent)" label="Keyword match" /><p className="text-[13px] text-muted">Keyword match, the way an ATS reads it. Tailoring lifts it by picking your most relevant work, not by copying the ad.</p></div>
              </Tile>
              <Tile n="03" title="See which keywords land.">
                <div className="mt-6 flex flex-wrap gap-1.5">{["FastAPI", "Kubernetes", "SQS", "React"].map((k) => <span key={k} className="chip bg-go-soft text-go"><Check size={11} strokeWidth={3} />{k}</span>)}<span className="chip border border-dashed border-line-strong text-muted">gRPC</span></div>
              </Tile>
              <Tile n="04" title="Fresh roles from 130+ boards."><p className="mt-3 text-[13.5px] text-muted">Filter by field, country and remote. Prepare any of them with one click.</p></Tile>
              <Tile n="05" title="Form answers you set once."><p className="mt-3 text-[13.5px] text-muted">Sponsorship, notice period, links. A new question is asked, never guessed.</p></Tile>
              <Tile n="06" title="Filled on your machine." accent wide3><p className="mt-3 text-[13.5px] text-white/80">A visible browser window types the answers, attaches the PDF and stops. You press Submit.</p></Tile>
            </div>
          </div>
        </div>
      </section>

      {/* Templates: the finishing touch, not the headline. */}
      <section id="templates" className="mx-auto max-w-[1240px] overflow-hidden px-6 pt-28 text-center">
        <AtsBadge />
        <h2 className="display text-[34px] sm:text-[42px]">Every resume comes out <span className="serif-i">in your layout.</span></h2>
        <p className="mx-auto mt-4 max-w-lg text-[15.5px] text-muted">Pick one of seven ATS-safe templates once. Each tailored resume is rendered in it, and any single one can switch in a click.</p>
        <div className="mt-12"><TemplateCarousel pages={TEMPLATES.map((t) => ({ id: t.id, name: t.name, tier: t.tier, blurb: t.blurb, html: resumeHtml(SHOWCASE, SAMPLE_PROFILE, 1, t.id) }))} /></div>
      </section>

      {/* CTA */}
      <section className="px-3 pb-6 pt-28">
        <div className="hero-grad navy mx-auto max-w-[1900px] rounded-[22px] px-6 py-20 text-center">
          <h2 className="display mx-auto max-w-2xl text-[38px] sm:text-[50px]">Bring the resume you have. <span className="serif-i text-accent">We&apos;ll take it from there.</span></h2>
          <p className="mx-auto mt-5 max-w-md text-[15.5px] text-muted">Upload it once. It becomes your profile, and every tailored resume is written only from it.</p>
          <Link href="/sign-up" className="btn-primary btn-lg mt-9">Create your account</Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-6 py-10 text-[13px] text-muted">
        <Brand />
        <nav className="flex gap-5"><Link href="/privacy" className="hover:text-fg">Privacy</Link><Link href="/terms" className="hover:text-fg">Terms</Link><Link href="/connect/docs" className="hover:text-fg">API</Link></nav>
      </footer>
    </main>
  );
}

function Tile({ n, title, children, wide, wide3, accent }: { n: string; title: string; children?: React.ReactNode; wide?: boolean; wide3?: boolean; accent?: boolean }) {
  return (
    <div className={`rounded-[16px] p-6 shadow-[var(--ring)] ${wide ? "md:col-span-2" : wide3 ? "md:col-span-3" : ""} ${accent ? "bg-[#0b7f7a] [--muted:rgba(255,255,255,0.8)]" : "bg-surface"}`}>
      <div className={`eyebrow ${accent ? "!text-white/70" : "!text-faint"}`}>{n}</div>
      <h3 className="mt-3 text-[20px] font-medium leading-snug tracking-[-0.02em]">{title}</h3>
      {children}
    </div>
  );
}

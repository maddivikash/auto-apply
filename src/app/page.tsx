import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { userId } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { StageTrack } from "@/components/status";
import { ResumeFrame } from "@/components/resume-frame";
import { AtsBadge } from "@/components/ats-badge";
import { resumeHtml, TEMPLATES } from "@/lib/resume/templates";
import { profileAsResume } from "@/lib/resume/default";
import { SAMPLE_PROFILE } from "@/lib/resume/sample";

export default async function Landing() {
  if (await userId()) redirect("/dashboard");
  const sample = profileAsResume(SAMPLE_PROFILE);
  return (
    <main className="min-h-screen overflow-x-clip bg-bg text-fg">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-4">
        <Brand />
        <nav className="hidden items-center gap-7 text-[14px] text-muted md:flex">
          <a href="#how" className="hover:text-fg">How it works</a>
          <a href="#templates" className="hover:text-fg">Templates</a>
          <a href="#toolkit" className="hover:text-fg">Toolkit</a>
          <Link href="/sprint" className="hover:text-fg">Done for you</Link>
        </nav>
        <nav className="flex items-center gap-2"><Link href="/sign-in" className="btn-quiet">Sign in</Link><Link href="/sign-up" className="btn-ink">Start free</Link></nav>
      </header>

      {/* Hero */}
      <section className="px-3">
        <div className="hero-grad navy relative mx-auto max-w-[1900px] overflow-hidden rounded-[22px] px-6 pb-0 pt-16 text-center sm:pt-20">
          <div className="rise mx-auto flex max-w-3xl flex-col items-center">
            <span className="paper inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-medium shadow-[0_6px_20px_-8px_rgba(0,0,0,0.4)]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white"><Sparkles size={11} /></span>Greenhouse, Lever and Ashby, filled on your machine</span>
            <h1 className="display mt-7 text-[44px] text-white sm:text-[60px] lg:text-[70px]">Paste a job link.<br />Get a resume that fits it.</h1>
            <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-white/80">A one-page resume tailored from your own profile, scored like an ATS, with the application form answered. You review it, edit any line, and press Submit.</p>
            <Link href="/sign-up" className="btn-primary btn-lg mt-9">Build my first application</Link>
            <p className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] text-white/75"><span>3 applications free</span><span aria-hidden>·</span><span>No card</span><span aria-hidden>·</span><span>Nothing is sent without you</span></p>
          </div>
          <HeroResume html={resumeHtml(sample, SAMPLE_PROFILE, 1, "standard")} />
        </div>
      </section>

      {/* Stats */}
      <section className="px-3 pt-24">
        <div className="lilac-grad mx-auto max-w-[1900px] rounded-[22px] px-6 py-16">
          <div className="mx-auto max-w-[1040px]">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <h2 className="display max-w-md text-[36px] sm:text-[44px]">Every application, ready in about a minute.</h2>
              <p className="max-w-xs text-[14px] text-muted">Pulled straight from each company&apos;s own job board, refreshed every six hours.</p>
            </div>
            <ul className="mt-10 grid border-t border-fg/70 sm:grid-cols-3">
              {[["130+", "company boards watched for new roles", true], ["~60s", "from pasting a link to a resume ready to review", false], ["7", "ATS-safe templates, all free", false]].map(([n, label, blue]) => (
                <li key={String(label)} className="border-line-strong py-6 sm:border-l sm:px-6 sm:first:border-l-0 sm:first:pl-0">
                  <div className={`display text-[64px] sm:text-[80px] ${blue ? "text-accent" : ""}`}>{n}</div>
                  <div className="mt-2 max-w-[220px] text-[14px] text-muted">{label}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="mx-auto max-w-[1240px] px-6 pt-28 text-center">
        <AtsBadge />
        <h2 className="display text-[36px] sm:text-[46px]">Resume templates every ATS can read</h2>
        <p className="mx-auto mt-4 max-w-lg text-[16px] text-muted">One column of real text and standard headings, so Greenhouse, Lever, Ashby and Workday read every line instead of skipping it.</p>
        <ul className="mt-12 grid grid-cols-2 gap-5 text-left sm:grid-cols-3 lg:grid-cols-4">
          {TEMPLATES.slice(0, 4).map((t) => (
            <li key={t.id}>
              <div className="overflow-hidden rounded-[10px] shadow-[0_1px_2px_rgba(7,26,49,0.08),0_16px_40px_-20px_rgba(7,26,49,0.45)]"><ResumeFrame html={resumeHtml(sample, SAMPLE_PROFILE, 1, t.id)} title={`${t.name} template`} /></div>
              <div className="mt-3 flex items-baseline justify-between"><span className="text-[15px] font-medium">{t.name}</span><span className="meta">{t.tier} tier</span></div>
            </li>
          ))}
        </ul>
        <div className="paper mx-auto mt-10 grid max-w-3xl gap-6 rounded-[16px] bg-surface p-6 text-left shadow-[var(--ring)] md:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="eyebrow !text-faint">Read correctly by</div>
            <div className="mt-3 flex flex-wrap gap-2">{["Greenhouse", "Lever", "Ashby", "Workday", "iCIMS", "SmartRecruiters"].map((b) => <span key={b} className="chip bg-surface-2 text-fg"><Check size={11} strokeWidth={3} className="text-go" /> {b}</span>)}</div>
          </div>
          <ul className="space-y-2 text-[13.5px] md:border-l md:border-line md:pl-6">{["Clear reading order", "Real text, no images", "Standard section headings", "No tables or text boxes"].map((x) => <li key={x} className="flex items-center justify-between">{x}<Check size={14} strokeWidth={3} className="text-go" /></li>)}</ul>
        </div>
      </section>

      {/* Toolkit */}
      <section id="toolkit" className="px-3 pt-28">
        <div className="navy mx-auto max-w-[1900px] rounded-[22px] px-6 py-20">
          <div className="mx-auto max-w-[1040px]">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div><div className="eyebrow">The whole toolkit</div><h2 className="display mt-4 max-w-xl text-[40px] sm:text-[52px]">Everything between the job link and Submit.</h2></div>
              <div className="max-w-xs"><p className="text-[14px] text-muted">The writing is grounded in your profile. The submitting is yours.</p><Link href="/sign-up" className="paper btn-ghost mt-4">Start free</Link></div>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <Tile n="01" title="Edit your resume line by line." wide>
                <div className="paper mt-6 rounded-[12px] bg-white p-4 text-[13px]">
                  <span className="chip bg-accent-soft text-accent"><Sparkles size={11} /> AI rewrite</span>
                  <p className="mt-3 text-muted line-through">Worked on the events service and made it faster.</p>
                  <p className="mt-1">Built a <b>FastAPI</b> service that processes <b>2 million events a day</b> with p95 latency under 120ms.</p>
                </div>
              </Tile>
              <Tile n="02" title="Scored like an ATS.">
                <div className="mt-8 text-[64px] font-medium leading-none tracking-[-0.04em] text-go">84%</div>
                <div className="mt-3 h-1.5 rounded-full bg-surface-2"><div className="h-full w-[84%] rounded-full bg-go" /></div>
              </Tile>
              <Tile n="03" title="Every keyword the job asks for.">
                <div className="mt-6 flex flex-wrap gap-1.5">{["FastAPI", "Kubernetes", "SQS", "React"].map((k) => <span key={k} className="chip bg-go-soft text-go"><Check size={11} strokeWidth={3} />{k}</span>)}<span className="chip border border-dashed border-line-strong text-muted">gRPC</span></div>
              </Tile>
              <Tile n="04" title="Fresh roles from 130+ boards."><p className="mt-3 text-[13.5px] text-muted">Filter by field, country and remote. Prepare any of them with one click.</p></Tile>
              <Tile n="05" title="Form answers you set once."><p className="mt-3 text-[13.5px] text-muted">Sponsorship, notice period, links. A new question is asked, never guessed.</p></Tile>
              <Tile n="06" title="Filled on your machine." accent wide3><p className="mt-3 text-[13.5px] text-white/80">A visible browser window types the answers, attaches the PDF and stops. You press Submit.</p></Tile>
            </div>
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="mx-auto max-w-[1040px] px-6 py-28">
        <div className="eyebrow">How it works</div>
        <h2 className="display mt-4 max-w-xl text-[36px] sm:text-[44px]">Five stages, and the last one is always yours.</h2>
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Read", "The posting is read from the board's own API, including every question its form asks."],
            ["Resume", "A one-page resume is written for the role. Every number is checked against your profile."],
            ["Answers", "Known answers come from your Answers page. Anything new is asked, in the app and by email."],
            ["Filled", "A runner on your computer opens the real form, types the answers and attaches the PDF."],
            ["Submitted", "You press Submit. That is the only way anything goes out."]
          ].map(([title, body], i) => (
            <li key={title}>
              <span className={`block h-[5px] w-full rounded-full ${i < 4 ? "bg-go" : "bg-accent"}`} aria-hidden />
              <h3 className="mt-4 text-[15px] font-medium">{title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
        <div className="panel mt-14 p-5"><div className="flex items-center justify-between text-[13px]"><span className="font-medium">Cloudflare, Software Engineer, Platforms</span><span className="pill bg-signal-soft text-signal">1 question needs you</span></div><div className="mt-4"><StageTrack status="ready" needsDetails /></div></div>
      </section>

      {/* CTA */}
      <section className="px-3 pb-6">
        <div className="hero-grad navy mx-auto max-w-[1900px] rounded-[22px] px-6 py-20 text-center">
          <h2 className="display mx-auto max-w-2xl text-[38px] text-white sm:text-[50px]">Your next application starts with the resume you already have.</h2>
          <p className="mx-auto mt-5 max-w-md text-[15.5px] text-white/80">Upload it once. It becomes your profile, and every tailored resume is written only from it.</p>
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

/** The sample resume rising out of the hero, with the match and rewrite cards floating beside it. */
function HeroResume({ html }: { html: string }) {
  return (
    <div className="rise-2 paper relative mx-auto mt-16 max-w-[760px] text-left">
      <div className="absolute inset-x-10 -top-5 h-8 rounded-t-[10px] bg-white/25" aria-hidden />
      <div className="absolute inset-x-5 -top-2.5 h-8 rounded-t-[10px] bg-white/45" aria-hidden />
      <div className="relative h-[420px] overflow-hidden rounded-t-[10px] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] sm:h-[520px]"><ResumeFrame html={html} title="A sample tailored resume" /></div>
      <div className="absolute -right-6 top-24 hidden w-[230px] rounded-[14px] bg-white p-4 shadow-[0_20px_50px_-20px_rgba(7,26,49,0.55)] lg:-right-44 md:block">
        <div className="flex items-center justify-between text-[13px] text-muted">Job match<span className="pill bg-go-soft text-go">Strong</span></div>
        <div className="mt-2 text-[40px] font-medium leading-none tracking-[-0.04em]">84%</div>
        <div className="mt-3 h-1.5 rounded-full bg-surface-2"><div className="h-full w-[84%] rounded-full bg-go" /></div>
        <div className="eyebrow mt-4 !text-faint">Keywords matched</div>
        <div className="mt-2 flex flex-wrap gap-1.5">{["FastAPI", "Kubernetes", "SQS", "React"].map((k) => <span key={k} className="chip bg-go-soft text-go"><Check size={11} strokeWidth={3} />{k}</span>)}</div>
      </div>
      <div className="absolute -left-6 bottom-10 hidden w-[240px] rounded-[14px] bg-white p-4 text-[13px] shadow-[0_20px_50px_-20px_rgba(7,26,49,0.55)] lg:-left-44 md:block">
        <span className="chip bg-accent-soft text-accent"><Sparkles size={11} /> AI rewrite</span>
        <p className="mt-2 text-danger/80 line-through">Made the release process faster.</p>
        <p className="mt-1">Release time from <b>2 hours to 15 minutes</b>.</p>
      </div>
    </div>
  );
}

function Tile({ n, title, children, wide, wide3, accent }: { n: string; title: string; children?: React.ReactNode; wide?: boolean; wide3?: boolean; accent?: boolean }) {
  return (
    <div className={`rounded-[16px] p-6 shadow-[var(--ring)] ${wide ? "md:col-span-2" : wide3 ? "md:col-span-3" : ""} ${accent ? "bg-[#3351e5]" : "bg-surface"}`}>
      <div className={`eyebrow ${accent ? "!text-white/70" : "!text-faint"}`}>{n}</div>
      <h3 className="mt-3 text-[20px] font-medium leading-snug tracking-[-0.02em]">{title}</h3>
      {children}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { RequestForm } from "./request-form";

export const metadata: Metadata = {
  title: "Application Sprint: 50 tailored applications in 14 days",
  description: "We find the roles, tailor a one-page resume for each, draft the answers and submit. You approve every answer before anything goes out.",
};

const FOUNDING_SPOTS_LEFT = Number(process.env.SPRINT_SPOTS_LEFT ?? 5);

const STEPS: [string, string][] = [
  ["Tell us what you want", "Upload your resume and pick roles, locations and companies to avoid. A 15-minute call if you want one."],
  ["We shortlist 50 roles", "From 127 verified company boards on Greenhouse, Lever and Ashby. Roles you fit, not every posting with the right keyword."],
  ["You approve the answers", "Each application gets a one-page resume tailored from your real profile and drafted answers. You check them in one review screen."],
  ["We submit and report", "Submitted over 14 days, paced like a person applies. You see every one, with a screenshot, on your Applied page."],
];

const YES = [
  "50 applications submitted in 14 days, each with its own tailored resume",
  "Every free-text answer drafted for you and approved by you",
  "Nothing invented: skills, numbers and employers come only from your profile",
  "A live list of what went out, where, and when",
];
const NO = [
  "No spraying 800 jobs with one resume. That gets a 0.6% interview rate",
  "No logging into your LinkedIn or email accounts",
  "No promise of an offer. We control the applications, not the hiring manager",
];

const FAQ: [string, string][] = [
  ["How does the free trial work?", "We apply to 3 roles for you, exactly the way the sprint would: shortlist, tailored resume, drafted answers you approve, then submit. No card, no obligation. If you continue, those 3 count toward your 50."],
  ["What do I have to do?", "About 30 minutes in total: upload your resume, answer a few profile questions once, approve the drafted answers, and forward the occasional verification code a company emails you."],
  ["Which companies?", "Product companies that hire through Greenhouse, Lever or Ashby: Cloudflare, Databricks, Figma, OpenAI, CRED, Meesho and more than a hundred others. Tell us any you want added or avoided."],
  ["Who is it for?", "Software engineers with 0 to 5 years of experience applying in India or to remote roles. Other roles: ask first."],
  ["What if you don't submit 50?", "You get a full refund, no questions. If there are fewer than 50 good matches for what you want, we tell you in the first two days and refund the difference."],
  ["Is my data safe?", "Your profile, answers and resumes live in your own Lazy Apply account. You can delete any of it at any time. See the privacy page."],
];

export default function SprintPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-bg text-fg">
      <div className="glow pointer-events-none absolute left-1/2 top-[-10vh] h-[60vh] w-[90vw] -translate-x-1/2 opacity-70" aria-hidden />

      <div className="relative mx-auto max-w-[1160px] px-6">
        <header className="flex items-center justify-between py-5">
          <Link href="/"><Brand /></Link>
          <nav className="flex items-center gap-2"><a href="#request" className="btn-primary">Get 3 free</a></nav>
        </header>

        <section className="flex flex-col items-center pb-20 pt-16 text-center lg:pt-24">
          <span className="pill rise bg-accent-soft text-accent">Application Sprint · {FOUNDING_SPOTS_LEFT} founding spots</span>
          <h1 className="display rise mt-6 max-w-4xl text-[42px] sm:text-[58px] lg:text-[70px]">50 tailored applications in 14 days. <span className="serif-i">You just approve.</span></h1>
          <p className="rise-2 mx-auto mt-7 max-w-xl text-[18px] leading-relaxed text-muted">We find the roles, write a one-page resume for each from your real experience, draft the answers and submit. You check every answer before anything goes out.</p>
          <div className="rise-2 mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href="#request" className="btn-primary btn-lg">Get 3 applications free</a>
            <a href="#how" className="btn-ghost btn-lg">How it works</a>
          </div>
          <p className="mt-5 text-[13px] text-muted">Your first 3 applications are free, no card needed. Pay only if you like them.</p>
        </section>

        <section id="how" className="border-t border-line py-20">
          <h2 className="max-w-xl text-[30px] font-semibold leading-tight tracking-[-0.025em]">Two weeks, four steps, about 30 minutes of your time.</h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([title, body], i) => (
              <li key={title}>
                <span className="mono text-[12px] text-accent">0{i + 1}</span>
                <h3 className="mt-2 text-[15px] font-semibold">{title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-10 border-t border-line py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">What you get</h2>
            <ul className="mt-6 space-y-4">
              {YES.map((t) => <li key={t} className="flex gap-3 text-[14.5px]"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-go-soft text-go"><Check size={12} strokeWidth={3} /></span>{t}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">What we won&apos;t do</h2>
            <ul className="mt-6 space-y-4">
              {NO.map((t) => <li key={t} className="flex gap-3 text-[14.5px] text-muted"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger"><X size={12} strokeWidth={3} /></span>{t}</li>)}
            </ul>
          </div>
        </section>

        <section id="request" className="grid gap-10 border-t border-line py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.025em]">Try it first: 3 applications, free.</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-muted">Tell us what you are looking for. Within a day we pick 3 roles that fit, tailor your resume for each and draft the answers. You approve, we submit. No card needed. If you like the result, keep going with the full sprint.</p>
          </div>
          <RequestForm />
        </section>

        <section className="border-t border-line py-20">
          <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.025em]">Questions</h2>
          <dl className="divide-rows mt-8 max-w-3xl">
            {FAQ.map(([q, a]) => <div key={q} className="py-5 first:pt-0"><dt className="text-[15px] font-medium">{q}</dt><dd className="mt-1.5 text-[14px] leading-relaxed text-muted">{a}</dd></div>)}
          </dl>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-10 text-[13px] text-muted">
          <Brand />
          <span><Link className="underline underline-offset-2" href="/privacy">Privacy</Link> · <Link className="underline underline-offset-2" href="/terms">Terms</Link> · maddi.vikash@gmail.com</span>
        </footer>
      </div>
    </main>
  );
}

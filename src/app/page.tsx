import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { userId } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { StageTrack } from "@/components/status";

export default async function Landing() {
  if (await userId()) redirect("/dashboard");
  return (
    <main className="relative min-h-screen overflow-x-clip bg-bg text-fg">
      <div className="topline absolute inset-x-0 top-0" aria-hidden />
      <div className="grid-fade pointer-events-none absolute inset-x-0 top-0 h-[90vh]" aria-hidden />
      <div className="glow pointer-events-none absolute left-1/2 top-[-10vh] h-[70vh] w-[90vw] -translate-x-1/2 opacity-70" aria-hidden />

      <div className="relative mx-auto max-w-[1160px] px-6">
        <header className="flex items-center justify-between py-5">
          <Brand />
          <nav className="flex items-center gap-2"><Link href="/sign-in" className="btn-quiet">Sign in</Link><Link href="/sign-up" className="btn-primary">Create account</Link></nav>
        </header>

        <section className="flex flex-col items-center gap-14 pb-20 pt-16 text-center lg:pb-28 lg:pt-24">
          <div className="rise flex max-w-3xl flex-col items-center">
            <h1 className="display text-[46px] sm:text-[62px] lg:text-[76px]">Paste a job link.<br />Review it. Press <span className="serif-i">Submit.</span></h1>
            <p className="mx-auto mt-7 max-w-xl text-[18px] leading-relaxed text-muted">Auto Apply writes a one-page resume for the role from your own profile, answers the form with what it already knows about you, and fills it in a browser window on your machine. Nothing is sent until you say so.</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/sign-up" className="btn-primary btn-lg">Start with your resume</Link>
              <Link href="/sign-in" className="btn-ghost btn-lg">I have an account</Link>
            </div>
            <p className="mt-5 text-[13px] text-muted">Works with Greenhouse, Lever and Ashby job pages. Free while in beta.</p>
          </div>
          <ProductFrame />
        </section>

        <section className="border-t border-line py-20">
          <div className="max-w-xl">
            <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.025em]">Every application moves through the same five stages.</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-muted">The rail on every card tells you where each one is and what it is waiting on.</p>
          </div>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Read", "The posting is read from the board's own API, including every question its form asks."],
              ["Resume", "A one-page resume is written for that role. Every number is checked against your profile before it renders."],
              ["Answers", "Name, links, location, sponsorship and relocation come from your Answers page. Anything else is asked, by email and in the app."],
              ["Filled", "A small runner on your computer opens the real form, types the answers, attaches the PDF and stops with a screenshot."],
              ["Submitted", "You press Submit. The runner clicks it and confirms. That is the only way anything goes out."]
            ].map(([title, body], i) => (
              <li key={title} className="relative">
                <span className={`block h-[5px] w-full rounded-full ${i < 4 ? "bg-go" : "bg-signal shadow-[0_0_12px_var(--glow)]"}`} aria-hidden />
                <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-10 border-t border-line py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.025em]">Built so you never have to wonder what it said about you.</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-muted">Automation that applies on your behalf has to be boring about facts and strict about control.</p>
          </div>
          <ul className="divide-rows">
            {[
              ["Facts come only from your profile", "The resume writer cannot add a skill, a number or an employer that is not already in your profile. Flagged mismatches show on the review page."],
              ["Fit, not overfit", "Tailoring chooses and orders your real work for the role. It does not rewrite your experience in the posting's words, because recruiters can tell, and a resume that echoes the ad reads as one."],
              ["Known answers are filled, open questions are asked", "The form filler uses your Answers page. When a form asks something new, you get it as a question instead of a guess."],
              ["The form is filled on your machine, in view", "The runner drives a visible browser window on your own computer. You can watch it type and check the screenshot it leaves."],
              ["Submit is a button only you can press", "Approving lets the runner fill. Submitting is a second, separate step, and it is yours."],
              ["Your data stays yours", "Profile, answers, resumes and applications live in your account. Delete any of it at any time."]
            ].map(([title, body]) => (
              <li key={title} className="flex gap-4 py-5 first:pt-0 last:pb-0">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-go-soft text-go"><Check size={12} strokeWidth={3} /></span>
                <div><h3 className="text-[15px] font-medium">{title}</h3><p className="mt-1 text-[13.5px] leading-relaxed text-muted">{body}</p></div>
              </li>
            ))}
          </ul>
        </section>

        <section className="my-8 border border-line bg-surface p-8 text-center md:p-14">
          <h2 className="display text-[32px] sm:text-[40px]">Your next application, ready for review in about a minute.</h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-muted">Upload the resume you already have. It becomes your profile, and every tailored resume after that is written only from it.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/sign-up" className="btn-primary btn-lg">Create your account</Link><Link href="/sign-in" className="btn-ghost btn-lg">Sign in</Link></div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 py-10 text-[13px] text-muted"><Brand /><span>For people applying to a lot of jobs and tired of retyping their own name.</span></footer>
      </div>
    </main>
  );
}

/** A still of the review page with real-looking content, so the first thing you see is the product. */
function ProductFrame() {
  const answers: [string, string, boolean][] = [
    ["First name", "Vikash", true], ["Email", "vikash@example.com", true], ["LinkedIn", "linkedin.com/in/vikash", true],
    ["Need sponsorship for this location?", "No", true], ["Willing to relocate?", "Yes, willing to relocate", true], ["Why Cloudflare?", "", false]
  ];
  return (
    <div className="rise-2 relative">
      <div className="glow pointer-events-none absolute -inset-10 -z-10" aria-hidden />
      <div className="panel lift overflow-hidden text-[12.5px]">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0"><div className="truncate text-[13.5px] font-medium">Cloudflare, Software Engineer, Platforms</div><div className="text-muted">Bengaluru, Greenhouse</div></div>
          <span className="pill bg-signal-soft text-signal">1 question needs you</span>
        </div>
        <div className="border-b border-line px-4 py-3"><StageTrack status="ready" needsDetails /></div>
        <div className="grid gap-0 sm:grid-cols-[1.15fr_0.85fr]">
          <ul className="divide-rows border-b border-line sm:border-b-0 sm:border-r">
            {answers.map(([q, a, filled]) => (
              <li key={q} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="truncate text-muted">{q}</span>
                {filled ? <span className="mono shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11.5px] text-fg">{a}</span> : <span className="shrink-0 rounded-md bg-signal-soft px-1.5 py-0.5 text-[11.5px] text-signal">Your answer</span>}
              </li>
            ))}
          </ul>
          <div className="relative min-h-[240px] overflow-hidden bg-surface-2/60 p-4">
            <div className="flex items-center justify-between"><span className="font-medium">Tailored resume</span><span className="text-muted">1 page</span></div>
            <Image src="/sample-resume.png" alt="A one-page resume tailored by Auto Apply" width={1200} height={1553} className="absolute left-4 right-4 top-11 w-[calc(100%-2rem)] rounded-[4px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]" priority />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <span className="text-muted">Approve, and the runner fills the form on your machine.</span>
          <span className="btn-go h-8 px-3 text-[12.5px]">Approve for filling</span>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { userId } from "@/lib/auth";

export default async function Landing() {
  if (await userId()) redirect("/dashboard");
  return (
    <main className="mx-auto max-w-5xl px-6">
      <header className="flex items-center justify-between py-6">
        <span className="serif text-xl">Auto Apply</span>
        <nav className="flex gap-3 text-sm"><Link href="/sign-in" className="btn-ghost">Sign in</Link><Link href="/sign-up" className="btn-primary">Create account</Link></nav>
      </header>
      <section className="grid gap-10 py-16 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <h1 className="serif text-5xl leading-[1.05] md:text-6xl">One link in. One reviewed application out.</h1>
          <p className="mt-6 max-w-lg text-lg text-muted">Paste a Greenhouse, Lever or Ashby job. Auto Apply rewrites your resume for that role using only facts from your profile, answers the form with what it knows, and asks you for the rest. You press Submit.</p>
          <div className="mt-8 flex gap-3"><Link href="/sign-up" className="btn-primary">Start with your resume</Link><Link href="/sign-in" className="btn-ghost">I have an account</Link></div>
        </div>
        <ol className="panel divide-y divide-line text-sm">
          {["Upload your current resume once. It becomes your profile, editable any time.", "Paste a job link. The posting is read from the board's own API.", "A one-page resume is written for that role. Every number is checked against your profile.", "Known answers fill the form. Open questions come to you by email.", "The runner on your machine fills the real form and stops.", "You review the screenshot and press Submit."].map((t, i) => (
            <li key={i} className="flex gap-4 px-5 py-4"><span className="serif text-2xl leading-none text-muted">{i + 1}</span><span className="pt-1">{t}</span></li>
          ))}
        </ol>
      </section>
    </main>
  );
}

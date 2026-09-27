import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";

export const metadata: Metadata = { title: "Your sprint is booked", robots: { index: false } };

/** Where the Stripe Payment Links send people after paying. */
export default function SprintThanks() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <Link href="/"><Brand /></Link>
      <h1 className="display mt-10 text-[40px]">Your sprint is booked.</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">Two things and we can start. You will also get an email from us within a day.</p>
      <ol className="mt-8 space-y-5 text-[15px]">
        <li><span className="mono mr-2 text-accent">01</span>Create your account with the <b>same email you paid with</b>, and upload your current resume.</li>
        <li><span className="mono mr-2 text-accent">02</span>Fill in the Answers page: notice period, location, sponsorship, salary expectations. It takes about 10 minutes and is asked only once.</li>
      </ol>
      <Link href="/sign-up" className="btn-primary btn-lg mt-10 self-start">Create my account</Link>
      <p className="mt-8 text-[13px] text-faint">Questions or a change of plan: maddi.vikash@gmail.com</p>
    </main>
  );
}

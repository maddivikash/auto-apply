import Link from "next/link";
import { Brand } from "@/components/brand";
import { StageTrack } from "@/components/status";

export function AuthShell({ children, title, body }: { children: React.ReactNode; title: string; body: string }) {
  return (
    <main className="relative grid min-h-screen bg-bg text-fg lg:grid-cols-[1.1fr_1fr]">
      <section className="hero-grad navy relative m-3 hidden flex-col justify-between rounded-[20px] p-10 lg:flex">
        <Link href="/" className="w-fit"><Brand size="lg" /></Link>
        <div className="max-w-md">
          <h1 className="display text-[40px]">{title}</h1>
          <p className="mt-5 text-[15.5px] leading-relaxed text-white/75">{body}</p>
          <div className="paper mt-10 rounded-[16px] bg-white p-5 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between text-[13px]"><span className="font-medium">Cloudflare, Software Engineer</span><span className="pill bg-signal-soft text-signal">Awaiting your Submit</span></div>
            <div className="mt-4"><StageTrack status="filled" needsDetails={false} /></div>
          </div>
        </div>
        <p className="text-[13px] text-white/70">Works with Greenhouse, Lever and Ashby job pages.</p>
      </section>
      <section className="relative flex flex-col items-center justify-center p-6 ">
        <div className="mb-8 lg:hidden"><Link href="/"><Brand /></Link></div>
        {children}
      </section>
    </main>
  );
}

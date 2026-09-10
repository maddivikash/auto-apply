import Link from "next/link";
import { Brand } from "@/components/brand";
import { StageTrack } from "@/components/status";

export function AuthShell({ children, title, body }: { children: React.ReactNode; title: string; body: string }) {
  return (
    <main data-theme="dark" className="relative grid min-h-screen bg-bg text-fg lg:grid-cols-[1.1fr_1fr]">
      <div className="grid-fade pointer-events-none absolute inset-x-0 top-0 h-[70vh]" aria-hidden />
      <section className="relative hidden flex-col justify-between p-10 lg:flex">
        <Link href="/" className="w-fit"><Brand size="lg" /></Link>
        <div className="max-w-md">
          <h1 className="display text-[40px]">{title}</h1>
          <p className="mt-5 text-[15.5px] leading-relaxed text-muted">{body}</p>
          <div className="panel mt-10 p-5">
            <div className="flex items-center justify-between text-[13px]"><span className="font-medium">Cloudflare, Software Engineer</span><span className="pill bg-signal-soft text-signal">Awaiting your Submit</span></div>
            <div className="mt-4"><StageTrack status="filled" needsDetails={false} /></div>
          </div>
        </div>
        <p className="text-[13px] text-muted">Works with Greenhouse, Lever and Ashby job pages.</p>
      </section>
      <section className="relative flex flex-col items-center justify-center p-6 lg:border-l lg:border-line">
        <div className="mb-8 lg:hidden"><Link href="/"><Brand /></Link></div>
        {children}
      </section>
    </main>
  );
}

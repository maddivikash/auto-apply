import Link from "next/link";
import { Brand } from "@/components/brand";
import { StageTrack } from "@/components/status";

export function AuthShell({ children, title, body }: { children: React.ReactNode; title: string; body: string }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
      <section className="paper-grid hidden flex-col justify-between border-r border-line p-10 lg:flex">
        <Link href="/"><Brand size="lg" /></Link>
        <div className="max-w-md">
          <h1 className="serif text-4xl leading-tight tracking-tight">{title}</h1>
          <p className="mt-4 text-muted">{body}</p>
          <div className="panel mt-8 p-4"><div className="mb-3 text-sm font-medium">Every application moves through five stages</div><StageTrack status="ready" needsDetails={false} /></div>
        </div>
        <p className="text-sm text-muted">Greenhouse · Lever · Ashby</p>
      </section>
      <section className="flex flex-col items-center justify-center p-6"><div className="mb-6 lg:hidden"><Link href="/"><Brand /></Link></div>{children}</section>
    </main>
  );
}

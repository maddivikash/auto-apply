import Link from "next/link";
import { Brand } from "@/components/brand";

/** Shared shell for the public legal pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[14px] leading-relaxed">
      <Link href="/"><Brand /></Link>
      <h1 className="mt-8 text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-[12.5px] text-faint">Last updated {updated}</p>
      <div className="mt-6 space-y-6 text-muted [&_h2]:mt-8 [&_h2]:text-[16px] [&_h2]:font-semibold [&_h2]:text-fg [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_p+p]:mt-3">{children}</div>
      <p className="mt-12 text-[12.5px] text-faint"><Link className="underline underline-offset-2" href="/privacy">Privacy</Link> · <Link className="underline underline-offset-2" href="/terms">Terms</Link> · <Link className="underline underline-offset-2" href="/connect/docs">Connector docs</Link> · <a className="underline underline-offset-2" href="mailto:maddi.vikash@gmail.com">maddi.vikash@gmail.com</a></p>
    </main>
  );
}

import Link from "next/link";
import { Laptop } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { formatCode, linkForCode } from "@/lib/runner-link";
import { approveRunnerLinkAction } from "../../../actions";
import { ConnectButton } from "@/components/connect-runner";

export const dynamic = "force-dynamic";

/** Opened by `npx lazy-apply`: the signed-in user confirms the code shown in their terminal. */
export default async function RunnerLinkPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  await requireUserId();
  const { code = "" } = await searchParams;
  const found = code ? await linkForCode(code) : null;
  return (
    <div className="mx-auto max-w-md pt-6">
      <div className="panel p-7 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent"><Laptop size={22} /></span>
        {found ? (
          <>
            <h1 className="mt-5 text-[22px] font-medium tracking-[-0.02em]">Connect this computer?</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">The runner on <span className="text-fg">{found.link.device}</span> will fill approved applications in a Chrome window on that computer. It never submits without you.</p>
            <p className="mt-5 text-[12.5px] text-muted">Check this matches the code in your terminal</p>
            <div className="mono mt-1.5 text-[30px] font-medium tracking-[0.12em]">{formatCode(found.link.code)}</div>
            <ConnectButton code={found.link.code} action={approveRunnerLinkAction} />
          </>
        ) : (
          <>
            <h1 className="mt-5 text-[22px] font-medium tracking-[-0.02em]">This code has expired</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">Codes last ten minutes and work once. Run <code className="kbd">npx lazy-apply</code> in your terminal again for a fresh one.</p>
            <Link href="/runner" className="btn-ghost mt-6">Back to Runner</Link>
          </>
        )}
      </div>
    </div>
  );
}

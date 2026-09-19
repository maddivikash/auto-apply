import { requireUserId } from "@/lib/auth";
import { getSettings } from "@/lib/store";
import { rotateRunnerTokenAction } from "../../actions";
import { PageHeader } from "@/components/page-header";
import { ActionButton } from "@/components/action-button";
import { CopyField } from "@/components/copy-field";

export const dynamic = "force-dynamic";

export default async function RunnerPage() {
  const uid = await requireUserId();
  const s = await getSettings(uid);
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  return (
    <div className="space-y-8">
      <PageHeader title="Runner" description="Forms are filled by a small program on your own computer, in a browser window you can watch. It never submits on its own: it fills, saves a screenshot, and waits for your Submit in this app." />
      <section className="panel grid gap-6 p-5 md:grid-cols-[200px_1fr] md:p-6">
        <div><h2 className="text-[15px] font-semibold">Your runner token</h2><p className="mt-1 text-[12.5px] leading-relaxed text-muted">Identifies your account to the runner. Generating a new one disables the old one.</p></div>
        <div className="space-y-3">
          {s?.runnerToken ? <CopyField value={s.runnerToken} label="Runner token" /> : <p className="text-[13.5px] text-muted">No token yet.</p>}
          <ActionButton action={rotateRunnerTokenAction} id="token" pending="Generating" className="btn-ghost">{s?.runnerToken ? "Generate a new token" : "Generate token"}</ActionButton>
        </div>
      </section>
      <section className="panel grid gap-6 p-5 md:grid-cols-[200px_1fr] md:p-6">
        <div><h2 className="text-[15px] font-semibold">Set up on a Mac or Linux machine</h2><p className="mt-1 text-[12.5px] leading-relaxed text-muted">Four steps, once.</p></div>
        <ol className="divide-rows text-[13.5px]">
          <li className="flex gap-3 pb-4"><span className="mono text-faint">1</span><span>Install Node.js 20 or newer.</span></li>
          <li className="flex gap-3 py-4"><span className="mono text-faint">2</span><div className="min-w-0 flex-1">Get the runner:<pre className="mono mt-2 overflow-x-auto rounded-[var(--radius-ctl)] border border-line bg-surface-2/60 px-3 py-2.5 text-[12.5px]">git clone https://github.com/maddivikash/auto-apply{"\n"}cd auto-apply && npm install && npx playwright install chromium</pre></div></li>
          <li className="flex gap-3 py-4"><span className="mono text-faint">3</span><div className="min-w-0 flex-1">Create <code className="kbd">.env.local</code> with:<pre className="mono mt-2 overflow-x-auto rounded-[var(--radius-ctl)] border border-line bg-surface-2/60 px-3 py-2.5 text-[12.5px]">APP_URL={appUrl}{"\n"}RUNNER_TOKEN={s?.runnerToken || "<your token>"}</pre></div></li>
          <li className="flex gap-3 pt-4"><span className="mono text-faint">4</span><span>Start it with <code className="kbd">npm run runner</code> and leave the window open while you have approved applications.</span></li>
        </ol>
      </section>
    </div>
  );
}

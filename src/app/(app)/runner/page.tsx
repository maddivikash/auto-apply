import { CheckCircle2, CircleDashed } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getSettings } from "@/lib/store";
import { runnerSeen } from "@/lib/runner-link";
import { rotateRunnerTokenAction } from "../../actions";
import { PageHeader } from "@/components/page-header";
import { ActionButton } from "@/components/action-button";
import { CopyField } from "@/components/copy-field";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";

const ago = (ms: number) => { const s = Math.round(ms / 1000); return s < 90 ? "just now" : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`; };
const where = (client: string) => { const os = /darwin/.test(client) ? "macOS" : /win32/.test(client) ? "Windows" : /linux/.test(client) ? "Linux" : ""; return /cli/.test(client) ? `the lazy-apply CLI${os ? ` on ${os}` : ""}` : "a runner started from the repository"; };

/** Connection state from the runner's last heartbeat, worked out once per request. */
async function connection(uid: string) {
  const seen = await runnerSeen(uid);
  const age = seen ? Date.now() - seen.at : Infinity;
  // The runner polls every few seconds and reports in at most once a minute, so three minutes of silence means it stopped.
  const online = age < 3 * 60_000;
  const title = online ? "Connected" : seen ? "Not running right now" : "Not connected yet";
  const detail = online
    ? `Last seen ${ago(age)}, from ${where(seen!.client)}. Approved applications are filled automatically.`
    : seen ? `Last seen ${ago(age)}. Start it again with the command below, or turn on automatic start so this never happens.`
      : "Run the command below once. This page updates on its own when it connects.";
  return { online, title, detail };
}

export default async function RunnerPage() {
  const uid = await requireUserId();
  const [s, { online, title, detail }] = await Promise.all([getSettings(uid), connection(uid)]);
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  return (
    <div className="space-y-6">
      <AutoRefresh seconds={online ? 60 : 10} />
      <PageHeader title="Runner" description="Forms are filled by a small program on your own computer, in a Chrome window you can watch. It never submits on its own: it fills, saves a screenshot, and waits for your Submit in this app." />

      <section className="panel flex items-center gap-4 p-5 md:px-6">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${online ? "bg-go-soft text-go" : "bg-surface-2 text-faint"}`}>{online ? <CheckCircle2 size={20} /> : <CircleDashed size={20} />}</span>
        <div className="min-w-0">
          <div className="text-[15px] font-medium">{title}</div>
          <p className="mt-0.5 text-[13px] text-muted">{detail}</p>
        </div>
      </section>

      <section className="panel grid gap-6 p-5 md:grid-cols-[200px_1fr] md:p-6">
        <div><h2 className="text-[15px] font-semibold">Set up in one step</h2><p className="mt-1 text-[12.5px] leading-relaxed text-muted">Needs Node.js 18 or newer and Google Chrome. Works on macOS, Windows and Linux.</p></div>
        <div className="space-y-4">
          <div><p className="mb-2 text-[13.5px]">Open Terminal and run:</p><CopyField value="npx lazy-apply" label="Command" /></div>
          <ol className="space-y-2.5 text-[13.5px] text-muted">
            <li className="flex gap-3"><span className="mono text-faint">1</span><span>Your browser opens on Lazy Apply. Check the code matches your terminal and press <span className="text-fg">Connect this computer</span>. No token to copy.</span></li>
            <li className="flex gap-3"><span className="mono text-faint">2</span><span>Answer <span className="text-fg">yes</span> to starting automatically. From then on it runs in the background whenever you log in, and updates itself.</span></li>
            <li className="flex gap-3"><span className="mono text-faint">3</span><span>That is all. Approve an application here and watch the form fill in Chrome.</span></li>
          </ol>
          <p className="text-[12.5px] text-muted">Later: <code className="kbd">npx lazy-apply status</code> shows what it is doing, and <code className="kbd">npx lazy-apply autostart off</code> stops the automatic start.</p>
        </div>
      </section>

      <details className="panel group">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[13.5px] md:px-6"><span className="font-medium">Advanced: manual setup with a token</span><span className="text-[12.5px] text-muted group-open:hidden">Show</span><span className="hidden text-[12.5px] text-muted group-open:inline">Hide</span></summary>
        <div className="grid gap-6 border-t border-line p-5 md:grid-cols-[200px_1fr] md:p-6">
          <div><h2 className="text-[14px] font-semibold">Runner token</h2><p className="mt-1 text-[12.5px] leading-relaxed text-muted">Only for running from the repository. Generating a new one disconnects every runner using the old one.</p></div>
          <div className="space-y-3 text-[13px]">
            {s?.runnerToken ? <CopyField value={s.runnerToken} label="Runner token" /> : <p className="text-muted">No token yet.</p>}
            <ActionButton action={rotateRunnerTokenAction} id="token" pending="Generating" className="btn-ghost">{s?.runnerToken ? "Generate a new token" : "Generate token"}</ActionButton>
            <pre className="mono overflow-x-auto rounded-[var(--radius-ctl)] border border-line bg-surface-2/60 px-3 py-2.5 text-[12px]">git clone https://github.com/maddivikash/auto-apply{"\n"}cd auto-apply && npm install{"\n"}printf &quot;APP_URL={appUrl}\nRUNNER_TOKEN={s?.runnerToken || "<your token>"}\n&quot; &gt; .env.local{"\n"}npm run runner</pre>
          </div>
        </div>
      </details>
    </div>
  );
}

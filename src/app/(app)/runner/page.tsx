import { requireUserId } from "@/lib/auth";
import { getSettings } from "@/lib/store";
import { rotateRunnerTokenAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function RunnerPage() {
  const uid = await requireUserId();
  const s = await getSettings(uid);
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  return (
    <div className="space-y-8">
      <div><h1 className="serif text-4xl">Runner</h1><p className="mt-2 max-w-2xl text-sm text-muted">Forms are filled by a small program on your own computer, in a browser window you can watch. It never submits on its own: it fills, sends you a screenshot, and waits for your Submit in this app.</p></div>
      <section className="panel space-y-4 p-5">
        <h2 className="font-medium">Your runner token</h2>
        {s?.runnerToken ? <code className="block break-all rounded-md bg-tint px-3 py-2 text-sm">{s.runnerToken}</code> : <p className="text-sm text-muted">No token yet.</p>}
        <form action={rotateRunnerTokenAction}><button className="btn-ghost">{s?.runnerToken ? "Generate a new token" : "Generate token"}</button></form>
        <p className="text-xs text-muted">The token identifies your account to the runner. Generating a new one disables the old one.</p>
      </section>
      <section className="panel space-y-3 p-5 text-sm">
        <h2 className="font-medium">Set up on a Mac or Linux machine</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Install Node.js 20 or newer.</li>
          <li>Get the runner: <code className="rounded bg-tint px-1">git clone https://github.com/maddivikash/auto-apply && cd auto-apply && npm install && npx playwright install chromium</code></li>
          <li>Create <code className="rounded bg-tint px-1">.env.local</code> with:<pre className="mt-1 rounded-md bg-tint px-3 py-2 text-xs">APP_URL={appUrl}{"\n"}RUNNER_TOKEN={s?.runnerToken || "<your token>"}</pre></li>
          <li>Start it: <code className="rounded bg-tint px-1">npm run runner</code>. Leave the window open while you have approved applications.</li>
        </ol>
      </section>
    </div>
  );
}

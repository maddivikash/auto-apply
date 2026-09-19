import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { getSettings } from "@/lib/store";
import { rotateApiKeyAction, revokeApiKeyAction } from "../../actions";
import { PageHeader } from "@/components/page-header";
import { ActionButton } from "@/components/action-button";
import { CopyField } from "@/components/copy-field";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const uid = await requireUserId();
  const s = await getSettings(uid);
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return (
    <div className="space-y-8">
      <PageHeader title="Connect" description="Let your AI agent apply for you. Muse, Claude, ChatGPT or anything that speaks MCP can prepare applications, ask you the open questions, fill the form in its own browser and tell this app when it submitted." />
      <section className="panel grid gap-6 p-5 md:grid-cols-[200px_1fr] md:p-6">
        <div><h2 className="text-[15px] font-semibold">MCP server</h2><p className="mt-1 text-[12.5px] leading-relaxed text-muted">Add this URL in your agent. It signs you in with your account here; no key to paste.</p></div>
        <div className="space-y-3">
          <CopyField value={`${appUrl}/mcp`} label="MCP URL" />
          <p className="text-[13px] text-muted">In Muse: Settings, Connectors, Custom connector, then paste the URL. In Claude: Settings, Connectors, Add custom connector. The first call opens a sign-in page for this app.</p>
        </div>
      </section>
      <section className="panel grid gap-6 p-5 md:grid-cols-[200px_1fr] md:p-6">
        <div><h2 className="text-[15px] font-semibold">REST API key</h2><p className="mt-1 text-[12.5px] leading-relaxed text-muted">For connectors and scripts that want a plain HTTP API instead of MCP. Send it as <code className="kbd">Authorization: Bearer</code>.</p></div>
        <div className="space-y-3">
          {s?.apiKey ? <CopyField value={s.apiKey} label="API key" /> : <p className="text-[13.5px] text-muted">No key yet.</p>}
          <div className="flex flex-wrap gap-2">
            <ActionButton action={rotateApiKeyAction} id="key" pending="Generating" className="btn-ghost">{s?.apiKey ? "Generate a new key" : "Generate key"}</ActionButton>
            {s?.apiKey && <ActionButton action={revokeApiKeyAction} id="revoke" pending="Revoking" className="btn-ghost">Revoke</ActionButton>}
          </div>
          <CopyField value={`${appUrl}/openapi.json`} label="OpenAPI spec URL" />
          <p className="text-[13px] text-muted">Base URL <code className="kbd">{appUrl}/api/v1</code>. Human-readable docs at <Link href="/connect/docs" className="underline underline-offset-2">/connect/docs</Link>.</p>
        </div>
      </section>
      <section className="panel grid gap-6 p-5 md:grid-cols-[200px_1fr] md:p-6">
        <div><h2 className="text-[15px] font-semibold">What the agent can do</h2><p className="mt-1 text-[12.5px] leading-relaxed text-muted">Every action is on your account only, and nothing is submitted without a person deciding.</p></div>
        <ul className="divide-rows text-[13.5px]">
          <li className="flex gap-3 pb-3"><span className="mono text-faint">1</span><span>Prepare an application from a job link: tailored one-page resume, PDF, and the form&apos;s questions answered from your profile.</span></li>
          <li className="flex gap-3 py-3"><span className="mono text-faint">2</span><span>Ask you the questions your profile cannot answer, and save your replies.</span></li>
          <li className="flex gap-3 py-3"><span className="mono text-faint">3</span><span>Fill and submit the form in its own browser using the answers and the PDF, then mark it submitted here. Or hand off to your desktop runner.</span></li>
          <li className="flex gap-3 pt-3"><span className="mono text-faint">4</span><span>Read and update your profile and standing answers. It cannot see your key or runner token, and it cannot read other accounts.</span></li>
        </ul>
      </section>
    </div>
  );
}

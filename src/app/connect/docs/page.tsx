import Link from "next/link";
import { Brand } from "@/components/brand";

export const dynamic = "force-dynamic";

const TOOLS: [string, string][] = [
  ["prepare_application(url)", "Start preparing an application from a Greenhouse, Lever or Ashby posting. Returns an id; poll get_application."],
  ["get_application(id)", "Status, job, PDF link, questions with answers, and what to do next."],
  ["list_applications(status?)", "All applications, newest first."],
  ["answer_questions(id, answers)", "Save the user's answers to open form questions."],
  ["get_form_answers(id)", "Apply URL, contact fields, every field's value, PDF link and filling instructions."],
  ["mark_submitted(id, note?)", "Record that the form was submitted."],
  ["approve_application(id)", "Hand off to the user's desktop runner instead."],
  ["regenerate_resume(id, notes?)", "Rewrite the resume with notes."],
  ["delete_application(id)", "Remove an application."],
  ["get_profile / update_profile / import_resume", "Read, replace, or build the master profile from resume text."],
  ["get_known_answers / update_known_answers", "Standing form answers: work authorization, relocation, notice period, salary, links."]
];

/** Public, human-readable page for connector reviewers and developers. */
export default function ConnectorDocs() {
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[14px] leading-relaxed">
      <Link href="/"><Brand /></Link>
      <h1 className="mt-8 text-2xl font-semibold">Auto Apply connector</h1>
      <p className="mt-3 text-muted">Auto Apply turns a job posting link into a one-page resume tailored from the user&apos;s own profile, plus the answers to the application form&apos;s questions. The agent brings the browser; this service brings the resume and the answers. Nothing is invented: every number and claim is checked against the user&apos;s profile before the PDF is rendered.</p>

      <h2 className="mt-10 text-lg font-semibold">Endpoints</h2>
      <table className="mt-3 w-full text-left text-[13.5px]"><tbody className="divide-rows">
        <tr><td className="py-2 pr-4 font-medium">MCP server</td><td className="mono py-2">{appUrl}/mcp</td></tr>
        <tr><td className="py-2 pr-4 font-medium">OAuth metadata</td><td className="mono py-2">{appUrl}/.well-known/oauth-protected-resource/mcp</td></tr>
        <tr><td className="py-2 pr-4 font-medium">REST base URL</td><td className="mono py-2">{appUrl}/api/v1</td></tr>
        <tr><td className="py-2 pr-4 font-medium">OpenAPI 3.1</td><td className="mono py-2"><a className="underline underline-offset-2" href="/openapi.json">{appUrl}/openapi.json</a></td></tr>
      </tbody></table>

      <h2 className="mt-10 text-lg font-semibold">Authentication</h2>
      <p className="mt-2 text-muted">MCP clients use OAuth 2.1 with PKCE; the authorization server is discovered from the metadata URL above and the user signs in with their Auto Apply account. The REST API also accepts a personal API key as a bearer token, generated on the Connect page inside the app. Tokens and keys are scoped to one account. Users can revoke a key or disconnect an OAuth client at any time.</p>

      <h2 className="mt-10 text-lg font-semibold">The flow an agent follows</h2>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted">
        <li>The user shares a job link. Call <code className="kbd">prepare_application</code>.</li>
        <li>Poll <code className="kbd">get_application</code> until <code className="kbd">status</code> is <code className="kbd">ready</code>. Show the user the headline, fit notes and the PDF link.</li>
        <li>Ask the user every question where <code className="kbd">needsHuman</code> is true. Save replies with <code className="kbd">answer_questions</code>.</li>
        <li>Call <code className="kbd">get_form_answers</code>. Open the apply URL, fill the fields, upload the PDF, submit.</li>
        <li>Call <code className="kbd">mark_submitted</code>.</li>
      </ol>

      <h2 className="mt-10 text-lg font-semibold">Tools</h2>
      <table className="mt-3 w-full text-left text-[13.5px]"><tbody className="divide-rows">
        {TOOLS.map(([n, d]) => <tr key={n}><td className="mono py-2 pr-4 align-top whitespace-nowrap">{n}</td><td className="py-2 text-muted">{d}</td></tr>)}
      </tbody></table>

      <h2 className="mt-10 text-lg font-semibold">Data and safety</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
        <li>Reads and writes only the signed-in user&apos;s profile, standing answers and applications.</li>
        <li>Job postings are read from the boards&apos; public APIs (Greenhouse, Lever, Ashby). No scraping of logged-in pages.</li>
        <li>The resume writer may only use facts from the profile; figures not in the profile are rejected before rendering.</li>
        <li>The service never submits a form itself. Submission happens in the agent&apos;s browser or the user&apos;s own runner, after a person decides.</li>
        <li>PDF links are signed and expire after 24 hours.</li>
      </ul>
      <p className="mt-10 text-[12.5px] text-faint"><Link className="underline underline-offset-2" href="/privacy">Privacy policy</Link> · <Link className="underline underline-offset-2" href="/terms">Terms of service</Link></p>
      <p className="mt-2 text-[12.5px] text-faint">Questions: <a className="underline underline-offset-2" href="mailto:maddi.vikash@gmail.com">maddi.vikash@gmail.com</a></p>
    </main>
  );
}

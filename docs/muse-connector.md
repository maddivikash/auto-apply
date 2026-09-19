# Auto Apply as a Muse connector

Meta opened the Muse Connector Platform to developers on 18 Sep 2026 (muse.ai/platform). The
page asks for a product description and promises a review for functional, security and legal
requirements; it publishes no SDK, spec, fee or revenue share yet. Meta's help center already lets
any Muse user ask Muse to build a *custom connector* to a service with a documented API, so the
surfaces below are usable today without waiting for the directory.

## What we expose

| Surface | URL | Auth |
| --- | --- | --- |
| MCP server (Streamable HTTP) | `https://auto-apply-app.vercel.app/mcp` | OAuth 2.1 + PKCE via Clerk, discovered from `/.well-known/oauth-protected-resource/mcp` |
| REST API | `https://auto-apply-app.vercel.app/api/v1` | `Authorization: Bearer <personal API key>` (Connect page) or a Clerk OAuth access token |
| OpenAPI 3.1 | `https://auto-apply-app.vercel.app/openapi.json` | public |
| Human docs | `https://auto-apply-app.vercel.app/connect/docs` | public |

The split: **we bring the API, the agent brings the browser.** The connector returns a tailored
resume PDF and every form answer; Muse fills and submits the form itself, then calls
`mark_submitted`. The desktop runner stays as the alternative path (`approve_application`).

## One-time setup before anyone can connect

1. **Clerk Dashboard → OAuth applications → Settings → Client onboarding**: enable
   *Publish DCR support* (Dynamic Client Registration) so MCP clients can register themselves.
   Set *Default scopes for dynamic clients* to `openid profile email`. Do this on the **production**
   Clerk instance (the one whose keys are on Vercel).
2. **Vercel env**: `APP_SECRET` (already set) signs the 24-hour PDF links. `APP_URL` must be the
   public origin (already `https://auto-apply-app.vercel.app`).
3. Test from Claude (Settings → Connectors → Add custom connector → paste the MCP URL) or with the
   MCP Inspector: `npx @modelcontextprotocol/inspector` and enter the URL. The first call opens the
   Clerk sign-in page.

## Submission text for muse.ai/platform

**Connector name:** Auto Apply

**One line:** Turn a job link into a tailored one-page resume and a fully answered application form, ready for Muse to submit.

**What it does (description field):**

> Auto Apply prepares job applications from a Greenhouse, Lever or Ashby posting link. When a
> user shares a link, the connector reads the posting through the board's public API, writes a
> one-page resume tailored to that role from the user's own master profile (every number and claim
> is checked against the profile before the PDF is rendered, so nothing is invented), and works out
> the answers to the form's questions from the user's standing answers. Questions it cannot answer
> come back to the user as explicit open questions; Muse asks, the user answers, the connector saves
> them. Muse then receives the apply URL, the contact fields, every form field with its value, and
> a signed 24-hour link to the resume PDF, fills the form in its browser, and records the submission.
>
> How users use it: "Apply to this job for me" with a link; "What's the status of my Cloudflare
> application?"; "Rewrite the resume to lead with my payments work"; "Set my notice period to 30
> days for every application." Users can also build their profile by pasting their resume text.

**Auth:** OAuth 2.1 with PKCE (Clerk). Users sign in with their Auto Apply account; tokens are
scoped to one account and can be revoked from the app.

**Data handled:** the user's own profile (work history, education, skills), their standing
form answers (contact details, work authorization, relocation, salary expectation), the job
postings they submit, and the generated resumes. Nothing is shared with third parties; job boards
are read through their public job APIs. No form is ever submitted by the service itself.

**Actions requiring user approval:** answering form questions (the connector refuses to guess),
submitting the form (done by Muse in the browser after the user confirms), deleting an application.
Read-only tools: get/list applications, get profile, get known answers, get form answers.

**Payments:** free during the beta. Stripe Link per-application pricing can be added later.

**Contact:** maddi.vikash@gmail.com

## Where this could go

- Proactive pushes (the help center says connectors can push to Muse): "3 new postings match your profile" from a saved search.
- Per-application pricing through Stripe Link once Meta publishes terms.
- The same MCP URL works in Claude, ChatGPT and Cursor today, so the connector is not Muse-only.

## Testing notes

- Local: `DEV_FAKE_USER=preview-user TURSO_DATABASE_URL= TURSO_AUTH_TOKEN= BLOB_READ_WRITE_TOKEN= APP_URL=http://localhost:3000 npm run dev`
  makes both `/mcp` and `/api/v1` act as the preview user against `.data/`, no OAuth needed.
- Verified on 19 Sep 2026: MCP initialize, tools/list (14 tools), prepare → ready in about 25 s,
  answer_questions by id and label, get_form_answers, signed PDF fetch without a token, forged
  signature rejected, mark_submitted, regenerate, delete; REST 401 without a key, 200 with a key;
  MCP 401 with a correct `WWW-Authenticate` challenge when no token is sent.
- Muse itself is US-only at launch, so end-to-end testing inside Muse needs a US account.

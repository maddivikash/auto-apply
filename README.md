# Auto Apply

Paste a Greenhouse, Lever or Ashby job link. The app reads the posting, writes a one-page resume tailored to it from a fixed master profile, emails you the PDF with the questions it cannot answer, and a local runner fills the form. Nothing is submitted until you press Submit.

## Flow

1. Paste the link at the web app. Unsupported links get a "not possible" email.
2. Resume is tailored with Workers AI (gpt-oss-120b writes, every number is checked against the master profile), rendered with Chromium, stored on Vercel Blob.
3. You get an email: PDF attached, open questions listed, link to the review page.
4. Answer the questions, press **Approve for filling**.
5. The runner on your Mac opens the real form in a visible Chromium window, fills it, attaches the PDF, screenshots it and reports "filled". The tab stays open.
6. You press **Submit application** in the app. The runner clicks submit and confirms.

## Run

Web app is deployed on Vercel. For the runner:

```bash
cd ~/Projects/auto-apply
npm run runner        # reads APP_URL and RUNNER_TOKEN from .env.local
```

Generate a resume from the terminal without the app:

```bash
npx tsx scripts/generate.ts <job-url> --out samples
```

## Connect an agent (Muse, Claude, ChatGPT)

Any MCP client can drive the whole flow on a user's account: `https://<app>/mcp`, secured with
Clerk OAuth 2.1. A REST mirror lives at `/api/v1` (`/openapi.json`) for connectors that want plain
HTTP with a personal API key from the app's Connect page. The agent brings the browser; the API
returns the tailored PDF and every form answer, and the agent reports back with `mark_submitted`.
Setup and the Muse submission text: [docs/muse-connector.md](docs/muse-connector.md).

## Testing without your real identity

A fictional applicant lives in `scripts/seed-test-user.mts`, and the test runner never presses Submit,
so no fake application ever reaches an employer:

```bash
npm run seed:test     # writes the test profile, answers and runner token into .data/
npm run dev:test      # the app as the test user, local files only, no email
npm run runner:test   # fills real forms in your Chrome, stops before Submit, screenshots
```

Paste any Greenhouse, Lever or Ashby link at http://localhost:3000, approve it, and watch the runner
fill it. The production runner and the test runner can run side by side.

## Layout

```
src/lib/profile/master.ts   master profile, the only source of facts
src/lib/jobs/fetch.ts       Greenhouse, Lever, Ashby public APIs
src/lib/resume/             schema, tailoring prompt and validation, HTML/PDF renderer with fit-to-page
src/lib/defaults.ts         known answers and label rules for form questions
src/lib/apply/pipeline.ts   link -> job -> resume -> PDF -> email
src/lib/store.ts            JSON documents and files on Vercel Blob (local .data/ fallback)
src/app/                    login, list, review page, runner API
src/app/mcp/                MCP server (Clerk OAuth); src/app/api/v1/ REST mirror; src/lib/api/ shared connector logic
scripts/runner.ts           local Playwright runner
```

## Env

`CF_ACCOUNT_ID`, `CF_API_TOKEN` (Workers AI), `RESEND_API_KEY`, `EMAIL_TO`, `APP_URL`, `APP_PASSWORD`, `APP_SECRET`, `RUNNER_TOKEN`, `BLOB_READ_WRITE_TOKEN` (added by the Blob store).

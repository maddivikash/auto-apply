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

## Layout

```
src/lib/profile/master.ts   master profile, the only source of facts
src/lib/jobs/fetch.ts       Greenhouse, Lever, Ashby public APIs
src/lib/resume/             schema, tailoring prompt and validation, HTML/PDF renderer with fit-to-page
src/lib/defaults.ts         known answers and label rules for form questions
src/lib/apply/pipeline.ts   link -> job -> resume -> PDF -> email
src/lib/store.ts            JSON documents and files on Vercel Blob (local .data/ fallback)
src/app/                    login, list, review page, runner API
scripts/runner.ts           local Playwright runner
```

## Env

`CF_ACCOUNT_ID`, `CF_API_TOKEN` (Workers AI), `RESEND_API_KEY`, `EMAIL_TO`, `APP_URL`, `APP_PASSWORD`, `APP_SECRET`, `RUNNER_TOKEN`, `BLOB_READ_WRITE_TOKEN` (added by the Blob store).

/**
 * MCP server (Streamable HTTP) at /mcp, secured with Clerk OAuth 2.1. Any MCP client, Muse
 * included, discovers the authorization server through /.well-known/oauth-protected-resource/mcp,
 * signs the user in, and then calls the tools below on that user's account.
 */
import { z } from "zod";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { auth } from "@clerk/nextjs/server";
import * as c from "@/lib/api/connector";
import { ApiError } from "@/lib/api/auth";

export const maxDuration = 300;

/** The SDK exposes the verified token under ctx.http.authInfo (older versions: ctx.authInfo). */
type Extra = { authInfo?: { extra?: Record<string, unknown> }; http?: { authInfo?: { extra?: Record<string, unknown> } } };
const uid = (extra: unknown) => {
  const e = extra as Extra;
  const id = e.http?.authInfo?.extra?.userId ?? e.authInfo?.extra?.userId;
  if (typeof id !== "string") throw new Error("No user on this token.");
  return id;
};
const text = (v: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(v, null, 2) }] });
const run = async (fn: () => Promise<unknown>) => {
  try { return text(await fn()); }
  catch (e) { return { isError: true, content: [{ type: "text" as const, text: e instanceof ApiError ? `${e.status}: ${e.message}` : e instanceof Error ? e.message : String(e) }] }; }
};

const handler = createMcpHandler((server) => {
  server.registerTool("prepare_application", {
    title: "Prepare an application",
    description: "Start preparing a job application from a Greenhouse, Lever or Ashby posting link: reads the posting, renders two one-page PDFs (the user's original resume as-is, and one tailored to the posting from the profile with nothing invented; tailoring selects and orders real work and deliberately does not rewrite it in the posting's words, because recruiters notice), scores both against the posting, attaches the one the user's resumeDefault preference asks for (best score, original, or tailored), and works out the answers to the form's questions. Returns immediately with an id; poll get_application until status is 'ready' (one to two minutes).",
    inputSchema: z.object({ url: z.string().url().describe("The job posting link") }),
    annotations: { readOnlyHint: false, idempotentHint: false }
  }, async ({ url }, extra) => run(() => c.createApplication(uid(extra), url)));

  server.registerTool("get_application", {
    title: "Get an application",
    description: "Status, job details, tailored resume PDF link, form questions with their answers, and what to do next for one application.",
    inputSchema: z.object({ id: z.string(), includeResume: z.boolean().optional().describe("Also return the tailored resume content as structured JSON") }),
    annotations: { readOnlyHint: true }
  }, async ({ id, includeResume }, extra) => run(() => c.getApplicationSummary(uid(extra), id, { resume: includeResume })));

  server.registerTool("list_applications", {
    title: "List applications",
    description: "All of the user's applications, newest first, optionally filtered by status.",
    inputSchema: z.object({ status: z.enum(c.STATUSES as [string, ...string[]]).optional() }),
    annotations: { readOnlyHint: true }
  }, async ({ status }, extra) => run(() => c.listApplicationSummaries(uid(extra), status as never)));

  server.registerTool("answer_questions", {
    title: "Answer form questions",
    description: "Save the user's answers to application form questions that the profile could not answer (those with needsHuman true). Keys are question ids or labels; values are the answers. Ask the user first; never guess.",
    inputSchema: z.object({ id: z.string(), answers: z.record(z.string(), z.string()) })
  }, async ({ id, answers }, extra) => run(() => c.answerQuestions(uid(extra), id, answers)));

  server.registerTool("accept_drafts", {
    title: "Accept the AI-drafted answers",
    description: "Confirm every answer that was drafted from the user's profile (questions with source 'ai' and needsHuman true) as it stands. Read the drafts to the user first; to change one, use answer_questions instead.",
    inputSchema: z.object({ id: z.string() })
  }, async ({ id }, extra) => run(() => c.acceptDrafts(uid(extra), id)));

  server.registerTool("redraft_answer", {
    title: "Rewrite one answer from the profile",
    description: "Write or rewrite the answer to one free-text question from the user's profile and the posting, optionally following the user's instructions (e.g. 'shorter', 'mention the MCP project'). The result is a draft the user must confirm (accept_drafts or answer_questions).",
    inputSchema: z.object({ id: z.string(), questionId: z.string().describe("Question id or its exact label"), notes: z.string().optional() })
  }, async ({ id, questionId, notes }, extra) => run(() => c.redraftAnswer(uid(extra), id, questionId, notes)));

  server.registerTool("get_form_answers", {
    title: "Get everything needed to fill the form",
    description: "For a ready application: the apply URL, contact details, every form field with its value, and a 24-hour link to the resume PDF, plus filling instructions. Use this when you will fill and submit the form yourself in a browser. Refuses while questions are still unanswered unless allowOpen is true.",
    inputSchema: z.object({ id: z.string(), allowOpen: z.boolean().optional() }),
    annotations: { readOnlyHint: true }
  }, async ({ id, allowOpen }, extra) => run(() => c.formAnswers(uid(extra), id, !!allowOpen)));

  server.registerTool("mark_submitted", {
    title: "Mark as submitted",
    description: "Record that the application form was submitted (by you or the user). Call this after you submit a form you filled from get_form_answers.",
    inputSchema: z.object({ id: z.string(), note: z.string().optional() })
  }, async ({ id, note }, extra) => run(() => c.markSubmitted(uid(extra), id, note)));

  server.registerTool("approve_application", {
    title: "Approve for the desktop runner",
    description: "Alternative to filling the form yourself: approve a ready application so the user's own desktop runner fills the form in a visible browser and waits for the user's Submit. Only works when every question is answered and the user runs the runner.",
    inputSchema: z.object({ id: z.string() })
  }, async ({ id }, extra) => run(() => c.approve(uid(extra), id)));

  server.registerTool("regenerate_resume", {
    title: "Rewrite the resume",
    description: "Prepare the application again, optionally with notes on what to change in the resume (for example 'lead with the payments project' or 'shorter summary'). Poll get_application afterwards.",
    inputSchema: z.object({ id: z.string(), notes: z.string().optional() })
  }, async ({ id, notes }, extra) => run(() => c.regenerate(uid(extra), id, notes)));

  server.registerTool("delete_application", {
    title: "Delete an application",
    description: "Remove an application and its tailored resume from the user's account.",
    inputSchema: z.object({ id: z.string() }),
    annotations: { destructiveHint: true }
  }, async ({ id }, extra) => run(() => c.removeApplication(uid(extra), id)));

  server.registerTool("search_jobs", {
    title: "Search open roles",
    description: "Search open roles across the companies known to hire through Greenhouse, Lever or Ashby (127 verified boards plus any the user added). Query words match the job title; location accepts city, country, 'India' or 'Remote'. Results carry the posting URL that prepare_application accepts.",
    inputSchema: z.object({ query: z.string().describe("Title words, e.g. 'AI agents full stack platform'"), location: z.string().optional().describe("e.g. 'Bengaluru', 'India, Remote'"), limit: z.number().int().min(1).max(100).optional(), boards: z.array(z.enum(["greenhouse", "lever", "ashby"])).optional() }),
    annotations: { readOnlyHint: true }
  }, async ({ query, location, limit, boards }, extra) => run(() => c.findJobs(uid(extra), { query, location, limit, boards })));

  server.registerTool("list_companies", {
    title: "Companies with a supported job board",
    description: "Every company the user can apply to through this service, with its board (greenhouse, lever, ashby) and careers URL. Optionally filter by board.",
    inputSchema: z.object({ board: z.enum(["greenhouse", "lever", "ashby"]).optional() }),
    annotations: { readOnlyHint: true }
  }, async ({ board }, extra) => run(() => c.listCompanies(uid(extra), board)));

  server.registerTool("add_company", {
    title: "Add a company by careers URL",
    description: "Add a company to the user's searchable list from its Greenhouse, Lever or Ashby careers URL (e.g. https://jobs.ashbyhq.com/acme). Use when the user names a company that is not in list_companies.",
    inputSchema: z.object({ careersUrl: z.string() })
  }, async ({ careersUrl }, extra) => run(() => c.addCompany(uid(extra), careersUrl)));

  server.registerTool("get_profile", {
    title: "Get the master profile",
    description: "The user's master profile: the only facts the resume writer may use (roles with bullet banks, projects, education, skills, achievements).",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true }
  }, async (_args, extra) => run(() => c.readProfile(uid(extra))));

  server.registerTool("update_profile", {
    title: "Replace the master profile",
    description: "Replace the whole master profile with a JSON object in the profile schema (see get_profile for the shape). Prefer import_resume for a first profile.",
    inputSchema: z.object({ profile: z.record(z.string(), z.unknown()) })
  }, async ({ profile }, extra) => run(() => c.writeProfile(uid(extra), profile)));

  server.registerTool("import_resume", {
    title: "Import a resume from text",
    description: "Build the master profile from the plain text of the user's resume (paste the full text). mode 'merge' (default) adds to the existing profile; 'replace' starts over.",
    inputSchema: z.object({ text: z.string().min(200), mode: z.enum(["merge", "replace"]).optional() })
  }, async ({ text: t, mode }, extra) => run(() => c.importResumeText(uid(extra), t, mode)));

  server.registerTool("get_known_answers", {
    title: "Get known form answers",
    description: "Contact details and standing answers (work authorization, sponsorship, relocation, notice period, salary expectation, how they heard) the form filler uses for every application, plus resumeDefault: which resume version is attached by default ('best' = higher score, 'original', or 'tailored').",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true }
  }, async (_args, extra) => run(() => c.readKnownAnswers(uid(extra))));

  server.registerTool("update_known_answers", {
    title: "Update known form answers",
    description: "Change one or more standing answers. Keys as returned by get_known_answers; values are strings (Yes/No for the yes-no fields; resumeDefault is 'best', 'original' or 'tailored').",
    inputSchema: z.object({ answers: z.record(z.string(), z.string()) })
  }, async ({ answers }, extra) => run(() => c.updateKnownAnswers(uid(extra), answers)));
}, { serverInfo: { name: "auto-apply", version: "1.0.0" } });

// Local design previews only: never set on Vercel.
const previewUser = () => (process.env.NODE_ENV !== "production" ? process.env.DEV_FAKE_USER || null : null);

const authHandler = withMcpAuth(handler, async (_req, token) => {
  const fake = previewUser();
  if (fake) return { token: token || "dev", clientId: "dev", scopes: [], extra: { userId: fake } };
  const clerkAuth = await auth({ acceptsToken: "oauth_token" });
  return verifyClerkToken(clerkAuth, token);
}, { required: true, resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp" });

export { authHandler as GET, authHandler as POST, authHandler as DELETE };

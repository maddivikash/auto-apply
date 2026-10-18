/* eslint-disable @typescript-eslint/no-explicit-any -- board APIs return untyped JSON */
/**
 * Job posting fetchers for the three supported boards. All three expose a public
 * JSON API, so we never scrape HTML and we get the application questions as data.
 */

export type Board = "greenhouse" | "lever" | "ashby";

export type JobQuestion = {
  id: string;
  label: string;
  required: boolean;
  type: "text" | "textarea" | "select" | "multiselect" | "file" | "checkbox" | "unknown";
  options?: string[];
};

export type JobPosting = {
  board: Board;
  company: string;
  jobId: string;
  title: string;
  location: string;
  url: string;
  applyUrl: string;
  /** Plain-text description. */
  description: string;
  questions: JobQuestion[];
};

export class UnsupportedJobUrl extends Error {}

/** Board slugs are lowercase ("cloudflare", "palantir-tech"); show them as names. */
export const prettyCompany = (slug: string) => slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();

const unescapeEntities = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

// Greenhouse returns the description HTML-escaped, so decode once before stripping tags.
const stripHtml = (raw: string) =>
  (raw.includes("&lt;") && !raw.includes("<") ? unescapeEntities(raw) : raw)
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|div|li|h\d|br|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export function detectBoard(rawUrl: string): { board: Board; company: string; jobId: string } {
  const url = new URL(rawUrl);
  const host = url.hostname;
  const parts = url.pathname.split("/").filter(Boolean);

  if (host.endsWith("greenhouse.io")) {
    // job-boards.greenhouse.io/<board>/jobs/<id>  or boards.greenhouse.io/<board>/jobs/<id>
    const i = parts.indexOf("jobs");
    const gh = url.searchParams.get("gh_jid");
    if (i >= 1 && (parts[i + 1] || gh)) return { board: "greenhouse", company: parts[i - 1], jobId: parts[i + 1] || gh! };
  }
  if (host.endsWith("lever.co")) {
    // jobs.lever.co/<company>/<uuid>[/apply]
    if (parts.length >= 2) return { board: "lever", company: parts[0], jobId: parts[1] };
  }
  if (host.endsWith("ashbyhq.com")) {
    // jobs.ashbyhq.com/<company>/<uuid>[/application]
    if (parts.length >= 2) return { board: "ashby", company: parts[0], jobId: parts[1] };
  }
  // Company career pages that embed Greenhouse: ?gh_jid=<id> with the board in the path is not reliable, so stop here.
  throw new UnsupportedJobUrl(`Not a Greenhouse, Lever or Ashby job link: ${rawUrl}`);
}

const ghType = (t: string): JobQuestion["type"] =>
  t === "input_text" ? "text" : t === "textarea" ? "textarea" : t === "input_file" ? "file"
  : t === "multi_value_single_select" ? "select" : t === "multi_value_multi_select" ? "multiselect" : "unknown";

/**
 * A company careers page that embeds one of the boards: "opswat.com/jobs/123?gh_jid=123" and friends.
 * The embed names the board somewhere on the page, or the Greenhouse id in the query matches a board
 * named after the company's domain. Tried only when the URL itself is not a board link.
 */
async function resolveEmbeddedBoard(rawUrl: string): Promise<{ board: Board; company: string; jobId: string } | undefined> {
  const url = new URL(rawUrl);
  const ghJid = url.searchParams.get("gh_jid");
  const ok = async (u: string) => { try { const r = await fetch(u, { signal: AbortSignal.timeout(8000) }); return r.ok; } catch { return false; } };
  let html = "";
  try { const r = await fetch(rawUrl, { headers: { "user-agent": "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/130 Safari/537.36", accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(10000) }); if (r.ok) html = await r.text(); } catch { /* page unreachable: fall through to the domain guess */ }
  const m =
    html.match(/greenhouse\.io\/embed\/job_app\?[^"'\s]*?for=([\w.-]+)[^"'\s]*?token=(\d+)/) ||
    html.match(/greenhouse\.io\/(?:embed\/job_board\/js\?for=|)([\w.-]+)\/jobs\/(\d+)/);
  if (m) return { board: "greenhouse", company: m[1], jobId: m[2] };
  const ghBoard = html.match(/greenhouse\.io\/embed\/job_board(?:\/js)?\?for=([\w.-]+)/)?.[1];
  const lv = html.match(/jobs\.lever\.co\/([\w.-]+)\/([0-9a-f-]{36})/);
  if (lv) return { board: "lever", company: lv[1], jobId: lv[2] };
  const ab = html.match(/jobs\.ashbyhq\.com\/([\w.-]+)\/([0-9a-f-]{36})/);
  if (ab) return { board: "ashby", company: ab[1], jobId: ab[2] };
  if (ghJid) {
    const labels = url.hostname.replace(/^www\./, "").split(".");
    const guesses = [ghBoard, labels[0], labels.length > 2 ? labels[1] : undefined, ...url.pathname.split("/").filter((p) => /^[a-z][\w-]{2,}$/i.test(p) && !/^(jobs?|careers?|openings?|positions?|job-details?)$/i.test(p))].filter((g): g is string => !!g);
    for (const token of [...new Set(guesses.map((g) => g.toLowerCase()))]) {
      if (await ok(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs/${ghJid}`)) return { board: "greenhouse", company: token, jobId: ghJid };
    }
  }
  return undefined;
}

export async function fetchJob(rawUrl: string): Promise<JobPosting> {
  let detected: { board: Board; company: string; jobId: string };
  try { detected = detectBoard(rawUrl); }
  catch (e) {
    const embedded = /^https?:/i.test(rawUrl) ? await resolveEmbeddedBoard(rawUrl) : undefined;
    if (!embedded) throw e;
    detected = embedded;
  }
  const { board, company, jobId } = detected;

  if (board === "greenhouse") {
    const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}?questions=true`);
    if (!r.ok) throw new Error(`Greenhouse API ${r.status} for ${company}/${jobId}`);
    const d = await r.json();
    const questions: JobQuestion[] = [...(d.questions || []), ...(d.location_questions || [])].map((q: any) => {
      const f = q.fields?.[0] || {};
      return {
        id: f.name || q.label,
        label: q.label,
        required: !!q.required,
        type: ghType(f.type),
        options: f.values?.map((v: any) => v.label)
      };
    });
    // Voluntary demographic survey (gender, ethnicity, ...). Rendered with the numeric question id as the field id.
    for (const q of d.demographic_questions?.questions || []) {
      questions.push({ id: String(q.id), label: q.label, required: !!q.required, type: ghType(q.type), options: (q.answer_options || []).map((o: any) => o.name) });
    }
    return {
      board, company: prettyCompany(company), jobId,
      title: d.title,
      location: d.location?.name || "",
      url: d.absolute_url,
      // absolute_url is often the company's own careers page with the form in an iframe (MongoDB, for one).
      // The embed URL renders the same form standalone, so the runner can fill it without frame juggling.
      applyUrl: `https://job-boards.greenhouse.io/embed/job_app?for=${company}&token=${jobId}`,
      description: stripHtml(d.content || ""),
      questions
    };
  }

  if (board === "lever") {
    const r = await fetch(`https://api.lever.co/v0/postings/${company}/${jobId}`);
    if (!r.ok) throw new Error(`Lever API ${r.status} for ${company}/${jobId}`);
    const d = await r.json();
    const lists = (d.lists || []).map((l: any) => `${l.text}\n${stripHtml(l.content)}`).join("\n\n");
    return {
      board, company: prettyCompany(company), jobId,
      title: d.text,
      location: d.categories?.location || "",
      url: d.hostedUrl,
      applyUrl: d.applyUrl,
      description: [d.descriptionPlain || stripHtml(d.description || ""), lists, d.additionalPlain || ""].filter(Boolean).join("\n\n"),
      // Lever's public API does not expose custom questions; the runner reads them from the form.
      questions: []
    };
  }

  // ashby
  const r = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${company}?includeCompensation=true`);
  if (!r.ok) throw new Error(`Ashby API ${r.status} for ${company}`);
  const d = await r.json();
  const j = (d.jobs || []).find((x: any) => x.id === jobId);
  if (!j) throw new Error(`Ashby posting ${jobId} not found on ${company}'s board`);
  return {
    board, company: prettyCompany(company), jobId,
    title: j.title,
    location: [j.location, j.isRemote ? "Remote" : null].filter(Boolean).join(", "),
    url: j.jobUrl,
    applyUrl: j.applyUrl,
    description: j.descriptionPlain || stripHtml(j.descriptionHtml || ""),
    // Ashby's public API does not expose custom questions; the runner reads them from the form.
    questions: []
  };
}

import { fetchJob } from "../jobs/fetch";
import { matchResume, type Match } from "../resume/match";
import type { Profile } from "../profile/types";
import type { TailoredResume } from "../resume/schema";
import type { Application } from "../store";

/**
 * The job description to score against. Applications prepared before it was stored only kept a short
 * preview; fetch the posting once and keep it. Returns "" when the posting cannot be read.
 */
export async function ensureJobDescription(app: Application): Promise<string> {
  if (app.jobDescription) return app.jobDescription;
  try { app.jobDescription = (await fetchJob(app.url)).description.slice(0, 20000); }
  catch { /* the posting may be gone */ }
  return app.jobDescription || app.job?.descriptionPreview || "";
}

/** A score computed against no job terms at all: what an empty description produces. */
const scoredAgainstNothing = (m: Match) => m.tailored === 0 && m.coverage === 0 && m.matched.length === 0 && m.missing.length === 0;

/** Rescore a resume, but never replace a real score with one computed against an empty posting. */
export function rescore(jd: string, resume: TailoredResume, profile: Profile, company: string | undefined, previous: Match): Match {
  if (jd.trim().length < 200) return previous;
  const next = matchResume(jd, resume, profile, company);
  return scoredAgainstNothing(next) ? previous : next;
}

/**
 * Repair scores written as 0 by an earlier bug (a template switch scored against an empty posting).
 * Returns true when something changed, so the caller saves.
 */
export async function repairMatches(app: Application, profile: Profile): Promise<boolean> {
  if (!app.variants || !app.job) return false;
  const broken = (["tailored", "full"] as const).filter((k) => scoredAgainstNothing(app.variants![k].match));
  if (!broken.length) return false;
  const jd = await ensureJobDescription(app);
  if (jd.trim().length < 200) {
    // Nothing left to score against. Say so instead of showing a 0 that looks like a real result.
    if (broken.every((k) => app.variants![k].match.unscored)) return false;
    for (const k of broken) app.variants[k].match = { ...app.variants[k].match, unscored: true };
    if (app.resumeChoice && broken.includes(app.resumeChoice)) app.match = app.variants[app.resumeChoice].match;
    return true;
  }
  for (const k of broken) app.variants[k].match = matchResume(jd, app.variants[k].resume, profile, app.job.company);
  if (app.resumeChoice && broken.includes(app.resumeChoice)) app.match = app.variants[app.resumeChoice].match;
  return true;
}

/**
 * Rebuild one user's state in the current backend from what is known outside Blob:
 * the master profile in code, the form answers, the runner token, and the submitted MongoDB application.
 * Skips any document that already exists, so it never overwrites something newer.
 *
 *   SEED_USER_ID=user_xxx SEED_RUNNER_TOKEN=... bash -c 'set -a; . ./.env.local; set +a; npx tsx scripts/seed-from-master.ts'
 */
import { backend, getDoc, putDoc } from "../src/lib/docs";
import { MASTER } from "../src/lib/profile/master";
import { Profile, Settings } from "../src/lib/profile/types";

const userId = process.env.SEED_USER_ID || "user_3J3abxmB0tMLHSacnOI6MdNGssu";
const runnerToken = process.env.SEED_RUNNER_TOKEN || process.env.RUNNER_TOKEN || "";
console.log(`backend: ${backend()}, user: ${userId}`);
if (backend() === "blob") throw new Error("Refusing to seed into Blob; set the Turso variables first");

async function seed(path: string, value: unknown) {
  if (await getDoc(path)) { console.log("kept existing", path); return; }
  await putDoc(path, value); console.log("wrote", path);
}

const profile = Profile.parse({ ...MASTER, gender: MASTER.gender || "Male" });
await seed(`users/${userId}/profile.json`, profile);

const settings = Settings.parse({
  firstName: "Vikash", lastName: "Maddi", email: profile.email, phone: profile.phone, phoneCountry: "India", location: "Gurugram, India", gender: "Male",
  linkedin: profile.linkedin ? `https://${profile.linkedin.replace(/^https?:\/\//, "")}` : "", github: profile.github ? `https://${profile.github.replace(/^https?:\/\//, "")}` : "", website: profile.website ? `https://${profile.website.replace(/^https?:\/\//, "")}` : "",
  heardFrom: "LinkedIn", workAuthorizedCountries: "India", sponsorshipElsewhere: "Yes", needsSponsorship: "No", willingToRelocate: "Yes", openToOnsite: "Yes",
  currentCompany: "VMock", currentTitle: "Full Stack Developer", yearsExperience: "5", notifyEmail: profile.email, runnerToken
});
await seed(`users/${userId}/settings.json`, settings);
if (runnerToken) await seed(`runner-tokens/${runnerToken}.json`, { userId, createdAt: new Date().toISOString() });

await seed(`users/${userId}/applications/EQx6FTYqdb.json`, {
  id: "EQx6FTYqdb", userId, url: "https://www.mongodb.com/careers/job/?gh_jid=8106099",
  createdAt: "2026-09-10T12:00:00.000Z", updatedAt: new Date().toISOString(), status: "submitted", submittedAt: "2026-09-19T05:48:26.799Z", approvedAt: "2026-09-19T05:20:00.000Z",
  job: { board: "greenhouse", company: "Mongodb", jobId: "8106099", title: "Senior Software Engineer, AI Builder Experience (ABX)", location: "Gurugram", url: "https://www.mongodb.com/careers/job/?gh_jid=8106099", applyUrl: "https://job-boards.greenhouse.io/embed/job_app?for=mongodb&token=8106099", descriptionPreview: "", questions: [] },
  headline: "AI Interfaces Engineer, Agentic Platform", questions: [],
  runnerNotes: ["Filled by the runner on 2026-09-19", "Submitted by you in the runner window after entering the emailed code", "Record rebuilt after the Blob quota lock; the resume PDF and screenshot from Blob are not available until October"]
});
console.log("done");

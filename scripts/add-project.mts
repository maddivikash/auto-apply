/**
 * One-off: put the Context Proxy project (from the master profile) at the top of every stored
 * profile that does not have it yet. Existing projects are kept. Run with the env loaded:
 *   bash -c 'set -a; . ./.env.local; set +a; npx tsx scripts/add-project.mts'
 */
import { list, put } from "@vercel/blob";
import { MASTER } from "../src/lib/profile/master";

const project = MASTER.projects[0];
const { blobs } = await list({ prefix: "users/", limit: 1000 });
const profiles = blobs.filter((b) => b.pathname.endsWith("/profile.json"));
console.log(`${profiles.length} profile(s)`);
for (const b of profiles) {
  const p = await (await fetch(`${b.url}?t=${Date.now()}`, { cache: "no-store" })).json();
  const names = (p.projects ?? []).map((x: { name: string }) => x.name);
  if (names.some((n: string) => /context.*(proxy|management)/i.test(n))) { console.log(`skip ${b.pathname} (already has it): ${names.join(" | ")}`); continue; }
  p.projects = [project, ...(p.projects ?? [])];
  await put(b.pathname, JSON.stringify(p, null, 2), { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 0 });
  console.log(`updated ${b.pathname} (${p.name}): ${p.projects.map((x: { name: string }) => x.name).join(" | ")}`);
}

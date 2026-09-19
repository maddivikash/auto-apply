/**
 * Copy every JSON document from Vercel Blob into the Turso docs table. Safe to re-run (upserts).
 * Needs BLOB_READ_WRITE_TOKEN, TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the environment:
 *   bash -c 'set -a; . ./.env.local; set +a; npx tsx scripts/migrate-docs.ts'
 */
import { list } from "@vercel/blob";
import { backend, putDoc } from "../src/lib/docs";

if (backend() !== "turso") throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
let cursor: string | undefined; let n = 0;
do {
  const page = await list({ limit: 1000, cursor });
  for (const b of page.blobs) {
    if (!b.pathname.endsWith(".json")) continue;
    const body = await (await fetch(`${b.url}?t=${Date.now()}`, { cache: "no-store" })).json();
    await putDoc(b.pathname, body);
    n++; console.log("copied", b.pathname);
  }
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);
console.log(`${n} document(s) copied to Turso`);

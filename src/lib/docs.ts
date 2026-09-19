/**
 * JSON document store behind the app's state (applications, profile, settings, notifications, runner tokens).
 *
 * Backends, picked by environment:
 *   - Turso (libSQL over its HTTP API, no SDK) when TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set.
 *     Reads and writes are plain SQL on one table and cost nothing on the free plan at this scale.
 *   - Vercel Blob when only BLOB_READ_WRITE_TOKEN is set. Every list() and put() is a billed
 *     "advanced operation" (2K/month on Hobby), so reads go straight to the blob URL and list() is
 *     used only for prefix listings. Fine for files, too expensive for polled state.
 *   - Local filesystem (.data/) for development without either.
 * Files (PDFs, screenshots) always live in Blob; see store.ts.
 */
import { put, list, del } from "@vercel/blob";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";

export type Backend = "turso" | "blob" | "fs";
export const backend = (): Backend => (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN ? "turso" : process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "fs");

// ---- Turso ------------------------------------------------------------------
type HranaValue = { type: "text"; value: string } | { type: "null" } | { type: "integer"; value: string } | { type: "float"; value: number };
type Stmt = { sql: string; args?: HranaValue[] };
let tableReady: Promise<void> | null = null;

async function turso(stmts: Stmt[]): Promise<HranaValue[][][]> {
  const url = process.env.TURSO_DATABASE_URL!.replace(/^libsql:\/\//, "https://").replace(/\/$/, "");
  const r = await fetch(`${url}/v2/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.TURSO_AUTH_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [...stmts.map((stmt) => ({ type: "execute", stmt })), { type: "close" }] }),
    cache: "no-store"
  });
  if (!r.ok) throw new Error(`Turso ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = (await r.json()) as { results: Array<{ type: string; error?: { message: string }; response?: { result?: { rows: HranaValue[][] } } }> };
  return data.results.slice(0, stmts.length).map((res) => {
    if (res.type === "error") throw new Error(`Turso: ${res.error?.message}`);
    return res.response?.result?.rows ?? [];
  });
}
const text = (v: HranaValue) => (v.type === "text" ? v.value : v.type === "null" ? "" : String(v.value));
const arg = (value: string): HranaValue => ({ type: "text", value });

function ensureTable() {
  tableReady ??= turso([
    { sql: "CREATE TABLE IF NOT EXISTS docs (path TEXT PRIMARY KEY, body TEXT NOT NULL, updated_at TEXT NOT NULL)" },
    { sql: "CREATE TABLE IF NOT EXISTS files (path TEXT PRIMARY KEY, content_type TEXT NOT NULL, body_b64 TEXT NOT NULL, updated_at TEXT NOT NULL)" }
  ]).then(() => undefined);
  return tableReady;
}

// ---- Blob -------------------------------------------------------------------
let blobBase: Promise<string> | null = null;
/** Store host, discovered once per process so reads never need list(). */
function blobBaseUrl(): Promise<string> {
  blobBase ??= (async () => {
    if (process.env.BLOB_BASE_URL) return process.env.BLOB_BASE_URL.replace(/\/$/, "");
    const { blobs } = await list({ limit: 1 });
    if (!blobs.length) return "";
    const u = new URL(blobs[0].url);
    return `${u.protocol}//${u.host}`;
  })();
  return blobBase;
}

// ---- FS ---------------------------------------------------------------------
const LOCAL_DIR = join(process.cwd(), ".data");

// ---- API --------------------------------------------------------------------
export async function getDoc<T>(path: string): Promise<T | null> {
  switch (backend()) {
    case "turso": {
      await ensureTable();
      const [rows] = await turso([{ sql: "SELECT body FROM docs WHERE path = ?", args: [arg(path)] }]);
      return rows[0] ? (JSON.parse(text(rows[0][0])) as T) : null;
    }
    case "blob": {
      const base = await blobBaseUrl();
      if (!base) return null;
      const r = await fetch(`${base}/${path}?t=${Date.now()}`, { cache: "no-store" });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`Blob read ${r.status} for ${path}`);
      return (await r.json()) as T;
    }
    default: {
      const p = join(LOCAL_DIR, path);
      return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : null;
    }
  }
}

export async function putDoc(path: string, value: unknown): Promise<void> {
  const body = JSON.stringify(value, null, 2);
  switch (backend()) {
    case "turso":
      await ensureTable();
      await turso([{ sql: "INSERT INTO docs (path, body, updated_at) VALUES (?, ?, ?) ON CONFLICT(path) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at", args: [arg(path), arg(body), arg(new Date().toISOString())] }]);
      return;
    case "blob":
      await put(path, body, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 0 });
      return;
    default: {
      const p = join(LOCAL_DIR, path); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, body);
    }
  }
}

/** Every document whose path starts with prefix (a "folder"). */
export async function listDocs<T>(prefix: string): Promise<T[]> {
  switch (backend()) {
    case "turso": {
      await ensureTable();
      const [rows] = await turso([{ sql: "SELECT body FROM docs WHERE path LIKE ? ESCAPE '\\'", args: [arg(`${prefix.replace(/[%_\\]/g, (c) => `\\${c}`)}%`)] }]);
      return rows.map((r) => JSON.parse(text(r[0])) as T);
    }
    case "blob": {
      const { blobs } = await list({ prefix, limit: 500 });
      return Promise.all(blobs.filter((b) => b.pathname.endsWith(".json")).map(async (b) => (await fetch(`${b.url}?t=${Date.now()}`, { cache: "no-store" })).json() as Promise<T>));
    }
    default: {
      const dir = join(LOCAL_DIR, prefix);
      if (!existsSync(dir)) return [];
      return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as T);
    }
  }
}

/** Paths under a prefix, for migrations. Blob only lists .json objects. */
export async function listDocPaths(prefix: string): Promise<string[]> {
  switch (backend()) {
    case "turso": {
      await ensureTable();
      const [rows] = await turso([{ sql: "SELECT path FROM docs WHERE path LIKE ?", args: [arg(`${prefix}%`)] }]);
      return rows.map((r) => text(r[0]));
    }
    case "blob": {
      const { blobs } = await list({ prefix, limit: 1000 });
      return blobs.filter((b) => b.pathname.endsWith(".json")).map((b) => b.pathname);
    }
    default: {
      const dir = join(LOCAL_DIR, prefix);
      return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => `${prefix}${f}`) : [];
    }
  }
}

export async function delDoc(path: string): Promise<void> {
  switch (backend()) {
    case "turso":
      await ensureTable();
      await turso([{ sql: "DELETE FROM docs WHERE path = ?", args: [arg(path)] }]);
      return;
    case "blob": {
      const base = await blobBaseUrl();
      if (base) await del(`${base}/${path}`);
      return;
    }
    default: {
      const p = join(LOCAL_DIR, path); if (existsSync(p)) unlinkSync(p);
    }
  }
}

// ---- files (Turso and fs only; the Blob backend keeps files in Blob, see store.ts) -------------
export async function putFile(path: string, data: Buffer, contentType: string): Promise<void> {
  if (backend() === "turso") {
    await ensureTable();
    await turso([{ sql: "INSERT INTO files (path, content_type, body_b64, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(path) DO UPDATE SET content_type = excluded.content_type, body_b64 = excluded.body_b64, updated_at = excluded.updated_at", args: [arg(path), arg(contentType), arg(data.toString("base64")), arg(new Date().toISOString())] }]);
    return;
  }
  const p = join(LOCAL_DIR, path); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, data);
}

export async function getFile(path: string): Promise<{ data: Uint8Array; contentType: string } | null> {
  if (backend() === "turso") {
    await ensureTable();
    const [rows] = await turso([{ sql: "SELECT content_type, body_b64 FROM files WHERE path = ?", args: [arg(path)] }]);
    return rows[0] ? { contentType: text(rows[0][0]), data: new Uint8Array(Buffer.from(text(rows[0][1]), "base64")) } : null;
  }
  const p = join(LOCAL_DIR, path);
  return existsSync(p) ? { contentType: path.endsWith(".pdf") ? "application/pdf" : "image/png", data: new Uint8Array(readFileSync(p)) } : null;
}

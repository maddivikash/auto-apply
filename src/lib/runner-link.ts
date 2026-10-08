/**
 * "Connect this computer" for the npx runner, without copying a token by hand:
 *
 *   1. The CLI asks for a link: it gets a private secret to poll with, and a short code to show.
 *   2. It opens /runner/link?code=… in the browser. The signed-in user confirms the code there.
 *   3. The CLI's next poll receives the runner token once, and the link is deleted.
 *
 * The code alone grants nothing: it only names a pending link, and only a signed-in user can
 * approve it. Links expire after ten minutes.
 */
import { randomBytes } from "node:crypto";
import { delDoc, getDoc, putDoc } from "./docs";

const TTL_MS = 10 * 60 * 1000;
// No 0/O or 1/I/L, so the code reads cleanly aloud and on screen.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export type RunnerLink = { code: string; device: string; createdAt: number; expiresAt: number; status: "pending" | "approved"; token?: string; userId?: string; account?: string };

const linkKey = (secret: string) => `runner-links/${secret}.json`;
const codeKey = (code: string) => `runner-link-codes/${code}.json`;

export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
export const formatCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

export async function createLink(device: string): Promise<{ secret: string; code: string; expiresAt: number }> {
  const secret = randomBytes(24).toString("base64url");
  const bytes = randomBytes(8);
  const code = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  const now = Date.now();
  const link: RunnerLink = { code, device: device.slice(0, 80), createdAt: now, expiresAt: now + TTL_MS, status: "pending" };
  await Promise.all([putDoc(linkKey(secret), link), putDoc(codeKey(code), { secret, expiresAt: link.expiresAt })]);
  return { secret, code, expiresAt: link.expiresAt };
}

/** The pending link a code points to, for the confirmation page. */
export async function linkForCode(code: string): Promise<{ secret: string; link: RunnerLink } | null> {
  const ref = await getDoc<{ secret: string; expiresAt: number }>(codeKey(normalizeCode(code)));
  if (!ref || ref.expiresAt < Date.now()) return null;
  const link = await getDoc<RunnerLink>(linkKey(ref.secret));
  return link && link.expiresAt >= Date.now() ? { secret: ref.secret, link } : null;
}

export async function approveLink(secret: string, userId: string, token: string, account: string): Promise<void> {
  const link = await getDoc<RunnerLink>(linkKey(secret));
  if (!link || link.expiresAt < Date.now()) throw new Error("This code has expired. Run npx lazy-apply again for a new one.");
  await putDoc(linkKey(secret), { ...link, status: "approved", token, userId, account } satisfies RunnerLink);
}

/** What the CLI's poll sees. The token is handed over exactly once, then the link is gone. */
export async function takeLink(secret: string): Promise<{ status: "pending" | "expired" } | { status: "approved"; token: string; account: string }> {
  const link = await getDoc<RunnerLink>(linkKey(secret));
  if (!link || link.expiresAt < Date.now()) return { status: "expired" };
  if (link.status !== "approved" || !link.token) return { status: "pending" };
  await Promise.all([delDoc(linkKey(secret)), delDoc(codeKey(link.code))]);
  return { status: "approved", token: link.token, account: link.account || "" };
}

// ---- heartbeat ------------------------------------------------------------------
export type RunnerSeen = { at: number; client: string };
const seenKey = (uid: string) => `users/${uid}/runner-seen.json`;
const lastWrite = new Map<string, number>();

/** Called on every runner poll; written at most once a minute per instance. */
export async function markRunnerSeen(uid: string, client: string): Promise<void> {
  const now = Date.now();
  if (now - (lastWrite.get(uid) ?? 0) < 60_000) return;
  lastWrite.set(uid, now);
  await putDoc(seenKey(uid), { at: now, client: client.slice(0, 80) } satisfies RunnerSeen);
}
export const runnerSeen = (uid: string) => getDoc<RunnerSeen>(seenKey(uid));

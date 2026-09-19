/**
 * Short-lived signed links for files an agent has to hand to something that cannot send our
 * bearer token (a form uploader, a browser, another service). HMAC over "userId|appId|exp".
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => process.env.APP_SECRET || process.env.CLERK_SECRET_KEY || "";

function sig(userId: string, appId: string, exp: number) {
  return createHmac("sha256", secret()).update(`${userId}|${appId}|${exp}`).digest("base64url");
}

/** Absolute URL to the tailored PDF, valid for `ttlHours` (default 24). */
export function signedPdfUrl(origin: string, userId: string, appId: string, ttlHours = 24): string {
  const exp = Math.floor(Date.now() / 1000) + ttlHours * 3600;
  const q = new URLSearchParams({ u: userId, e: String(exp), s: sig(userId, appId, exp) });
  return `${origin}/api/v1/applications/${appId}/pdf?${q}`;
}

/** The user id a signed link was issued for, or null when the link is missing, expired or forged. */
export function verifySignedPdf(url: URL, appId: string): string | null {
  const u = url.searchParams.get("u"), e = Number(url.searchParams.get("e")), s = url.searchParams.get("s");
  if (!u || !e || !s || !secret()) return null;
  if (e < Math.floor(Date.now() / 1000)) return null;
  const expected = Buffer.from(sig(u, appId, e)), given = Buffer.from(s);
  return expected.length === given.length && timingSafeEqual(expected, given) ? u : null;
}

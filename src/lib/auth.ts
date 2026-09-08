import { cookies, headers } from "next/headers";
import { createHash } from "node:crypto";

const COOKIE = "aa_session";
const token = () => createHash("sha256").update(`${process.env.APP_PASSWORD || "dev"}:${process.env.APP_SECRET || "salt"}`).digest("hex");

export async function isLoggedIn(): Promise<boolean> {
  const c = await cookies();
  return c.get(COOKIE)?.value === token();
}

export async function loginWithPassword(password: string): Promise<boolean> {
  if (!process.env.APP_PASSWORD) return true; // local dev without a password
  if (password !== process.env.APP_PASSWORD) return false;
  const c = await cookies();
  c.set(COOKIE, token(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 90, path: "/" });
  return true;
}

export async function logout() {
  const c = await cookies();
  c.delete(COOKIE);
}

/** Runner and other machine callers use a bearer token instead of the cookie. */
export async function isRunner(): Promise<boolean> {
  const h = await headers();
  const auth = h.get("authorization") || "";
  return !!process.env.RUNNER_TOKEN && auth === `Bearer ${process.env.RUNNER_TOKEN}`;
}

export async function authorized(): Promise<boolean> {
  if (!process.env.APP_PASSWORD) return true;
  return (await isLoggedIn()) || (await isRunner());
}

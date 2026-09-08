import { auth, currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { userForRunnerToken } from "./store";

/** Signed-in user id, or null. */
export async function userId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

export async function requireUserId(): Promise<string> {
  const id = await userId();
  if (!id) throw new Error("Not signed in");
  return id;
}

export async function userEmail(): Promise<string | null> {
  const u = await currentUser();
  return u?.primaryEmailAddress?.emailAddress ?? u?.emailAddresses?.[0]?.emailAddress ?? null;
}

/** The runner authenticates with a per-user bearer token instead of a session. */
export async function runnerUserId(): Promise<string | null> {
  const h = await headers();
  const m = /^Bearer\s+([A-Za-z0-9_-]{20,})$/.exec(h.get("authorization") || "");
  if (!m) return null;
  return userForRunnerToken(m[1]);
}

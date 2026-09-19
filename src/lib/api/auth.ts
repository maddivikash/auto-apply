/**
 * Who is calling the connector API. Four ways in, checked in order:
 *   1. A Clerk OAuth access token (MCP clients such as Muse, Claude, ChatGPT after the OAuth dance).
 *   2. A personal API key from the Connect page (custom connectors and scripts: `Authorization: Bearer <key>`).
 *   3. The runner token (so the desktop runner can use the same endpoints).
 *   4. A signed-in browser session (calling the API from the app itself).
 */
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { userForApiKey, userForRunnerToken } from "../store";

const previewUser = () => (process.env.NODE_ENV !== "production" ? process.env.DEV_FAKE_USER || null : null);

async function bearer(): Promise<string | null> {
  const h = await headers();
  const m = /^Bearer\s+(\S+)$/.exec(h.get("authorization") || "");
  return m ? m[1] : null;
}

export async function apiUserId(): Promise<string | null> {
  const fake = previewUser();
  if (fake) return fake;
  const token = await bearer();
  if (token) {
    // Clerk OAuth tokens are JWT-shaped or prefixed; our own keys are plain base64url. Ask Clerk first, it is cheap to be told no.
    try {
      const a = await auth({ acceptsToken: ["oauth_token", "api_key"] });
      if (a.isAuthenticated && a.userId) return a.userId;
    } catch { /* not a Clerk token */ }
    if (/^[A-Za-z0-9_-]{20,}$/.test(token)) {
      const viaKey = await userForApiKey(token);
      if (viaKey) return viaKey;
      const viaRunner = await userForRunnerToken(token);
      if (viaRunner) return viaRunner;
    }
    return null;
  }
  try {
    const a = await auth({ acceptsToken: "session_token" });
    return a.userId ?? null;
  } catch { return null; }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function requireApiUser(): Promise<string> {
  const uid = await apiUserId();
  if (!uid) throw new ApiError(401, "Sign in with OAuth or send `Authorization: Bearer <api key>` (Connect page in the app).");
  return uid;
}

/** JSON response helpers with the error shape agents can read. */
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export const fail = (e: unknown) => {
  if (e instanceof ApiError) return json({ error: e.message }, e.status);
  const message = e instanceof Error ? e.message : String(e);
  console.error("api error:", e);
  return json({ error: message }, 500);
};

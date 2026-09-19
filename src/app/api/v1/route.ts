import { json } from "@/lib/api/auth";

/** Discovery: where everything is. Public. */
export function GET(req: Request) {
  const origin = (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, "");
  return json({
    name: "Auto Apply connector API",
    version: "1.0.0",
    openapi: `${origin}/openapi.json`,
    mcp: `${origin}/mcp`,
    auth: { bearer: "Personal API key from the Connect page, or a Clerk OAuth access token", oauthMetadata: `${origin}/.well-known/oauth-protected-resource` },
    docs: `${origin}/connect/docs`
  });
}

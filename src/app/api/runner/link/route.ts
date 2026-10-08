import { createLink, formatCode, takeLink } from "@/lib/runner-link";

const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

/** The CLI starts a link: a secret to poll with and a code for the user to confirm in the browser. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { device?: string };
  const { secret, code, expiresAt } = await createLink(String(body.device || "a computer"));
  return Response.json({ secret, code: formatCode(code), url: `${appUrl()}/runner/link?code=${code}`, expiresAt });
}

/** The CLI polls with its secret until the user approves (or the link expires). */
export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret") || "";
  if (!/^[A-Za-z0-9_-]{20,}$/.test(secret)) return Response.json({ status: "expired" }, { status: 400 });
  const r = await takeLink(secret);
  return Response.json(r, { headers: { "Cache-Control": "no-store" } });
}

import { openapi } from "@/lib/api/openapi";

export function GET(req: Request) {
  const origin = (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, "");
  return Response.json(openapi(origin), { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" } });
}

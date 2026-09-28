import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Connector surfaces do their own auth (OAuth tokens, API keys) inside the handlers.
const isPublic = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/api/runner(.*)", "/api/internal(.*)", "/api/applications/(.*)/(pdf|screenshot)", "/api/v1(.*)", "/mcp(.*)", "/.well-known(.*)", "/openapi.json", "/connect/docs", "/privacy", "/terms", "/sprint(.*)"]);

// Local design previews only: never set on Vercel.
const preview = process.env.NODE_ENV !== "production" && !!process.env.DEV_FAKE_USER;

// Old production hostnames send people to lazyapply.online. Machine endpoints stay put: a runner, MCP client or
// API caller still configured with the old URL would lose its Authorization header on a cross-host redirect.
const CANONICAL = "lazyapply.online";
const OLD_HOSTS = new Set(["www.lazyapply.online", "auto-apply-app.vercel.app", "auto-apply-vikash.vercel.app", "auto-apply-lemon.vercel.app", "auto-apply-vikashmaddi-2075s-projects.vercel.app"]);
const isMachine = createRouteMatcher(["/api(.*)", "/mcp(.*)", "/.well-known(.*)", "/openapi.json"]);

export default clerkMiddleware(async (auth, req) => {
  if (OLD_HOSTS.has(req.nextUrl.hostname) && !isMachine(req) && (req.method === "GET" || req.method === "HEAD")) {
    const to = new URL(req.nextUrl.pathname + req.nextUrl.search, `https://${CANONICAL}`);
    return NextResponse.redirect(to, 308);
  }
  if (preview) return;
  if (!isPublic(req)) await auth.protect();
}, { signInUrl: "/sign-in", signUpUrl: "/sign-up" });

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"]
};

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Connector surfaces do their own auth (OAuth tokens, API keys) inside the handlers.
const isPublic = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/api/runner(.*)", "/api/applications/(.*)/(pdf|screenshot)", "/api/v1(.*)", "/mcp(.*)", "/.well-known(.*)", "/openapi.json", "/connect/docs", "/privacy", "/terms"]);

// Local design previews only: never set on Vercel.
const preview = process.env.NODE_ENV !== "production" && !!process.env.DEV_FAKE_USER;

export default clerkMiddleware(async (auth, req) => {
  if (preview) return;
  if (!isPublic(req)) await auth.protect();
}, { signInUrl: "/sign-in", signUpUrl: "/sign-up" });

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"]
};

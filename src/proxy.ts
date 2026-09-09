import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublic = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/api/runner(.*)"]);

// Local design previews only: never set on Vercel.
const preview = process.env.NODE_ENV !== "production" && !!process.env.DEV_FAKE_USER;

export default clerkMiddleware(async (auth, req) => {
  if (preview) return;
  if (!isPublic(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"]
};

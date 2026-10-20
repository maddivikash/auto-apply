/**
 * Where Clerk's browser script and API live for this app. The host is encoded in the publishable key
 * (pk_live_<base64("clerk.example.com$")>). The SDK asks for the clerk-js major that matches its own
 * package (6 for @clerk/nextjs 7); Clerk redirects that to the latest 6.x. Preloading the same URL from
 * the auth pages starts the download with the HTML instead of after hydration.
 */
export const CLERK_JS_MAJOR = "6";

export const CLERK_ORIGIN = (() => {
  try {
    const host = atob((process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "").split("_")[2] || "").replace(/\$$/, "");
    return host ? `https://${host}` : "";
  } catch {
    return "";
  }
})();

export const CLERK_JS_URL = CLERK_ORIGIN ? `${CLERK_ORIGIN}/npm/@clerk/clerk-js@${CLERK_JS_MAJOR}/dist/clerk.browser.js` : "";

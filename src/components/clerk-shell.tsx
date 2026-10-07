import { ClerkProvider } from "@clerk/nextjs";

/** The production Clerk app is still named "My Application"; say Lazy Apply in its cards regardless. */
const CLERK_TEXT = {
  signIn: { start: { title: "Sign in to Lazy Apply", subtitle: "Welcome back. Pick up where you left off." } },
  signUp: { start: { title: "Create your Lazy Apply account", subtitle: "Start with the resume you already have." } }
};

/**
 * Clerk's browser script (about 300 KB) is needed only where its components render: the app shell's
 * account button and the sign-in and sign-up pages. Wrapping just those keeps it off the landing page.
 * Server-side checks (auth() in pages and the middleware) do not depend on this provider.
 */
export function ClerkShell({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/profile?welcome=1" localization={CLERK_TEXT}>
      {children}
    </ClerkProvider>
  );
}

import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Merriweather } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/toaster";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const serif = Merriweather({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-merriweather" });

export const metadata: Metadata = { title: "Lazy Apply", description: "Paste a job link. Get a tailored resume, a filled form, and the final say." };

/** The production Clerk app is still named "My Application"; say Lazy Apply in its cards regardless. */
const CLERK_TEXT = {
  signIn: { start: { title: "Sign in to Lazy Apply", subtitle: "Welcome back. Pick up where you left off." } },
  signUp: { start: { title: "Create your Lazy Apply account", subtitle: "Start with the resume you already have." } }
};
/** Clerk's frontend API host is encoded in the publishable key: pk_live_<base64("clerk.example.com$")>. */
const CLERK_ORIGIN = (() => {
  try { const host = atob((process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "").split("_")[2] || "").replace(/\$$/, ""); return host ? `https://${host}` : ""; }
  catch { return ""; }
})();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/profile?welcome=1" localization={CLERK_TEXT}>
      <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
        {/* Clerk's script and API live on their own domain; open that connection while the page is still loading. */}
        {CLERK_ORIGIN && <head><link rel="preconnect" href={CLERK_ORIGIN} crossOrigin="anonymous" /><link rel="dns-prefetch" href={CLERK_ORIGIN} /></head>}
        <body className="min-h-screen antialiased">{children}<Toaster /></body>
      </html>
    </ClerkProvider>
  );
}

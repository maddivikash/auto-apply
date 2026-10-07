import type { Metadata } from "next";
import { Geist, Geist_Mono, Merriweather } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/toaster";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
// Only the italic accents in headlines use the serif, so only that one face is downloaded.
const serif = Merriweather({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-merriweather" });

export const metadata: Metadata = { title: "Lazy Apply", description: "Paste a job link. Get a tailored resume, a filled form, and the final say." };

/** Clerk's frontend API host is encoded in the publishable key: pk_live_<base64("clerk.example.com$")>. */
const CLERK_ORIGIN = (() => {
  try { const host = atob((process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "").split("_")[2] || "").replace(/\$$/, ""); return host ? `https://${host}` : ""; }
  catch { return ""; }
})();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      {/* Clerk's script and API live on their own domain; open that connection while the page is still loading. */}
      {CLERK_ORIGIN && <head><link rel="preconnect" href={CLERK_ORIGIN} crossOrigin="anonymous" /><link rel="dns-prefetch" href={CLERK_ORIGIN} /></head>}
      <body className="min-h-screen antialiased">{children}<Toaster /></body>
    </html>
  );
}

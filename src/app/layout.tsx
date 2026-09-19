import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { IBM_Plex_Sans, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/toaster";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["italic"], variable: "--font-instrument-serif" });

export const metadata: Metadata = { title: "Auto Apply", description: "Paste a job link. Get a tailored resume, a filled form, and the final say." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/profile?welcome=1">
      <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
        <body className="min-h-screen antialiased">{children}<Toaster /></body>
      </html>
    </ClerkProvider>
  );
}

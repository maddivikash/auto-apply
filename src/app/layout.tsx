import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Merriweather } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/toaster";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const serif = Merriweather({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-merriweather" });

export const metadata: Metadata = { title: "Lazy Apply", description: "Paste a job link. Get a tailored resume, a filled form, and the final say." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/profile?welcome=1">
      <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
        <body className="min-h-screen antialiased">{children}<Toaster /></body>
      </html>
    </ClerkProvider>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Auto Apply", description: "Tailored resumes and reviewed applications for Greenhouse, Lever and Ashby jobs" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <div className="mx-auto max-w-4xl px-5 py-8">{children}</div>
      </body>
    </html>
  );
}

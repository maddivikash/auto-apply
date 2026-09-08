import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core", "playwright"],
  outputFileTracingIncludes: { "/**": ["./node_modules/@sparticuz/chromium/bin/**"] }
};

export default nextConfig;

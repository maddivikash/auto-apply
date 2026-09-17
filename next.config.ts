import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/@sparticuz/chromium/bin/**",
      // playwright-core loads this with a dynamic require at module init; the tracer cannot see it
      "./node_modules/playwright-core/browsers.json"
    ]
  }
};

export default nextConfig;

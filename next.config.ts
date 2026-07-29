import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  outputFileTracingExcludes: {
    "*": [
      "./docs/**/*",
      "./tests/**/*",
      "./screenshots/**/*",
      "./logs/**/*",
      "./playwright-report/**/*",
      "./test-results/**/*",
    ],
  },
  env: {
    NEXT_PUBLIC_VERSION: packageJson.version,
  },
  async headers() {
    const isDevelopment = process.env.NODE_ENV === "development";
    const contentSecurityPolicy = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src 'self' https://api.github.com${isDevelopment ? " ws: http:" : ""}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://github.com",
      "frame-ancestors 'none'",
    ].join("; ");

    return [{
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      ],
    }];
  },
};

export default nextConfig;

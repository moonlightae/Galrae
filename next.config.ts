import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.VERCEL === "1" ? {
    // Vercel uses browser storage; Cloudflare route.ts handlers belong to Sites.
    pageExtensions: ["tsx", "jsx"],
    env: { NEXT_PUBLIC_BROWSER_STORAGE: "1" },
  } : {}),
};

export default nextConfig;

import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  ...(process.env.VERCEL === "1" ? {
    webpack(config, { webpack }) {
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(/[\\/]db[\\/]index\.ts$/, resolve("db/vercel.ts")));
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(/[\\/]db[\\/]schema\.ts$/, resolve("db/schema-neon.ts")));
      return config;
    },
  } : {}),
};

export default nextConfig;

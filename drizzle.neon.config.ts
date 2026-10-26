import { defineConfig } from "drizzle-kit";

export default defineConfig({ out: "./drizzle-neon", schema: "./db/schema-neon.ts", dialect: "postgresql" });

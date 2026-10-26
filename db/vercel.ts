import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema-neon";

let database: NeonHttpDatabase<typeof schema> | undefined;

export function getDb() {
  if (database) return database;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Neon database is not configured: DATABASE_URL is required.");
  database = drizzle(url, { schema });
  return database;
}

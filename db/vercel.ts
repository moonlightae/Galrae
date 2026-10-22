import { drizzle } from "drizzle-orm/libsql/web";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

let database: LibSQLDatabase<typeof schema> | undefined;

export function getDb() {
  if (database) return database;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error("Cloud database is not configured: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required.");
  database = drizzle({ connection: { url, authToken }, schema });
  return database;
}

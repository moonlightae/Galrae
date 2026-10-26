import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { neon } from "@neondatabase/serverless";

const tables = ["users", "leaderboard", "classified_species", "plant_progress"];
const snapshot = JSON.parse(readFileSync(new URL("../drizzle-neon/meta/0000_snapshot.json", import.meta.url), "utf8"));
const migration = readFileSync(new URL("../drizzle-neon/0000_initial_neon.sql", import.meta.url), "utf8");

export function normalizeExport(exported) {
  if (!exported || tables.some((table) => !Array.isArray(exported[table])) || !exported.users.length) throw new Error("Incomplete source export");
  const ids = new Set(exported.users.map((user) => user.id));
  if (ids.size !== exported.users.length || exported.users.some((user) => typeof user.id !== "string"
    || typeof user.password_hash !== "string" || user.password_hash.length !== 44
    || typeof user.password_salt !== "string" || !Number.isSafeInteger(user.password_iterations) || user.password_iterations < 1)
    || tables.slice(1).some((table) => exported[table].some((row) => !ids.has(row.user_id)))) throw new Error("Invalid source account references");
  return Object.fromEntries(tables.map((table) => {
    const columns = snapshot.tables[`public.${table}`].columns;
    return [table, exported[table].map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => {
      if (!Object.hasOwn(columns, key)) throw new Error("Unknown source column");
      if (columns[key].type === "boolean") {
        if (![0, 1, false, true].includes(value)) throw new Error("Invalid source boolean");
        value = Boolean(value);
      }
      return [key, value];
    })))];
  }));
}

export async function importNeonDatabase(sql, source) {
  const exported = normalizeExport(source);
  const id = createHash("sha256").update(JSON.stringify(exported)).digest("hex");
  const counts = Object.fromEntries(tables.map((table) => [table, exported[table].length]));
  const [existing] = await sql.query("SELECT to_regclass('public.galrae_imports') AS receipt, to_regclass('public.users') AS users");
  if (existing.receipt) {
    const [receipt] = await sql.query("SELECT counts FROM galrae_imports WHERE id = $1", [id]);
    if (receipt) return { ...JSON.parse(receipt.counts), alreadyImported: true };
  }
  if (existing.users) throw new Error("Destination already contains an account schema; import will not overwrite it");
  const statements = [sql.query("SELECT pg_advisory_xact_lock(817260126)")];
  for (const statement of migration.split("--> statement-breakpoint").map((part) => part.trim()).filter(Boolean)) statements.push(sql.query(statement));
  for (const table of tables) {
    const rows = exported[table];
    for (let offset = 0; offset < rows.length; offset += 50) {
      const batch = rows.slice(offset, offset + 50);
      const keys = Object.keys(batch[0]);
      if (batch.some((row) => Object.keys(row).length !== keys.length || keys.some((key) => !Object.hasOwn(row, key)))) throw new Error("Inconsistent source columns");
      const args = batch.flatMap((row) => keys.map((key) => row[key]));
      const values = batch.map((_, rowIndex) => `(${keys.map((_, columnIndex) => `$${rowIndex * keys.length + columnIndex + 1}`).join(",")})`).join(",");
      statements.push(sql.query(`INSERT INTO "${table}" (${keys.map((key) => `"${key}"`).join(",")}) VALUES ${values}`, args));
    }
  }
  statements.push(sql.query("CREATE TABLE galrae_imports (id text PRIMARY KEY, counts text NOT NULL, imported_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP)"));
  statements.push(sql.query("INSERT INTO galrae_imports(id, counts) VALUES ($1, $2)", [id, JSON.stringify(counts)]));
  for (const table of tables) statements.push(sql.query(`SELECT COUNT(*)::integer AS count FROM "${table}"`));
  const results = await sql.transaction(statements, { isolationLevel: "Serializable" });
  for (const [index, table] of tables.entries()) {
    if (results.at(-tables.length + index)[0].count !== counts[table]) throw new Error("Imported row count mismatch");
  }
  return counts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.env.DATABASE_URL || !process.env.GALRAE_SITES_IMPORT) throw new Error("Missing import environment");
    const result = await importNeonDatabase(neon(process.env.DATABASE_URL), JSON.parse(process.env.GALRAE_SITES_IMPORT));
    console.log("Neon account import:", JSON.stringify(result));
  } catch {
    console.error("Neon import stopped. Existing destination accounts were not overwritten. Check the private source and destination configuration.");
    process.exitCode = 1;
  }
}

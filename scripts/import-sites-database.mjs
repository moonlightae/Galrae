import { readFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const tables = ["users", "leaderboard", "classified_species", "plant_progress"];
const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

export async function importSitesDatabase(client, exported, folder = migrationsFolder) {
  if (!exported || tables.some((table) => !Array.isArray(exported[table])) || !exported.users.length) throw new Error("The Sites export is incomplete.");
  const userIds = new Set(exported.users.map((user) => user.id));
  if (userIds.size !== exported.users.length || exported.users.some((user) => typeof user.id !== "string" || typeof user.password_hash !== "string"
    || typeof user.password_salt !== "string" || !Number.isSafeInteger(user.password_iterations) || user.password_iterations < 1)
    || tables.slice(1).some((table) => exported[table].some((row) => !userIds.has(row.user_id)))) throw new Error("The Sites export contains invalid account references.");
  await migrate(drizzle(client), { migrationsFolder: folder });
  const transaction = await client.transaction("write");
  try {
    const oldUsers = (await transaction.execute("SELECT * FROM users")).rows;
    const seedSql = readFileSync(new URL("../drizzle/0002_public_dorian_gray.sql", import.meta.url), "utf8");
    const seed = seedSql.match(/VALUES \('admin-account', 'admin', 'admin', '[^']*', '([^']+)', '([^']+)', 100000, 1\)/);
    const untouchedSeed = oldUsers.length === 1 && seed && oldUsers[0].id === "admin-account"
      && oldUsers[0].password_hash === seed[1] && oldUsers[0].password_salt === seed[2]
      && Number(oldUsers[0].password_iterations) === 100000;
    if (oldUsers.length && !untouchedSeed) throw new Error("Destination already contains accounts; import will not overwrite them.");
    for (const table of tables.slice(1)) {
      const count = (await transaction.execute(`SELECT COUNT(*) AS count FROM "${table}"`)).rows[0].count;
      if (Number(count)) throw new Error("Destination already contains game records; import will not overwrite them.");
    }
    if (untouchedSeed) await transaction.execute("DELETE FROM users WHERE id = 'admin-account'");
    for (const table of tables) {
      const columns = new Set((await transaction.execute(`PRAGMA table_info("${table}")`)).rows.map((column) => column.name));
      const statements = exported[table].map((row) => {
        const keys = Object.keys(row);
        if (!keys.length || keys.some((key) => !columns.has(key))) throw new Error("The Sites export does not match the database schema.");
        return { sql: `INSERT INTO "${table}" (${keys.map((key) => `"${key}"`).join(",")}) VALUES (${keys.map(() => "?").join(",")})`, args: keys.map((key) => row[key]) };
      });
      for (let offset = 0; offset < statements.length; offset += 100) await transaction.batch(statements.slice(offset, offset + 100));
    }
    await transaction.commit();
    return Object.fromEntries(tables.map((table) => [table, exported[table].length]));
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally { transaction.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = process.argv[2];
  if (input === "--stdin") {
    console.log("Ready for private database import JSON on stdin (input is hidden).");
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    let raw = "";
    for await (const chunk of process.stdin) {
      raw += chunk;
      if (raw.includes("\n")) break;
    }
    process.stdin.pause();
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    let client;
    try {
      const { url, authToken, exported } = JSON.parse(raw);
      if (typeof url !== "string" || !/^(libsql|https):\/\//.test(url) || typeof authToken !== "string" || !authToken) throw new Error("Invalid destination");
      client = createClient({ url, authToken });
      console.log(JSON.stringify(await importSitesDatabase(client, exported)));
    } catch {
      console.error("Import failed. Existing account data was not overwritten. Check the destination and private export.");
      process.exitCode = 1;
    } finally { client?.close(); }
  } else if (!input || !process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error("Usage: set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN, then node scripts/import-sites-database.mjs <private-export.json>");
    process.exitCode = 1;
  } else {
    const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
    try { console.log(JSON.stringify(await importSitesDatabase(client, JSON.parse(readFileSync(input, "utf8"))))); }
    catch { console.error("Import failed. Existing account data was not overwritten. Check the destination and private export."); process.exitCode = 1; }
    finally { client.close(); }
  }
}

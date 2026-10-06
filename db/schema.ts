import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  usernameNormalized: text("username_normalized").notNull(),
  displayName: text("display_name").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordIterations: integer("password_iterations").notNull(),
  chatgptUserId: text("chatgpt_user_id"),
  chatgptDisplayName: text("chatgpt_display_name"),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_users_username_normalized").on(table.usernameNormalized),
  uniqueIndex("idx_users_chatgpt_user_id").on(table.chatgptUserId),
]);

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_sessions_user_id").on(table.userId),
  index("idx_sessions_expires_at").on(table.expiresAt),
]);

export const leaderboard = sqliteTable("leaderboard", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  bestScore: integer("best_score").notNull().default(0),
  bestPracticeScore: integer("best_practice_score").notNull().default(0),
  practiceGamesPlayed: integer("practice_games_played").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  achievedAt: text("achieved_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_leaderboard_rank").on(table.bestScore, table.achievedAt),
]);

export const classifiedSpecies = sqliteTable("classified_species", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  speciesId: text("species_id").notNull(),
  successCount: integer("success_count").notNull().default(1),
  minimum: integer("minimum", { mode: "boolean" }).notNull().default(true),
}, (table) => [
  primaryKey({ columns: [table.userId, table.speciesId] }),
]);

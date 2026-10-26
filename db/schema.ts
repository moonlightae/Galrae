import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  normalAttempts: integer("normal_attempts"),
  hasFailed: integer("has_failed", { mode: "boolean" }).notNull().default(false),
  practiceStarted: integer("practice_started", { mode: "boolean" }).notNull().default(false),
  practiceCompleted: integer("practice_completed", { mode: "boolean" }).notNull().default(false),
  fishSiblingMistake: integer("fish_sibling_mistake", { mode: "boolean" }).notNull().default(false),
  easyCompleted: integer("easy_completed", { mode: "boolean" }).notNull().default(false),
  mediumCompleted: integer("medium_completed", { mode: "boolean" }).notNull().default(false),
  hardCompleted: integer("hard_completed", { mode: "boolean" }).notNull().default(false),
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

export const plantProgress = sqliteTable("plant_progress", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  bestScore: integer("best_score").notNull().default(0),
  bestPracticeScore: integer("best_practice_score").notNull().default(0),
  normalAttempts: integer("normal_attempts").notNull().default(0),
  grassSiblingMistake: integer("grass_sibling_mistake", { mode: "boolean" }).notNull().default(false),
  hasFailed: integer("has_failed", { mode: "boolean" }).notNull().default(false),
  practiceStarted: integer("practice_started", { mode: "boolean" }).notNull().default(false),
  practiceCompleted: integer("practice_completed", { mode: "boolean" }).notNull().default(false),
  easyCompleted: integer("easy_completed", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const friendships = sqliteTable("friendships", {
  userA: text("user_a").notNull().references(() => users.id, { onDelete: "cascade" }),
  userB: text("user_b").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestedBy: text("requested_by").notNull(),
  accepted: integer("accepted", { mode: "boolean" }).notNull().default(false),
}, (table) => [primaryKey({ columns: [table.userA, table.userB] }), index("idx_friendships_user_b").on(table.userB),
  check("friend_pair_order", sql`${table.userA} < ${table.userB}`),
  check("friend_request_participant", sql`${table.requestedBy} IN (${table.userA}, ${table.userB})`),
]);

export const battles = sqliteTable("battles", {
  id: text("id").primaryKey(),
  hostId: text("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  guestId: text("guest_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kingdom: text("kingdom").notNull(),
  queue: text("queue").notNull(),
  classified: text("classified").notNull(),
  status: text("status").notNull().default("waiting"),
  revision: integer("revision").notNull().default(0),
  winnerId: text("winner_id"),
  reason: text("reason"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_battles_host").on(table.hostId), index("idx_battles_guest").on(table.guestId),
  check("battle_distinct_players", sql`${table.hostId} <> ${table.guestId}`),
  uniqueIndex("idx_battles_open_pair").on(sql`min(${table.hostId}, ${table.guestId})`, sql`max(${table.hostId}, ${table.guestId})`)
    .where(sql`${table.status} IN ('waiting', 'active')`),
]);

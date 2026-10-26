import { sql } from "drizzle-orm";
import { boolean, check, index, integer, primaryKey, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  usernameNormalized: text("username_normalized").notNull(),
  displayName: text("display_name").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordIterations: integer("password_iterations").notNull(),
  chatgptUserId: text("chatgpt_user_id"),
  chatgptDisplayName: text("chatgpt_display_name"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CAST(CURRENT_TIMESTAMP AS TEXT)`),
  updatedAt: text("updated_at").notNull().default(sql`CAST(CURRENT_TIMESTAMP AS TEXT)`),
}, (table) => [
  uniqueIndex("idx_users_username_normalized").on(table.usernameNormalized),
  uniqueIndex("idx_users_chatgpt_user_id").on(table.chatgptUserId),
]);

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CAST(CURRENT_TIMESTAMP AS TEXT)`),
}, (table) => [
  index("idx_sessions_user_id").on(table.userId),
  index("idx_sessions_expires_at").on(table.expiresAt),
]);

export const leaderboard = pgTable("leaderboard", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  bestScore: integer("best_score").notNull().default(0),
  bestPracticeScore: integer("best_practice_score").notNull().default(0),
  practiceGamesPlayed: integer("practice_games_played").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  normalAttempts: integer("normal_attempts"),
  hasFailed: boolean("has_failed").notNull().default(false),
  practiceStarted: boolean("practice_started").notNull().default(false),
  practiceCompleted: boolean("practice_completed").notNull().default(false),
  fishSiblingMistake: boolean("fish_sibling_mistake").notNull().default(false),
  easyCompleted: boolean("easy_completed").notNull().default(false),
  mediumCompleted: boolean("medium_completed").notNull().default(false),
  hardCompleted: boolean("hard_completed").notNull().default(false),
  achievedAt: text("achieved_at").notNull().default(sql`CAST(CURRENT_TIMESTAMP AS TEXT)`),
  updatedAt: text("updated_at").notNull().default(sql`CAST(CURRENT_TIMESTAMP AS TEXT)`),
}, (table) => [
  index("idx_leaderboard_rank").on(table.bestScore, table.achievedAt),
]);

export const classifiedSpecies = pgTable("classified_species", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  speciesId: text("species_id").notNull(),
  successCount: integer("success_count").notNull().default(1),
  minimum: boolean("minimum").notNull().default(true),
}, (table) => [
  primaryKey({ columns: [table.userId, table.speciesId] }),
]);

export const plantProgress = pgTable("plant_progress", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  bestScore: integer("best_score").notNull().default(0),
  bestPracticeScore: integer("best_practice_score").notNull().default(0),
  normalAttempts: integer("normal_attempts").notNull().default(0),
  grassSiblingMistake: boolean("grass_sibling_mistake").notNull().default(false),
  hasFailed: boolean("has_failed").notNull().default(false),
  practiceStarted: boolean("practice_started").notNull().default(false),
  practiceCompleted: boolean("practice_completed").notNull().default(false),
  easyCompleted: boolean("easy_completed").notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CAST(CURRENT_TIMESTAMP AS TEXT)`),
});

export const friendships = pgTable("friendships", {
  userA: text("user_a").notNull().references(() => users.id, { onDelete: "cascade" }),
  userB: text("user_b").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestedBy: text("requested_by").notNull(),
  accepted: boolean("accepted").notNull().default(false),
}, (table) => [primaryKey({ columns: [table.userA, table.userB] }), index("idx_friendships_user_b").on(table.userB),
  check("friend_pair_order", sql`${table.userA} < ${table.userB}`),
  check("friend_request_participant", sql`${table.requestedBy} IN (${table.userA}, ${table.userB})`),
]);

export const battles = pgTable("battles", {
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
  createdAt: text("created_at").notNull().default(sql`CAST(CURRENT_TIMESTAMP AS TEXT)`),
}, (table) => [index("idx_battles_host").on(table.hostId), index("idx_battles_guest").on(table.guestId),
  check("battle_distinct_players", sql`${table.hostId} <> ${table.guestId}`),
  uniqueIndex("idx_battles_open_pair").on(sql`least(${table.hostId}, ${table.guestId})`, sql`greatest(${table.hostId}, ${table.guestId})`)
    .where(sql`${table.status} IN ('waiting', 'active')`),
]);

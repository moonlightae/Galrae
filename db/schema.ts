import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const leaderboard = sqliteTable("leaderboard", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  bestScore: integer("best_score").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  achievedAt: text("achieved_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_leaderboard_rank").on(table.bestScore, table.achievedAt),
]);

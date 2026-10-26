CREATE TABLE "battles" (
	"id" text PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
	"guest_id" text NOT NULL,
	"kingdom" text NOT NULL,
	"queue" text NOT NULL,
	"classified" text NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"winner_id" text,
	"reason" text,
	"created_at" text DEFAULT CAST(CURRENT_TIMESTAMP AS TEXT) NOT NULL,
	CONSTRAINT "battle_distinct_players" CHECK ("battles"."host_id" <> "battles"."guest_id")
);
--> statement-breakpoint
CREATE TABLE "classified_species" (
	"user_id" text NOT NULL,
	"species_id" text NOT NULL,
	"success_count" integer DEFAULT 1 NOT NULL,
	"minimum" boolean DEFAULT true NOT NULL,
	CONSTRAINT "classified_species_user_id_species_id_pk" PRIMARY KEY("user_id","species_id")
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"user_a" text NOT NULL,
	"user_b" text NOT NULL,
	"requested_by" text NOT NULL,
	"accepted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "friendships_user_a_user_b_pk" PRIMARY KEY("user_a","user_b"),
	CONSTRAINT "friend_pair_order" CHECK ("friendships"."user_a" < "friendships"."user_b"),
	CONSTRAINT "friend_request_participant" CHECK ("friendships"."requested_by" IN ("friendships"."user_a", "friendships"."user_b"))
);
--> statement-breakpoint
CREATE TABLE "leaderboard" (
	"user_id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"best_score" integer DEFAULT 0 NOT NULL,
	"best_practice_score" integer DEFAULT 0 NOT NULL,
	"practice_games_played" integer DEFAULT 0 NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"normal_attempts" integer,
	"has_failed" boolean DEFAULT false NOT NULL,
	"practice_started" boolean DEFAULT false NOT NULL,
	"practice_completed" boolean DEFAULT false NOT NULL,
	"fish_sibling_mistake" boolean DEFAULT false NOT NULL,
	"easy_completed" boolean DEFAULT false NOT NULL,
	"medium_completed" boolean DEFAULT false NOT NULL,
	"hard_completed" boolean DEFAULT false NOT NULL,
	"achieved_at" text DEFAULT CAST(CURRENT_TIMESTAMP AS TEXT) NOT NULL,
	"updated_at" text DEFAULT CAST(CURRENT_TIMESTAMP AS TEXT) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_progress" (
	"user_id" text PRIMARY KEY NOT NULL,
	"best_score" integer DEFAULT 0 NOT NULL,
	"best_practice_score" integer DEFAULT 0 NOT NULL,
	"normal_attempts" integer DEFAULT 0 NOT NULL,
	"grass_sibling_mistake" boolean DEFAULT false NOT NULL,
	"has_failed" boolean DEFAULT false NOT NULL,
	"practice_started" boolean DEFAULT false NOT NULL,
	"practice_completed" boolean DEFAULT false NOT NULL,
	"easy_completed" boolean DEFAULT false NOT NULL,
	"updated_at" text DEFAULT CAST(CURRENT_TIMESTAMP AS TEXT) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" integer NOT NULL,
	"created_at" text DEFAULT CAST(CURRENT_TIMESTAMP AS TEXT) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"username_normalized" text NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"password_hash" text NOT NULL,
	"password_salt" text NOT NULL,
	"password_iterations" integer NOT NULL,
	"chatgpt_user_id" text,
	"chatgpt_display_name" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT CAST(CURRENT_TIMESTAMP AS TEXT) NOT NULL,
	"updated_at" text DEFAULT CAST(CURRENT_TIMESTAMP AS TEXT) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_guest_id_users_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classified_species" ADD CONSTRAINT "classified_species_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_a_users_id_fk" FOREIGN KEY ("user_a") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_b_users_id_fk" FOREIGN KEY ("user_b") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_progress" ADD CONSTRAINT "plant_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_battles_host" ON "battles" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "idx_battles_guest" ON "battles" USING btree ("guest_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_battles_open_pair" ON "battles" USING btree (least("host_id", "guest_id"),greatest("host_id", "guest_id")) WHERE "battles"."status" IN ('waiting', 'active');--> statement-breakpoint
CREATE INDEX "idx_friendships_user_b" ON "friendships" USING btree ("user_b");--> statement-breakpoint
CREATE INDEX "idx_leaderboard_rank" ON "leaderboard" USING btree ("best_score","achieved_at");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_expires_at" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_username_normalized" ON "users" USING btree ("username_normalized");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_chatgpt_user_id" ON "users" USING btree ("chatgpt_user_id");
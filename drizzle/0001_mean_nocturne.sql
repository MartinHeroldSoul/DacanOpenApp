CREATE TABLE "game_modes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"min_players_per_side" integer NOT NULL,
	"max_players_per_side" integer NOT NULL,
	CONSTRAINT "game_modes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hcp_policies" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"rules_json" jsonb,
	CONSTRAINT "hcp_policies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "match_participants" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"side" varchar(8) NOT NULL,
	"player_id" integer,
	"order_in_side" integer,
	"hcp_at_match" numeric(4, 1)
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"legacy_id" text,
	"season_id" integer,
	"round_id" integer,
	"course_id" integer,
	"stage" text,
	"status" varchar(20) DEFAULT 'not_started' NOT NULL,
	"result_text" text,
	"winner_side" varchar(8),
	"game_mode_id" integer,
	"scoring_mode_id" integer,
	"hcp_policy_id" integer,
	CONSTRAINT "matches_legacy_id_unique" UNIQUE("legacy_id")
);
--> statement-breakpoint
CREATE TABLE "round_schedule" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL,
	"day_number" integer NOT NULL,
	"course_id" integer,
	"default_game_mode_id" integer,
	"default_scoring_mode_id" integer,
	"default_hcp_policy_id" integer
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"hole_id" integer NOT NULL,
	"red_score" integer,
	"blue_score" integer,
	"red_net" integer,
	"blue_net" integer,
	"winner_side" varchar(8),
	"client_id" text,
	CONSTRAINT "scores_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "scoring_modes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"per_hole_result" integer NOT NULL,
	"rules_json" jsonb,
	CONSTRAINT "scoring_modes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
DROP TABLE "courses" CASCADE;--> statement-breakpoint
DROP TABLE "flights" CASCADE;--> statement-breakpoint
DROP TABLE "holes" CASCADE;--> statement-breakpoint
DROP TABLE "seasons" CASCADE;
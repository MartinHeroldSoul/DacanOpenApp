import { pgTable, bigserial, integer, varchar, text, numeric, jsonb } from "drizzle-orm/pg-core";

/** A) Rejstříky: typ hry, způsob skórování, HCP politika */
export const gameModes = pgTable("game_modes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  code: text("code").notNull().unique(),           // 'individual' | 'team' | 'group'
  name: text("name").notNull(),
  minPlayersPerSide: integer("min_players_per_side").notNull(),
  maxPlayersPerSide: integer("max_players_per_side").notNull(),
});

export const scoringModes = pgTable("scoring_modes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  code: text("code").notNull().unique(),           // 'match_play' | 'stroke_play' | 'stableford'
  name: text("name").notNull(),
  perHoleResult: integer("per_hole_result").notNull(), // 1=jamkovka, 0=ne
  rulesJson: jsonb("rules_json"),
});

export const hcpPolicies = pgTable("hcp_policies", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  code: text("code").notNull().unique(),           // 'gross' | 'net_dacan' | 'texas_share_3_8'
  name: text("name").notNull(),
  rulesJson: jsonb("rules_json"),
});

/** B) Day schedule s defaultní kombinací pro den/sezonu */
export const roundSchedule = pgTable("round_schedule", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  seasonId: integer("season_id").notNull(),
  dayNumber: integer("day_number").notNull(),
  courseId: integer("course_id"),
  defaultGameModeId: integer("default_game_mode_id"),
  defaultScoringModeId: integer("default_scoring_mode_id"),
  defaultHcpPolicyId: integer("default_hcp_policy_id"),
});

/** C) Matches – per zápas volby + status */
export const matches = pgTable("matches", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  legacyId: text("legacy_id").unique(),
  seasonId: integer("season_id"),
  roundId: integer("round_id"),
  courseId: integer("course_id"),
  stage: text("stage"),
  status: varchar("status", { length: 20 }).notNull().default("not_started"), // 'not_started'|'in_progress'|'finished'
  resultText: text("result_text"),
  winnerSide: varchar("winner_side", { length: 8 }),      // 'red' | 'blue'
  gameModeId: integer("game_mode_id"),
  scoringModeId: integer("scoring_mode_id"),
  hcpPolicyId: integer("hcp_policy_id"),
});

/** D) Účastníci – univerzálně pro 1v1 i 2v2, vč. snapshotu HCP */
export const matchParticipants = pgTable("match_participants", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  matchId: integer("match_id").notNull(),
  side: varchar("side", { length: 8 }).notNull(),         // 'red' | 'blue'
  playerId: integer("player_id"),
  orderInSide: integer("order_in_side"),                  // 1/2 u Texas
  hcpAtMatch: numeric("hcp_at_match", { precision: 4, scale: 1 }),
});

/** E) Skóre po jamkách + client_id pro offline sync */
export const scores = pgTable("scores", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  matchId: integer("match_id").notNull(),
  holeId: integer("hole_id").notNull(),
  redScore: integer("red_score"),
  blueScore: integer("blue_score"),
  redNet: integer("red_net"),
  blueNet: integer("blue_net"),
  winnerSide: varchar("winner_side", { length: 8 }),      // 'red' | 'blue' | 'as'
  clientId: text("client_id").unique(),
});
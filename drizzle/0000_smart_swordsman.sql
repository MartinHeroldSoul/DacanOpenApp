CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flights" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL,
	"day" integer NOT NULL,
	"number" integer NOT NULL,
	"tee_time" timestamp
);
--> statement-breakpoint
CREATE TABLE "holes" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"number" integer NOT NULL,
	"par" integer NOT NULL,
	"stroke_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"start_date" date,
	"end_date" date
);

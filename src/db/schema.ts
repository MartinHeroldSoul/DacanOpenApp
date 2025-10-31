import { pgTable, serial, integer, varchar, date, timestamp } from "drizzle-orm/pg-core";

export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
});

export const holes = pgTable("holes", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  number: integer("number").notNull(),            // 1..18
  par: integer("par").notNull(),                  // 3/4/5
  strokeIndex: integer("stroke_index").notNull(), // 1..18
});

export const flights = pgTable("flights", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull(),
  day: integer("day").notNull(),   // 1 = Texas, 2 = Singles
  number: integer("number").notNull(),
  teeTime: timestamp("tee_time"),
});
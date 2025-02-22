import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table and types
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  photoURL: text("photo_url"),
  uid: text("uid").notNull().unique()
});

// Match table and types
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  venue: text("venue").notNull(),
  date: timestamp("date").notNull(),
  league: text("league").notNull(),
  status: text("status").notNull(),
  assistantReferee1: text("assistant_referee_1"),
  assistantReferee2: text("assistant_referee_2")
});

// Referee table and types
export const referees = pgTable("referees", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  isAvailable: boolean("is_available").notNull().default(true)
});

// Export schemas
export const insertUserSchema = createInsertSchema(users);
export const insertMatchSchema = createInsertSchema(matches);
export const insertRefereeSchema = createInsertSchema(referees).extend({
  phone: z.string().regex(/^05\d{8}$/, "Phone number must be 10 digits and start with 05")
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;

export type Referee = typeof referees.$inferSelect;
export type InsertReferee = z.infer<typeof insertRefereeSchema>;
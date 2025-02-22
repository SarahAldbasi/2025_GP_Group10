import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table and types
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
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
  status: text("status").notNull()
});

// Referee table and types
export const referees = pgTable("referees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  isAvailable: boolean("is_available").notNull().default(true)
});

// Export schemas
export const insertUserSchema = createInsertSchema(users);
export const insertMatchSchema = createInsertSchema(matches);
export const insertRefereeSchema = createInsertSchema(referees);

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;

export type Referee = typeof referees.$inferSelect;
export type InsertReferee = z.infer<typeof insertRefereeSchema>;
import { pgTable, text, serial, boolean, timestamp, json } from "drizzle-orm/pg-core";
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
  mainReferee: text("main_referee").notNull(),
  assistantReferee1: text("assistant_referee_1"),
  assistantReferee2: text("assistant_referee_2")
});

// Referee table and types with verification status
export const referees = pgTable("referees", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  verificationStatus: text("verification_status").notNull().default('pending'), // pending, approved, rejected
  documentationUrl: text("documentation_url"), // URL to the uploaded documentation
});

// Referee Verification table and types
export const refereeVerifications = pgTable("referee_verifications", {
  id: serial("id").primaryKey(),
  refereeId: text("referee_id").notNull(),
  submissionDate: timestamp("submission_date").notNull().defaultNow(),
  documentationType: text("documentation_type").notNull(), // e.g., "license", "certificate"
  documentationData: json("documentation_data").notNull(), // Store any additional metadata
  status: text("status").notNull().default('pending'), // pending, approved, rejected
  reviewedBy: text("reviewed_by"), // Admin UID who reviewed the verification
  reviewDate: timestamp("review_date"),
  reviewNotes: text("review_notes"),
});

// Export schemas
export const insertUserSchema = createInsertSchema(users);
export const insertMatchSchema = createInsertSchema(matches).extend({
  date: z.coerce.date()
});
export const insertRefereeSchema = createInsertSchema(referees).extend({
  phone: z.string().regex(/^05\d{8}$/, "Phone number must be 10 digits and start with 05")
});
export const insertVerificationSchema = createInsertSchema(refereeVerifications).extend({
  documentationType: z.enum(['license', 'certificate', 'other']),
  documentationData: z.object({
    description: z.string(),
    fileType: z.string(),
    additionalNotes: z.string().optional()
  })
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;

export type Referee = typeof referees.$inferSelect;
export type InsertReferee = z.infer<typeof insertRefereeSchema>;

export type RefereeVerification = typeof refereeVerifications.$inferSelect;
export type InsertRefereeVerification = z.infer<typeof insertVerificationSchema>;
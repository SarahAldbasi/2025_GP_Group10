import { pgTable, text, serial, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table and types with role
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  photoURL: text("photo_url"),
  uid: text("uid").notNull().unique(),
  role: text("role").notNull(), // 'admin' or 'referee'
  phone: text("phone"),
  isAvailable: boolean("is_available").default(true),
  verificationStatus: text("verification_status").default('pending'), // pending, approved, rejected
  documentationUrl: text("documentation_url") // URL to the uploaded documentation
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

// Referee Verification table and types
export const refereeVerifications = pgTable("referee_verifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Changed from refereeId to userId
  submissionDate: timestamp("submission_date").notNull().defaultNow(),
  documentationType: text("documentation_type").notNull(),
  documentationData: json("documentation_data").notNull(),
  status: text("status").notNull().default('pending'),
  reviewedBy: text("reviewed_by"),
  reviewDate: timestamp("review_date"),
  reviewNotes: text("review_notes"),
});

// Export schemas
export const insertUserSchema = createInsertSchema(users).extend({
  role: z.enum(['admin', 'referee']),
  phone: z.string().regex(/^05\d{8}$/, "Phone number must be 10 digits and start with 05").optional(),
});

export const insertMatchSchema = createInsertSchema(matches).extend({
  date: z.coerce.date()
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

export type RefereeVerification = typeof refereeVerifications.$inferSelect;
export type InsertRefereeVerification = z.infer<typeof insertVerificationSchema>;
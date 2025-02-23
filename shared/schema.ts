import { z } from "zod";

// User types
export const insertUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  photoURL: z.string().nullable(),
  uid: z.string(),
  role: z.enum(['admin', 'referee']),
  phone: z.string().regex(/^05\d{8}$/, "Phone number must be 10 digits and start with 05").optional(),
  isAvailable: z.boolean().default(true),
  verificationStatus: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  documentationUrl: z.string().optional()
});

// Match types
export const insertMatchSchema = z.object({
  homeTeam: z.string(),
  awayTeam: z.string(),
  venue: z.string(),
  date: z.coerce.date(),
  league: z.string(),
  status: z.string(),
  mainReferee: z.string(),
  assistantReferee1: z.string().optional(),
  assistantReferee2: z.string().optional()
});

// Referee Verification types
export const insertVerificationSchema = z.object({
  userId: z.string(),
  submissionDate: z.coerce.date(),
  documentationType: z.enum(['license', 'certificate', 'other']),
  documentationData: z.object({
    description: z.string(),
    fileType: z.string(),
    additionalNotes: z.string().optional()
  }),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  reviewedBy: z.string().optional(),
  reviewDate: z.coerce.date().optional(),
  reviewNotes: z.string().optional()
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type InsertRefereeVerification = z.infer<typeof insertVerificationSchema>;
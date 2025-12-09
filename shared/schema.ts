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
  phoneNumber: z.string().regex(/^05\d{8}$/, "Phone number must be 10 digits and start with 05").optional(),
  isAvailable: z.boolean().default(true),
  verificationStatus: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  documentationUrl: z.string().optional()
});

// Match types

// Ball schema for individual ball selection
const ballSchema = z.object({
  ballId: z.string().min(1, 'Ball ID is required'),
  location: z.string().min(1, 'Location is required')
});

export const insertMatchSchema = z.object({
  venue: z.string(),
  date: z.coerce.date(),
  status: z.string(),
  league: z.string(),
  matchCode: z.string().optional(), // Sequential match code (auto-generated)
  createdAt: z.coerce.date().optional(), // Creation timestamp
  homeTeam: z.object({
    id: z.number().optional(), // API-Football team ID
    name: z.string(),
    logo: z.string().optional() // Allow any string (URL or Firebase storage path)
  }),
  awayTeam: z.object({
    id: z.number().optional(), // API-Football team ID
    name: z.string(),
    logo: z.string().optional() // Allow any string (URL or Firebase storage path)
  }),
  mainReferee: z.object({
    id: z.string(), // referee id
    name: z.string(),
    image: z.string().optional()
  }),
  assistantReferee1: z.object({
    id: z.string(), // referee id
    name: z.string(),
    image: z.string().optional()
  }).optional(),
  assistantReferee2: z.object({
    id: z.string(), // referee id
    name: z.string(),
    image: z.string().optional()
  }).optional(),
  balls: z.array(ballSchema).default([]), // Array of balls with their locations
  matchGoals: z.number().default(0).optional(), // Match goals count
  matchOuts: z.number().default(0).optional(), // Match outs count
  cornerViolations: z.number().default(0).optional() // Corner violations count
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
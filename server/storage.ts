import { users, matches, refereeVerifications, type User, type InsertUser, type Match, type InsertMatch, type RefereeVerification, type InsertRefereeVerification } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUsersByRole(role: 'admin' | 'referee'): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Match operations
  getMatches(): Promise<Match[]>;
  getMatch(id: number): Promise<Match | undefined>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: number, match: Partial<Match>): Promise<Match | undefined>;
  deleteMatch(id: number): Promise<boolean>;

  // Verification operations
  getVerifications(): Promise<RefereeVerification[]>;
  getPendingVerifications(): Promise<RefereeVerification[]>;
  getVerification(id: number): Promise<RefereeVerification | undefined>;
  createVerification(verification: InsertRefereeVerification): Promise<RefereeVerification>;
  updateVerification(id: number, verification: Partial<RefereeVerification>): Promise<RefereeVerification | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUsersByRole(role: 'admin' | 'referee'): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    return !!deleted;
  }

  // Match operations
  async getMatches(): Promise<Match[]> {
    return await db.select().from(matches);
  }

  async getMatch(id: number): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const [created] = await db.insert(matches).values(match).returning();
    return created;
  }

  async updateMatch(id: number, match: Partial<Match>): Promise<Match | undefined> {
    const [updated] = await db
      .update(matches)
      .set(match)
      .where(eq(matches.id, id))
      .returning();
    return updated;
  }

  async deleteMatch(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(matches)
      .where(eq(matches.id, id))
      .returning();
    return !!deleted;
  }

  // Verification operations
  async getVerifications(): Promise<RefereeVerification[]> {
    return await db.select().from(refereeVerifications);
  }

  async getPendingVerifications(): Promise<RefereeVerification[]> {
    return await db
      .select()
      .from(refereeVerifications)
      .where(eq(refereeVerifications.status, 'pending'));
  }

  async getVerification(id: number): Promise<RefereeVerification | undefined> {
    const [verification] = await db
      .select()
      .from(refereeVerifications)
      .where(eq(refereeVerifications.id, id));
    return verification;
  }

  async createVerification(verification: InsertRefereeVerification): Promise<RefereeVerification> {
    const [created] = await db
      .insert(refereeVerifications)
      .values(verification)
      .returning();
    return created;
  }

  async updateVerification(id: number, verification: Partial<RefereeVerification>): Promise<RefereeVerification | undefined> {
    const [updated] = await db
      .update(refereeVerifications)
      .set(verification)
      .where(eq(refereeVerifications.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
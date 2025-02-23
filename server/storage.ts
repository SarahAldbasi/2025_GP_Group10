import { referees, matches, refereeVerifications, type Referee, type InsertReferee, type Match, type InsertMatch, type RefereeVerification, type InsertRefereeVerification } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Referee operations
  getReferees(): Promise<Referee[]>;
  getReferee(id: number): Promise<Referee | undefined>;
  createReferee(referee: InsertReferee): Promise<Referee>;
  updateReferee(id: number, referee: Partial<Referee>): Promise<Referee | undefined>;
  deleteReferee(id: number): Promise<boolean>;

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
  // Existing Referee operations
  async getReferees(): Promise<Referee[]> {
    return await db.select().from(referees);
  }

  async getReferee(id: number): Promise<Referee | undefined> {
    const [referee] = await db.select().from(referees).where(eq(referees.id, id));
    return referee;
  }

  async createReferee(referee: InsertReferee): Promise<Referee> {
    const [created] = await db.insert(referees).values(referee).returning();
    return created;
  }

  async updateReferee(id: number, referee: Partial<Referee>): Promise<Referee | undefined> {
    const [updated] = await db
      .update(referees)
      .set(referee)
      .where(eq(referees.id, id))
      .returning();
    return updated;
  }

  async deleteReferee(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(referees)
      .where(eq(referees.id, id))
      .returning();
    return !!deleted;
  }

  // Existing Match operations
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

  // New Verification operations
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
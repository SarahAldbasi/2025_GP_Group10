import { referees, matches, type Referee, type InsertReferee, type Match, type InsertMatch } from "@shared/schema";
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
}

export class DatabaseStorage implements IStorage {
  // Referee operations
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
}

export const storage = new DatabaseStorage();
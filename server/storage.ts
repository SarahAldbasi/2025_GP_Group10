import { type User, type InsertUser } from "@shared/schema";

export interface IStorage {
  getUser(uid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(uid: string, user: InsertUser): Promise<User | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(uid: string): Promise<User | undefined> {
    return this.users.get(uid);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = { ...insertUser };
    this.users.set(user.uid, user);
    return user;
  }

  async updateUser(uid: string, insertUser: InsertUser): Promise<User | undefined> {
    if (!this.users.has(uid)) return undefined;
    const user: User = { ...insertUser };
    this.users.set(uid, user);
    return user;
  }
}

export const storage = new MemStorage();
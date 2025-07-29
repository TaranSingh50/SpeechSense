import {
  users,
  authTokens,
  audioFiles,
  speechAnalyses,
  reports,
  type User,
  type UpsertUser,
  type InsertUser,
  type AuthToken,
  type InsertAuthToken,
  type AudioFile,
  type InsertAudioFile,
  type SpeechAnalysis,
  type InsertSpeechAnalysis,
  type Report,
  type InsertReport,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lt } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  
  // Authentication token operations
  createAuthToken(token: InsertAuthToken): Promise<AuthToken>;
  getAuthToken(token: string): Promise<AuthToken | undefined>;
  getTokensByUserId(userId: string, type?: string): Promise<AuthToken[]>;
  deleteAuthToken(token: string): Promise<void>;
  deleteExpiredTokens(): Promise<void>;
  
  // Audio file operations
  createAudioFile(audioFile: InsertAudioFile): Promise<AudioFile>;
  getAudioFile(id: string): Promise<AudioFile | undefined>;
  getUserAudioFiles(userId: string): Promise<AudioFile[]>;
  deleteAudioFile(id: string): Promise<void>;
  
  // Speech analysis operations
  createSpeechAnalysis(analysis: InsertSpeechAnalysis): Promise<SpeechAnalysis>;
  getSpeechAnalysis(id: string): Promise<SpeechAnalysis | undefined>;
  updateSpeechAnalysis(id: string, updates: Partial<SpeechAnalysis>): Promise<SpeechAnalysis>;
  getUserAnalyses(userId: string): Promise<SpeechAnalysis[]>;
  
  // Report operations
  createReport(report: InsertReport): Promise<Report>;
  getReport(id: string): Promise<Report | undefined>;
  getUserReports(userId: string): Promise<Report[]>;
  updateReport(id: string, updates: Partial<Report>): Promise<Report>;
  deleteReport(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Authentication token operations
  async createAuthToken(tokenData: InsertAuthToken): Promise<AuthToken> {
    const [token] = await db.insert(authTokens).values(tokenData).returning();
    return token;
  }

  async getAuthToken(token: string): Promise<AuthToken | undefined> {
    const [authToken] = await db
      .select()
      .from(authTokens)
      .where(and(eq(authTokens.token, token), lt(new Date(), authTokens.expiresAt)));
    return authToken;
  }

  async getTokensByUserId(userId: string, type?: string): Promise<AuthToken[]> {
    const conditions = [eq(authTokens.userId, userId)];
    if (type) {
      conditions.push(eq(authTokens.type, type));
    }
    
    return await db
      .select()
      .from(authTokens)
      .where(and(...conditions))
      .orderBy(desc(authTokens.createdAt));
  }

  async deleteAuthToken(token: string): Promise<void> {
    await db.delete(authTokens).where(eq(authTokens.token, token));
  }

  async deleteExpiredTokens(): Promise<void> {
    await db.delete(authTokens).where(lt(authTokens.expiresAt, new Date()));
  }

  // Audio file operations
  async createAudioFile(audioFile: InsertAudioFile): Promise<AudioFile> {
    const [file] = await db.insert(audioFiles).values(audioFile).returning();
    return file;
  }

  async getAudioFile(id: string): Promise<AudioFile | undefined> {
    const [file] = await db.select().from(audioFiles).where(eq(audioFiles.id, id));
    return file;
  }

  async getUserAudioFiles(userId: string): Promise<AudioFile[]> {
    return await db
      .select()
      .from(audioFiles)
      .where(eq(audioFiles.userId, userId))
      .orderBy(desc(audioFiles.createdAt));
  }

  async deleteAudioFile(id: string): Promise<void> {
    await db.delete(audioFiles).where(eq(audioFiles.id, id));
  }

  // Speech analysis operations
  async createSpeechAnalysis(analysis: InsertSpeechAnalysis): Promise<SpeechAnalysis> {
    const [result] = await db.insert(speechAnalyses).values(analysis).returning();
    return result;
  }

  async getSpeechAnalysis(id: string): Promise<SpeechAnalysis | undefined> {
    const [analysis] = await db.select().from(speechAnalyses).where(eq(speechAnalyses.id, id));
    return analysis;
  }

  async updateSpeechAnalysis(id: string, updates: Partial<SpeechAnalysis>): Promise<SpeechAnalysis> {
    const [analysis] = await db
      .update(speechAnalyses)
      .set(updates)
      .where(eq(speechAnalyses.id, id))
      .returning();
    return analysis;
  }

  async getUserAnalyses(userId: string): Promise<SpeechAnalysis[]> {
    return await db
      .select()
      .from(speechAnalyses)
      .where(eq(speechAnalyses.userId, userId))
      .orderBy(desc(speechAnalyses.createdAt));
  }

  // Report operations
  async createReport(report: InsertReport): Promise<Report> {
    const [result] = await db.insert(reports).values(report).returning();
    return result;
  }

  async getReport(id: string): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }

  async getUserReports(userId: string): Promise<Report[]> {
    return await db
      .select()
      .from(reports)
      .where(eq(reports.userId, userId))
      .orderBy(desc(reports.createdAt));
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report> {
    const [report] = await db
      .update(reports)
      .set(updates)
      .where(eq(reports.id, id))
      .returning();
    return report;
  }

  async deleteReport(id: string): Promise<void> {
    await db.delete(reports).where(eq(reports.id, id));
  }
}

export const storage = new DatabaseStorage();

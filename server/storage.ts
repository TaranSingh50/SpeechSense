import {
  users,
  audioFiles,
  speechAnalyses,
  reports,
  type User,
  type UpsertUser,
  type AudioFile,
  type InsertAudioFile,
  type SpeechAnalysis,
  type InsertSpeechAnalysis,
  type Report,
  type InsertReport,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
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

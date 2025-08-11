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
  upsertUser(userData: Partial<User> & { id: string; email: string }): Promise<User>;
  
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
    if (!db) throw new Error('Database not initialized');
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!db) throw new Error('Database not initialized');
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    if (!db) throw new Error('Database not initialized');
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    if (!db) throw new Error('Database not initialized');
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async upsertUser(userData: Partial<User> & { id: string; email: string }): Promise<User> {
    const existingUser = await this.getUser(userData.id);
    if (existingUser) {
      return await this.updateUser(userData.id, userData);
    } else {
      return await this.createUser({
        id: userData.id,
        email: userData.email,
        password: '', // Empty password for OAuth users
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        accountType: userData.accountType || 'patient',
        isEmailVerified: true, // OAuth users are pre-verified
      });
    }
  }

  // Authentication token operations
  async createAuthToken(tokenData: InsertAuthToken): Promise<AuthToken> {
    if (!db) throw new Error('Database not initialized');
    const [token] = await db.insert(authTokens).values(tokenData).returning();
    return token;
  }

  async getAuthToken(token: string): Promise<AuthToken | undefined> {
    if (!db) throw new Error('Database not initialized');
    const now = new Date();
    const [authToken] = await db
      .select()
      .from(authTokens)
      .where(and(eq(authTokens.token, token), lt(authTokens.expiresAt, now)));
    return authToken;
  }

  async getTokensByUserId(userId: string, type?: string): Promise<AuthToken[]> {
    if (!db) throw new Error('Database not initialized');
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
    if (!db) throw new Error('Database not initialized');
    await db.delete(authTokens).where(eq(authTokens.token, token));
  }

  async deleteExpiredTokens(): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    const now = new Date();
    await db.delete(authTokens).where(lt(authTokens.expiresAt, now));
  }

  // Audio file operations
  async createAudioFile(audioFile: InsertAudioFile): Promise<AudioFile> {
    if (!db) throw new Error('Database not initialized');
    const [file] = await db.insert(audioFiles).values(audioFile).returning();
    return file;
  }

  async getAudioFile(id: string): Promise<AudioFile | undefined> {
    if (!db) throw new Error('Database not initialized');
    const [file] = await db.select().from(audioFiles).where(eq(audioFiles.id, id));
    return file;
  }

  async getUserAudioFiles(userId: string): Promise<AudioFile[]> {
    if (!db) throw new Error('Database not initialized');
    return await db
      .select()
      .from(audioFiles)
      .where(eq(audioFiles.userId, userId))
      .orderBy(desc(audioFiles.createdAt));
  }

  async deleteAudioFile(id: string): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    await db.delete(audioFiles).where(eq(audioFiles.id, id));
  }

  // Speech analysis operations
  async createSpeechAnalysis(analysis: InsertSpeechAnalysis): Promise<SpeechAnalysis> {
    if (!db) throw new Error('Database not initialized');
    const [result] = await db.insert(speechAnalyses).values(analysis).returning();
    return result;
  }

  async getSpeechAnalysis(id: string): Promise<SpeechAnalysis | undefined> {
    if (!db) throw new Error('Database not initialized');
    const [analysis] = await db.select().from(speechAnalyses).where(eq(speechAnalyses.id, id));
    return analysis;
  }

  async updateSpeechAnalysis(id: string, updates: Partial<SpeechAnalysis>): Promise<SpeechAnalysis> {
    if (!db) throw new Error('Database not initialized');
    const [analysis] = await db
      .update(speechAnalyses)
      .set(updates)
      .where(eq(speechAnalyses.id, id))
      .returning();
    return analysis;
  }

  async getUserAnalyses(userId: string): Promise<SpeechAnalysis[]> {
    if (!db) throw new Error('Database not initialized');
    return await db
      .select()
      .from(speechAnalyses)
      .where(eq(speechAnalyses.userId, userId))
      .orderBy(desc(speechAnalyses.createdAt));
  }

  // Report operations
  async createReport(report: InsertReport): Promise<Report> {
    if (!db) throw new Error('Database not initialized');
    const [result] = await db.insert(reports).values(report).returning();
    return result;
  }

  async getReport(id: string): Promise<Report | undefined> {
    if (!db) throw new Error('Database not initialized');
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }

  async getUserReports(userId: string): Promise<Report[]> {
    if (!db) throw new Error('Database not initialized');
    return await db
      .select()
      .from(reports)
      .where(eq(reports.userId, userId))
      .orderBy(desc(reports.createdAt));
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report> {
    if (!db) throw new Error('Database not initialized');
    const [report] = await db
      .update(reports)
      .set(updates)
      .where(eq(reports.id, id))
      .returning();
    return report;
  }

  async deleteReport(id: string): Promise<void> {
    if (!db) throw new Error('Database not initialized');
    await db.delete(reports).where(eq(reports.id, id));
  }
}

// Temporary in-memory storage implementation to handle database connectivity issues
export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private usersByEmail: Map<string, User> = new Map();
  private authTokens: Map<string, AuthToken> = new Map();
  private audioFiles: Map<string, AudioFile> = new Map();
  private speechAnalyses: Map<string, SpeechAnalysis> = new Map();
  private reports: Map<string, Report> = new Map();

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.usersByEmail.get(email);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user: User = {
      id,
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      accountType: userData.accountType || 'patient',
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    this.usersByEmail.set(userData.email, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    this.usersByEmail.set(updatedUser.email, updatedUser);
    return updatedUser;
  }

  async upsertUser(userData: Partial<User> & { id: string; email: string }): Promise<User> {
    const existingUser = this.users.get(userData.id);
    if (existingUser) {
      return await this.updateUser(userData.id, userData);
    } else {
      return await this.createUser({
        id: userData.id,
        email: userData.email,
        password: '', // Empty password for OAuth users
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        accountType: userData.accountType || 'patient',
        isEmailVerified: true, // OAuth users are pre-verified
      });
    }
  }

  // Authentication token operations
  async createAuthToken(tokenData: InsertAuthToken): Promise<AuthToken> {
    const id = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const authToken: AuthToken = {
      id,
      ...tokenData,
      createdAt: new Date(),
    };
    this.authTokens.set(tokenData.token, authToken);
    return authToken;
  }

  async getAuthToken(token: string): Promise<AuthToken | undefined> {
    const authToken = this.authTokens.get(token);
    if (authToken && authToken.expiresAt > new Date()) {
      return authToken;
    }
    return undefined;
  }

  async getTokensByUserId(userId: string, type?: string): Promise<AuthToken[]> {
    return Array.from(this.authTokens.values()).filter(
      token => token.userId === userId && (!type || token.type === type)
    );
  }

  async deleteAuthToken(token: string): Promise<void> {
    this.authTokens.delete(token);
  }

  async deleteExpiredTokens(): Promise<void> {
    const now = new Date();
    const tokensToDelete: string[] = [];
    this.authTokens.forEach((authToken, token) => {
      if (authToken.expiresAt <= now) {
        tokensToDelete.push(token);
      }
    });
    tokensToDelete.forEach(token => this.authTokens.delete(token));
  }

  // Audio file operations
  async createAudioFile(audioFileData: InsertAudioFile): Promise<AudioFile> {
    const id = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const audioFile: AudioFile = {
      id,
      ...audioFileData,
      duration: audioFileData.duration || null,
      createdAt: new Date(),
    };
    this.audioFiles.set(id, audioFile);
    return audioFile;
  }

  async getAudioFile(id: string): Promise<AudioFile | undefined> {
    return this.audioFiles.get(id);
  }

  async getUserAudioFiles(userId: string): Promise<AudioFile[]> {
    return Array.from(this.audioFiles.values())
      .filter(file => file.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async deleteAudioFile(id: string): Promise<void> {
    this.audioFiles.delete(id);
  }

  // Speech analysis operations
  async createSpeechAnalysis(analysisData: InsertSpeechAnalysis): Promise<SpeechAnalysis> {
    const id = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const analysis: SpeechAnalysis = {
      id,
      audioFileId: analysisData.audioFileId,
      userId: analysisData.userId,
      status: analysisData.status || 'pending',
      fluencyScore: analysisData.fluencyScore || null,
      stutteringEvents: analysisData.stutteringEvents || null,
      speechRate: analysisData.speechRate || null,
      averagePauseDuration: analysisData.averagePauseDuration || null,
      confidenceLevel: analysisData.confidenceLevel || null,
      detectedEvents: analysisData.detectedEvents || null,
      analysisResults: analysisData.analysisResults || null,
      createdAt: new Date(),
      completedAt: null,
    };
    this.speechAnalyses.set(id, analysis);
    return analysis;
  }

  async getSpeechAnalysis(id: string): Promise<SpeechAnalysis | undefined> {
    return this.speechAnalyses.get(id);
  }

  async updateSpeechAnalysis(id: string, updates: Partial<SpeechAnalysis>): Promise<SpeechAnalysis> {
    const analysis = this.speechAnalyses.get(id);
    if (!analysis) throw new Error("Speech analysis not found");
    
    const updatedAnalysis = { ...analysis, ...updates };
    this.speechAnalyses.set(id, updatedAnalysis);
    return updatedAnalysis;
  }

  async getUserAnalyses(userId: string): Promise<SpeechAnalysis[]> {
    return Array.from(this.speechAnalyses.values())
      .filter(analysis => analysis.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // Report operations
  async createReport(reportData: InsertReport): Promise<Report> {
    const id = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const report: Report = {
      id,
      userId: '',
      analysisId: reportData.analysisId,
      patientId: reportData.patientId || null,
      title: reportData.title,
      reportType: reportData.reportType,
      content: reportData.content,
      includeSections: reportData.includeSections,
      pdfPath: reportData.pdfPath || null,
      isShared: reportData.isShared || false,
      createdAt: new Date(),
    };
    this.reports.set(id, report);
    return report;
  }

  async getReport(id: string): Promise<Report | undefined> {
    return this.reports.get(id);
  }

  async getUserReports(userId: string): Promise<Report[]> {
    return Array.from(this.reports.values())
      .filter(report => report.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report> {
    const report = this.reports.get(id);
    if (!report) throw new Error("Report not found");
    
    const updatedReport = { ...report, ...updates };
    this.reports.set(id, updatedReport);
    return updatedReport;
  }

  async deleteReport(id: string): Promise<void> {
    this.reports.delete(id);
  }
}

// Use in-memory storage for development (fallback when DATABASE_URL is not available)
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();

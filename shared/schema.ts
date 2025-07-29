import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  real,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  accountType: varchar("account_type").notNull().default("patient"), // therapist or patient
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audio files table
export const audioFiles = pgTable("audio_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  duration: real("duration"), // in seconds
  mimeType: varchar("mime_type").notNull(),
  filePath: varchar("file_path").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Speech analyses table
export const speechAnalyses = pgTable("speech_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  audioFileId: varchar("audio_file_id").notNull().references(() => audioFiles.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default("pending"), // pending, processing, completed, failed
  fluencyScore: real("fluency_score"),
  stutteringEvents: integer("stuttering_events"),
  speechRate: real("speech_rate"), // words per minute
  averagePauseDuration: real("average_pause_duration"),
  confidenceLevel: real("confidence_level"),
  detectedEvents: jsonb("detected_events"), // array of event objects
  analysisResults: jsonb("analysis_results"), // detailed analysis data
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Reports table
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  analysisId: varchar("analysis_id").notNull().references(() => speechAnalyses.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  patientId: varchar("patient_id").references(() => users.id),
  title: varchar("title").notNull(),
  reportType: varchar("report_type").notNull(), // comprehensive, progress, treatment
  content: jsonb("content").notNull(),
  includeSections: jsonb("include_sections").notNull(), // array of section names
  pdfPath: varchar("pdf_path"),
  isShared: boolean("is_shared").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  audioFiles: many(audioFiles),
  speechAnalyses: many(speechAnalyses),
  reports: many(reports),
  patientReports: many(reports, { relationName: "patientReports" }),
}));

export const audioFilesRelations = relations(audioFiles, ({ one, many }) => ({
  user: one(users, {
    fields: [audioFiles.userId],
    references: [users.id],
  }),
  speechAnalyses: many(speechAnalyses),
}));

export const speechAnalysesRelations = relations(speechAnalyses, ({ one, many }) => ({
  audioFile: one(audioFiles, {
    fields: [speechAnalyses.audioFileId],
    references: [audioFiles.id],
  }),
  user: one(users, {
    fields: [speechAnalyses.userId],
    references: [users.id],
  }),
  reports: many(reports),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  analysis: one(speechAnalyses, {
    fields: [reports.analysisId],
    references: [speechAnalyses.id],
  }),
  user: one(users, {
    fields: [reports.userId],
    references: [users.id],
  }),
  patient: one(users, {
    fields: [reports.patientId],
    references: [users.id],
    relationName: "patientReports",
  }),
}));

// Insert schemas  
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  passwordResetToken: true,
  passwordResetExpires: true,
});

export const loginUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerUserSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertAudioFileSchema = createInsertSchema(audioFiles).omit({
  id: true,
  createdAt: true,
});

export const insertSpeechAnalysisSchema = createInsertSchema(speechAnalyses).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;

export type AudioFile = typeof audioFiles.$inferSelect;
export type InsertAudioFile = z.infer<typeof insertAudioFileSchema>;

export type SpeechAnalysis = typeof speechAnalyses.$inferSelect;
export type InsertSpeechAnalysis = z.infer<typeof insertSpeechAnalysisSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

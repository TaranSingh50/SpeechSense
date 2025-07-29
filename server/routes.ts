import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertAudioFileSchema, insertSpeechAnalysisSchema, insertReportSchema } from "@shared/schema";
import { z } from "zod";

// Configure multer for audio file uploads
const upload = multer({
  dest: "uploads/audio",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only MP3, WAV, and M4A files are allowed."));
    }
  },
});

// Basic speech analysis simulation (replace with actual AI service)
async function performSpeechAnalysis(audioFilePath: string, duration: number) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock analysis results - replace with actual AI analysis
  const mockResults = {
    fluencyScore: Math.random() * 3 + 7, // 7-10 range
    stutteringEvents: Math.floor(Math.random() * 15) + 5,
    speechRate: Math.random() * 50 + 120, // 120-170 WPM
    averagePauseDuration: Math.random() * 2 + 1,
    confidenceLevel: Math.random() * 0.2 + 0.8, // 80-100%
    detectedEvents: [
      { timestamp: "00:23", type: "Repetition", duration: 0.8 },
      { timestamp: "01:07", type: "Prolongation", duration: 1.2 },
      { timestamp: "02:45", type: "Block", duration: 2.1 },
    ],
  };
  
  return mockResults;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Ensure upload directory exists
  const uploadDir = path.join(process.cwd(), "uploads", "audio");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Audio File Routes
  app.post('/api/audio/upload', isAuthenticated, upload.single('audio'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const userId = req.user.claims.sub;
      const audioFile = await storage.createAudioFile({
        userId,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        filePath: req.file.path,
        duration: null, // Would be calculated from actual audio file
      });

      res.json(audioFile);
    } catch (error) {
      console.error("Error uploading audio file:", error);
      res.status(500).json({ message: "Failed to upload audio file" });
    }
  });

  app.get('/api/audio', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const audioFiles = await storage.getUserAudioFiles(userId);
      res.json(audioFiles);
    } catch (error) {
      console.error("Error fetching audio files:", error);
      res.status(500).json({ message: "Failed to fetch audio files" });
    }
  });

  app.delete('/api/audio/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const audioFile = await storage.getAudioFile(req.params.id);
      
      if (!audioFile || audioFile.userId !== userId) {
        return res.status(404).json({ message: "Audio file not found" });
      }

      // Delete physical file
      if (fs.existsSync(audioFile.filePath)) {
        fs.unlinkSync(audioFile.filePath);
      }

      await storage.deleteAudioFile(req.params.id);
      res.json({ message: "Audio file deleted successfully" });
    } catch (error) {
      console.error("Error deleting audio file:", error);
      res.status(500).json({ message: "Failed to delete audio file" });
    }
  });

  // Speech Analysis Routes
  app.post('/api/analysis', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { audioFileId } = req.body;

      if (!audioFileId) {
        return res.status(400).json({ message: "Audio file ID is required" });
      }

      const audioFile = await storage.getAudioFile(audioFileId);
      if (!audioFile || audioFile.userId !== userId) {
        return res.status(404).json({ message: "Audio file not found" });
      }

      // Create analysis record
      const analysis = await storage.createSpeechAnalysis({
        audioFileId,
        userId,
        status: "processing",
      });

      // Start analysis in background
      performSpeechAnalysis(audioFile.filePath, audioFile.duration || 0)
        .then(async (results) => {
          await storage.updateSpeechAnalysis(analysis.id, {
            status: "completed",
            fluencyScore: results.fluencyScore,
            stutteringEvents: results.stutteringEvents,
            speechRate: results.speechRate,
            averagePauseDuration: results.averagePauseDuration,
            confidenceLevel: results.confidenceLevel,
            detectedEvents: results.detectedEvents,
            analysisResults: results,
            completedAt: new Date(),
          });
        })
        .catch(async (error) => {
          console.error("Analysis failed:", error);
          await storage.updateSpeechAnalysis(analysis.id, {
            status: "failed",
          });
        });

      res.json(analysis);
    } catch (error) {
      console.error("Error starting analysis:", error);
      res.status(500).json({ message: "Failed to start analysis" });
    }
  });

  app.get('/api/analysis', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analyses = await storage.getUserAnalyses(userId);
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching analyses:", error);
      res.status(500).json({ message: "Failed to fetch analyses" });
    }
  });

  app.get('/api/analysis/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analysis = await storage.getSpeechAnalysis(req.params.id);
      
      if (!analysis || analysis.userId !== userId) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      res.json(analysis);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ message: "Failed to fetch analysis" });
    }
  });

  // Report Routes
  app.post('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reportData = insertReportSchema.parse(req.body);

      const report = await storage.createReport({
        ...reportData,
        userId,
      });

      res.json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid report data", errors: error.errors });
      }
      console.error("Error creating report:", error);
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  app.get('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reports = await storage.getUserReports(userId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get('/api/reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const report = await storage.getReport(req.params.id);
      
      if (!report || report.userId !== userId) {
        return res.status(404).json({ message: "Report not found" });
      }

      res.json(report);
    } catch (error) {
      console.error("Error fetching report:", error);
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const [audioFiles, analyses, reports] = await Promise.all([
        storage.getUserAudioFiles(userId),
        storage.getUserAnalyses(userId),
        storage.getUserReports(userId),
      ]);

      const completedAnalyses = analyses.filter(a => a.status === 'completed');
      const stats = {
        totalSessions: audioFiles.length,
        activePatients: 1, // For now, just the current user
        analysisComplete: completedAnalyses.length > 0 ? Math.round((completedAnalyses.length / analyses.length) * 100) : 0,
        reportsGenerated: reports.length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

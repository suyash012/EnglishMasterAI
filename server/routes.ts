import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertTestResultSchema, insertTestSubmissionSchema } from "@shared/schema";
import { transcribeAudio, analyzeSpeechWithLeMUR } from "./assemblyai";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

// Configure multer for memory storage
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, "../uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      cb(null, `${uuidv4()}.webm`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize with test prompts
  await initializeTestPrompts();

  // Get test prompts
  app.get("/api/prompts", async (req, res) => {
    try {
      const prompts = await storage.getAllPrompts();
      res.json(prompts);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Failed to get prompts: ${errorMessage}` });
    }
  });

  // Submit audio for transcription and analysis
  app.post("/api/submit-audio", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file uploaded" });
      }

      // Get prompt ID from request
      const promptId = Number(req.body.promptId);
      if (isNaN(promptId)) {
        return res.status(400).json({ message: "Invalid prompt ID" });
      }

      // Get the prompt
      const prompt = await storage.getPrompt(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      // Get the audio file path
      const audioPath = req.file.path;

      try {
        // Transcribe the audio
        const transcript = await transcribeAudio(audioPath);

        // Check if we should perform direct analysis
        const shouldAnalyze = req.body.analyze === 'true';
        
        if (shouldAnalyze) {
          // Analyze the audio directly with AssemblyAI
          const evaluation = await analyzeSpeechWithLeMUR(audioPath, prompt.prompt);
          
          // Return the transcript and evaluation
          return res.json({
            transcript,
            evaluation: {
              overallScore: evaluation.overall,
              vocabularyScore: evaluation.vocabulary,
              grammarScore: evaluation.grammar,
              fluencyScore: evaluation.fluency || evaluation.pronunciation, // Fallback if fluency is not provided
              pronunciationScore: evaluation.pronunciation || evaluation.fluency, // Fallback if pronunciation is not provided
              strengths: evaluation.strengths,
              improvements: evaluation.weaknesses,
              recommendations: [
                "Practice speaking regularly", 
                "Listen to native speakers", 
                "Join language exchange programs"
              ],
              feedback: evaluation.feedback
            }
          });
        }

        // Just return the transcript if no analysis was requested
        return res.json({ transcript });
      } finally {
        // Cleanup the audio file
        try {
          if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
          }
        } catch (cleanupError) {
          console.error("Error cleaning up audio file:", cleanupError);
          // We don't want to fail the request if cleanup fails
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Failed to process audio: ${errorMessage}` });
    }
  });

  // Evaluate spoken English
  app.post("/api/evaluate", async (req, res) => {
    try {
      const { transcript, promptId, audioFilePath } = req.body;
      
      // Get the prompt
      const prompt = await storage.getPrompt(Number(promptId));
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      // If audio file path is provided, use direct analysis with AssemblyAI
      if (audioFilePath) {
        const evaluation = await analyzeSpeechWithLeMUR(audioFilePath, prompt.prompt);
        return res.json({
          overallScore: evaluation.overall,
          vocabularyScore: evaluation.vocabulary,
          grammarScore: evaluation.grammar,
          fluencyScore: evaluation.fluency || evaluation.pronunciation,
          pronunciationScore: evaluation.pronunciation || evaluation.fluency,
          strengths: evaluation.strengths,
          improvements: evaluation.weaknesses,
          recommendations: ["Practice speaking regularly", "Listen to native speakers", "Join language exchange programs"],
          feedback: evaluation.feedback
        });
      } 
      
      // If only transcript is provided (this is a fallback option)
      if (!transcript) {
        return res.status(400).json({ message: "Either transcript or audio file path is required" });
      }
      
      // Simulate evaluation with basic scoring (this should be replaced with a proper evaluation)
      const scores = {
        overallScore: 75,
        vocabularyScore: 70,
        grammarScore: 80,
        fluencyScore: 75,
        pronunciationScore: 75,
        strengths: ["Good use of vocabulary", "Clear sentence structure", "Effective communication of ideas"],
        improvements: ["Work on fluency", "Expand advanced vocabulary", "Practice complex grammar structures"],
        recommendations: ["Practice speaking regularly", "Listen to native speakers", "Join language exchange programs"],
        feedback: "Your English shows good foundational skills. Continue practicing to improve fluency and expand your vocabulary."
      };
      
      res.json(scores);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Failed to evaluate: ${errorMessage}` });
    }
  });

  // Submit test results
  app.post("/api/submit-test-results", async (req, res) => {
    try {
      const testResultData = insertTestResultSchema.parse(req.body);
      const testResult = await storage.createTestResult(testResultData);
      res.json(testResult);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Failed to submit test results: ${errorMessage}` });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

// Initialize test prompts if none exist
async function initializeTestPrompts() {
  const existingPrompts = await storage.getAllPrompts();
  
  if (existingPrompts.length === 0) {
    const defaultPrompts = [
      {
        type: "speaking",
        prompt: "Describe your favorite place to visit and explain why you enjoy going there.",
        difficulty: "intermediate",
        tips: [
          "What this place is and where it's located",
          "What activities you can do there",
          "Why it's special to you or what memories you have of it"
        ]
      },
      {
        type: "speaking",
        prompt: "Talk about a skill you would like to learn and why it interests you.",
        difficulty: "intermediate",
        tips: [
          "What the skill is and why you want to learn it",
          "How you plan to learn this skill",
          "How you think this skill will benefit you in the future"
        ]
      },
      {
        type: "speaking",
        prompt: "Describe a memorable event from your childhood.",
        difficulty: "beginner",
        tips: [
          "What happened during this event",
          "Where and when it took place",
          "Why this event was significant to you"
        ]
      },
      {
        type: "speaking",
        prompt: "If you could change one thing about your city or town, what would it be and why?",
        difficulty: "advanced",
        tips: [
          "What aspect of your city or town needs improvement",
          "Why this change would be beneficial",
          "How this change would impact the community"
        ]
      },
      {
        type: "speaking",
        prompt: "Talk about a person who has influenced your life in a positive way.",
        difficulty: "intermediate",
        tips: [
          "Who this person is and your relationship with them",
          "How they have influenced you",
          "What qualities you admire in this person"
        ]
      }
    ];

    for (const prompt of defaultPrompts) {
      await storage.createPrompt(prompt);
    }
  }
}

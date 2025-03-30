import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertTestResultSchema, insertTestSubmissionSchema } from "@shared/schema";
import { analyzeSpokenEnglish, transcribeAudio } from "./openai";
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
    } catch (error) {
      res.status(500).json({ message: `Failed to get prompts: ${error.message}` });
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

      // Get the audio file path
      const audioPath = req.file.path;

      // Transcribe the audio
      const transcript = await transcribeAudio(audioPath);

      // Return the transcript
      res.json({ transcript });

      // Cleanup the audio file
      fs.unlinkSync(audioPath);

    } catch (error) {
      res.status(500).json({ message: `Failed to process audio: ${error.message}` });
    }
  });

  // Evaluate spoken English
  app.post("/api/evaluate", async (req, res) => {
    try {
      const { transcript, promptId } = req.body;

      if (!transcript) {
        return res.status(400).json({ message: "Transcript is required" });
      }

      // Get the prompt
      const prompt = await storage.getPrompt(Number(promptId));
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      // Analyze the transcription
      const evaluation = await analyzeSpokenEnglish(transcript, prompt.prompt);

      res.json(evaluation);
    } catch (error) {
      res.status(500).json({ message: `Failed to evaluate: ${error.message}` });
    }
  });

  // Submit test results
  app.post("/api/submit-test-results", async (req, res) => {
    try {
      const testResultData = insertTestResultSchema.parse(req.body);
      const testResult = await storage.createTestResult(testResultData);
      res.json(testResult);
    } catch (error) {
      res.status(500).json({ message: `Failed to submit test results: ${error.message}` });
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
        prompt: "Describe your favorite place to visit and explain why you enjoy going there.",
        tips: [
          "What this place is and where it's located",
          "What activities you can do there",
          "Why it's special to you or what memories you have of it"
        ]
      },
      {
        prompt: "Talk about a skill you would like to learn and why it interests you.",
        tips: [
          "What the skill is and why you want to learn it",
          "How you plan to learn this skill",
          "How you think this skill will benefit you in the future"
        ]
      },
      {
        prompt: "Describe a memorable event from your childhood.",
        tips: [
          "What happened during this event",
          "Where and when it took place",
          "Why this event was significant to you"
        ]
      },
      {
        prompt: "If you could change one thing about your city or town, what would it be and why?",
        tips: [
          "What aspect of your city or town needs improvement",
          "Why this change would be beneficial",
          "How this change would impact the community"
        ]
      },
      {
        prompt: "Talk about a person who has influenced your life in a positive way.",
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

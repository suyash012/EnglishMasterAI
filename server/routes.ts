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
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file storage
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
      // Spontaneous Response prompts
      {
        type: "spontaneous_response",
        prompt: "Describe your favorite place to visit and explain why you enjoy going there.",
        difficulty: "intermediate",
        timeLimit: 60,
        tips: [
          "What this place is and where it's located",
          "What activities you can do there",
          "Why it's special to you or what memories you have of it"
        ]
      },
      {
        type: "spontaneous_response",
        prompt: "Talk about a skill you would like to learn and why it interests you.",
        difficulty: "intermediate",
        timeLimit: 60,
        tips: [
          "What the skill is and why you want to learn it",
          "How you plan to learn this skill",
          "How you think this skill will benefit you in the future"
        ]
      },
      {
        type: "spontaneous_response",
        prompt: "If you could change one thing about your city or town, what would it be and why?",
        difficulty: "advanced",
        timeLimit: 90,
        tips: [
          "What aspect of your city or town needs improvement",
          "Why this change would be beneficial",
          "How this change would impact the community"
        ]
      },
      
      // Read Aloud prompts
      {
        type: "read_aloud",
        prompt: "Read the following paragraph with clear pronunciation: 'Technology continues to transform the way we live, work, and communicate. With advancements in artificial intelligence and machine learning, we are witnessing remarkable innovations that were once considered impossible. As these changes accelerate, it becomes increasingly important to consider both the benefits and potential drawbacks of our increasingly digital world.'",
        difficulty: "intermediate",
        timeLimit: 45,
        tips: [
          "Focus on clear pronunciation",
          "Maintain a steady pace",
          "Pay attention to punctuation and pauses"
        ]
      },
      {
        type: "read_aloud",
        prompt: "Read this text aloud with appropriate expression: 'The small cafe on the corner became my sanctuary during the busy workweek. Every Friday afternoon, I would reward myself with a cup of freshly brewed coffee and a pastry while watching people hurry by through the large windows. Those quiet moments of reflection helped me maintain balance in my hectic life.'",
        difficulty: "beginner",
        timeLimit: 40,
        tips: [
          "Read at a comfortable pace",
          "Use appropriate intonation to convey meaning",
          "Pronounce each word clearly"
        ]
      },
      
      // Picture Description prompts
      {
        type: "picture_description",
        prompt: "Look at the image and describe what you see. Include details about the people, location, and any activities taking place.",
        difficulty: "intermediate",
        timeLimit: 60,
        resourceUrl: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80",
        tips: [
          "Describe the main elements in the image",
          "Comment on what might be happening",
          "Use descriptive vocabulary"
        ]
      },
      
      // Role Play scenarios
      {
        type: "role_play",
        prompt: "Imagine you're checking into a hotel and there's a problem with your reservation. Have a conversation with the hotel receptionist to resolve the issue.",
        difficulty: "intermediate",
        timeLimit: 75,
        tips: [
          "Explain the problem clearly",
          "Ask appropriate questions",
          "Suggest possible solutions",
          "Be polite but assertive"
        ]
      },
      {
        type: "role_play",
        prompt: "You're in a job interview for a position you really want. The interviewer asks you to describe your strengths and why you're the right person for the job. Respond to this question.",
        difficulty: "advanced",
        timeLimit: 90,
        tips: [
          "Highlight relevant skills and experience",
          "Give specific examples",
          "Connect your abilities to the job requirements",
          "Show enthusiasm and confidence"
        ]
      },
      
      // Listening Comprehension
      {
        type: "listening_comprehension",
        prompt: "Listen to the audio clip and then answer the question: What was the main topic of the discussion?",
        difficulty: "advanced",
        timeLimit: 60,
        resourceUrl: "https://example.com/audio/discussion.mp3", // This would need to be a real audio URL
        tips: [
          "Listen carefully for key points",
          "Take note of supporting details",
          "Focus on the main theme of the discussion"
        ]
      }
    ];

    for (const prompt of defaultPrompts) {
      await storage.createPrompt(prompt);
    }
  }
}

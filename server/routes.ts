import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertTestResultSchema, insertTestSubmissionSchema, DifficultyLevels, PROGRESSION_THRESHOLD, UserProgress } from "@shared/schema";
import { transcribeAudio } from "./assemblyai";
import { analyzeSpokenEnglish, analyzeImageDescription, analyzeSpeechWithLeMUR } from "./mistral-fixed-updated";
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
      const difficulty = req.query.difficulty as string;
      
      let prompts;
      if (difficulty) {
        prompts = await storage.getPromptsByDifficulty(difficulty);
      } else {
        prompts = await storage.getAllPrompts();
      }
      
      res.json(prompts);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Failed to get prompts: ${errorMessage}` });
    }
  });
  
  // Get test prompts by difficulty level
  app.get("/api/prompts/difficulty/:difficulty", async (req, res) => {
    try {
      const { difficulty } = req.params;
      
      // Validate difficulty level
      if (!Object.values(DifficultyLevels).includes(difficulty as any)) {
        return res.status(400).json({ message: "Invalid difficulty level" });
      }
      
      const prompts = await storage.getPromptsByDifficulty(difficulty);
      res.json(prompts);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Failed to get prompts: ${errorMessage}` });
    }
  });
  
  // Get test categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Failed to get categories: ${errorMessage}` });
    }
  });
  
  // Check if user can progress to next difficulty level
  app.get("/api/user-progress/:userId", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get user progress
      let userProgress = await storage.getUserProgress(userId);
      
      // If no progress record exists, create one
      if (!userProgress) {
        userProgress = await storage.createUserProgress({
          userId,
          testsCompleted: 0,
          averageScore: 0,
          currentCefrLevel: "A2",
          strengths: [],
          improvementAreas: [],
          lastTestDate: new Date(),
          totalPracticeTime: 0,
          highestDifficultyUnlocked: DifficultyLevels.BEGINNER,
          beginnerScore: 0,
          intermediateScore: 0,
          advancedScore: 0,
          expertScore: 0
        });
      }
      
      // Return progress data
      res.json({
        userId: userProgress.userId,
        highestDifficultyUnlocked: userProgress.highestDifficultyUnlocked,
        unlockedLevels: {
          [DifficultyLevels.BEGINNER]: true, // Always available
          [DifficultyLevels.INTERMEDIATE]: userProgress.highestDifficultyUnlocked !== DifficultyLevels.BEGINNER,
          [DifficultyLevels.ADVANCED]: userProgress.highestDifficultyUnlocked === DifficultyLevels.ADVANCED || userProgress.highestDifficultyUnlocked === DifficultyLevels.EXPERT,
          [DifficultyLevels.EXPERT]: userProgress.highestDifficultyUnlocked === DifficultyLevels.EXPERT
        },
        levelScores: {
          [DifficultyLevels.BEGINNER]: userProgress.beginnerScore,
          [DifficultyLevels.INTERMEDIATE]: userProgress.intermediateScore,
          [DifficultyLevels.ADVANCED]: userProgress.advancedScore,
          [DifficultyLevels.EXPERT]: userProgress.expertScore
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Failed to get user progress: ${errorMessage}` });
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
          try {
            // Analyze the audio directly with AssemblyAI
            const evaluation = await analyzeSpeechWithLeMUR(audioPath, prompt.prompt);
            
            // Return the transcript and evaluation
            return res.json({
              transcript,
              evaluation: {
                overallScore: evaluation.overall,
                vocabularyScore: evaluation.vocabulary,
                grammarScore: evaluation.grammar,
                // Adding phraseScore which is an average of vocabulary and grammar if not provided directly
                phraseScore: evaluation.phrase || Math.round((evaluation.vocabulary + evaluation.grammar) / 2),
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
          } catch (error) {
            console.error("Error analyzing speech with AssemblyAI:", error);
            
            // If LeMUR is not available, provide a fallback evaluation
            // This is a fallback for when the API doesn't have access to LeMUR
            const fallbackEvaluation = {
              overallScore: 75,
              vocabularyScore: 70,
              grammarScore: 80,
              phraseScore: 75, // Add phrase score to prevent NaN
              fluencyScore: 75,
              pronunciationScore: 75,
              strengths: ["Good use of vocabulary", "Clear sentence structure", "Effective communication of ideas"],
              improvements: ["Work on fluency", "Expand advanced vocabulary", "Practice complex grammar structures"],
              recommendations: ["Practice speaking regularly", "Listen to native speakers", "Join language exchange programs"],
              feedback: "Your English shows good foundational skills. Continue practicing to improve fluency and expand your vocabulary."
            };
            
            // Return both transcript and fallback evaluation
            return res.json({
              transcript,
              evaluation: fallbackEvaluation,
              fallback: true,
              error: error instanceof Error ? error.message : 'Unknown analysis error'
            });
          }
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
        try {
          const evaluation = await analyzeSpeechWithLeMUR(audioFilePath, prompt.prompt);
          return res.json({
            overallScore: evaluation.overall,
            vocabularyScore: evaluation.vocabulary,
            grammarScore: evaluation.grammar,
            // Adding phraseScore derived from vocabulary and grammar
            phraseScore: Math.round((evaluation.vocabulary + evaluation.grammar) / 2),
            fluencyScore: evaluation.fluency || evaluation.pronunciation,
            pronunciationScore: evaluation.pronunciation || evaluation.fluency,
            strengths: evaluation.strengths,
            improvements: evaluation.weaknesses,
            recommendations: ["Practice speaking regularly", "Listen to native speakers", "Join language exchange programs"],
            feedback: evaluation.feedback
          });
        } catch (error) {
          console.error("Error analyzing speech with AssemblyAI in /api/evaluate:", error);
          
          // Fallback to basic scoring if LeMUR is not available
          const fallbackEvaluation = {
            overallScore: 75,
            vocabularyScore: 70,
            grammarScore: 80,
            phraseScore: 75, // Add phrase score
            fluencyScore: 75,
            pronunciationScore: 75,
            strengths: ["Good use of vocabulary", "Clear sentence structure", "Effective communication of ideas"],
            improvements: ["Work on fluency", "Expand advanced vocabulary", "Practice complex grammar structures"],
            recommendations: ["Practice speaking regularly", "Listen to native speakers", "Join language exchange programs"],
            feedback: "Your English shows good foundational skills. Continue practicing to improve fluency and expand your vocabulary."
          };
          
          // Add fallback flag to indicate this is not a real evaluation
          return res.json({
            ...fallbackEvaluation,
            fallback: true,
            error: error instanceof Error ? error.message : 'Unknown analysis error'
          });
        }
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
        phraseScore: 75, // Add phrase score
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
      
      // Update user progress if user ID is provided
      if (testResultData.userId) {
        try {
          // Get the current user progress
          let userProgress = await storage.getUserProgress(testResultData.userId);
          
          // If no progress record exists, create one
          if (!userProgress) {
            userProgress = await storage.createUserProgress({
              userId: testResultData.userId,
              testsCompleted: 1,
              averageScore: testResultData.overallScore,
              currentCefrLevel: testResultData.cefrLevel,
              strengths: testResultData.strengths || [],
              improvementAreas: testResultData.improvements || [],
              lastTestDate: new Date(),
              totalPracticeTime: 0,
              highestDifficultyUnlocked: DifficultyLevels.BEGINNER,
              beginnerScore: 0,
              intermediateScore: 0,
              advancedScore: 0,
              expertScore: 0
            });
          } else {
            // Update existing progress
            const testsCompleted = (userProgress.testsCompleted || 0) + 1;
            const averageScore = userProgress.averageScore || 0;
            const previousTestsCompleted = userProgress.testsCompleted || 0;
            const totalScore = (averageScore * previousTestsCompleted) + testResultData.overallScore;
            const newAverageScore = Math.round(totalScore / testsCompleted);
            
            // Get prompt ID from the test result data
            // Since promptId is not directly in the schema, check if it's stored in a custom field
            let promptId = 0;
            // Try to extract promptId from test result data
            if ('promptId' in testResultData) {
              promptId = (testResultData as any).promptId;
            }
            
            // Get the prompt to determine the difficulty level
            const prompt = promptId ? await storage.getPrompt(promptId) : null;
            let difficulty = DifficultyLevels.BEGINNER.toLowerCase();
            
            if (prompt && prompt.difficulty) {
              difficulty = prompt.difficulty.toLowerCase();
            }
            
            // Update the score for the specific difficulty level
            const updatedProgress: Partial<UserProgress> = {
              testsCompleted,
              averageScore: newAverageScore,
              currentCefrLevel: testResultData.cefrLevel,
              lastTestDate: new Date(),
              strengths: Array.from(new Set([...(userProgress.strengths || []), ...(testResultData.strengths || [])])),
              improvementAreas: Array.from(new Set([...(userProgress.improvementAreas || []), ...(testResultData.improvements || [])]))
            };
            
            // Update the score for the specific difficulty level and check for progression
            if (difficulty === DifficultyLevels.BEGINNER.toLowerCase()) {
              updatedProgress.beginnerScore = Math.max(userProgress.beginnerScore || 0, testResultData.overallScore);
              
              // Check if user can progress to intermediate level
              if (testResultData.overallScore >= PROGRESSION_THRESHOLD && 
                  userProgress.highestDifficultyUnlocked === DifficultyLevels.BEGINNER) {
                updatedProgress.highestDifficultyUnlocked = DifficultyLevels.INTERMEDIATE;
              }
            } else if (difficulty === DifficultyLevels.INTERMEDIATE.toLowerCase()) {
              updatedProgress.intermediateScore = Math.max(userProgress.intermediateScore || 0, testResultData.overallScore);
              
              // Check if user can progress to advanced level
              if (testResultData.overallScore >= PROGRESSION_THRESHOLD && 
                  userProgress.highestDifficultyUnlocked === DifficultyLevels.INTERMEDIATE) {
                updatedProgress.highestDifficultyUnlocked = DifficultyLevels.ADVANCED;
              }
            } else if (difficulty === DifficultyLevels.ADVANCED.toLowerCase()) {
              updatedProgress.advancedScore = Math.max(userProgress.advancedScore || 0, testResultData.overallScore);
              
              // Check if user can progress to expert level
              if (testResultData.overallScore >= PROGRESSION_THRESHOLD && 
                  userProgress.highestDifficultyUnlocked === DifficultyLevels.ADVANCED) {
                updatedProgress.highestDifficultyUnlocked = DifficultyLevels.EXPERT;
              }
            } else if (difficulty === DifficultyLevels.EXPERT.toLowerCase()) {
              updatedProgress.expertScore = Math.max(userProgress.expertScore || 0, testResultData.overallScore);
            }
            
            // Update the user progress
            await storage.updateUserProgress(testResultData.userId, updatedProgress);
          }
        } catch (progressError) {
          console.error("Error updating user progress:", progressError);
          // We don't want to fail the entire request if progress update fails
        }
      }
      
      res.json(testResult);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Failed to submit test results: ${errorMessage}` });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

// Initialize categories and test prompts if none exist
async function initializeTestPrompts() {
  // Check for existing categories
  const existingCategories = await storage.getAllCategories();
  
  // Create test categories if none exist
  if (existingCategories.length === 0) {
    const defaultCategories = [
      {
        name: "Basic English Skills",
        description: "Foundational English speaking skills for beginners",
        level: "A2",
        isActive: true
      },
      {
        name: "Intermediate Communication",
        description: "Everyday conversational English for intermediate speakers",
        level: "B1",
        isActive: true
      },
      {
        name: "Advanced Expression",
        description: "Complex topics and nuanced discussions for advanced speakers",
        level: "B2",
        isActive: true
      },
      {
        name: "Expert Fluency",
        description: "Professional and academic English for expert speakers",
        level: "C1",
        isActive: true
      }
    ];

    // Create each category
    for (const category of defaultCategories) {
      await storage.createCategory(category);
    }
  }
  
  // Now check for existing prompts
  const existingPrompts = await storage.getAllPrompts();
  
  if (existingPrompts.length === 0) {
    // Get the categories we just created
    const categories = await storage.getAllCategories();
    const categoryMap = new Map(categories.map(c => [c.level, c.id]));
    
    const defaultPrompts = [
      // Spontaneous Response prompts - CEFR A2 Level
      {
        type: "spontaneous_response",
        prompt: "Describe your favorite place to visit and explain why you enjoy going there.",
        difficulty: "beginner",
        level: "A2",
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
        difficulty: "beginner",
        level: "A2",
        timeLimit: 60,
        tips: [
          "What the skill is and why you want to learn it",
          "How you plan to learn this skill",
          "How you think this skill will benefit you in the future"
        ]
      },
      
      // Spontaneous Response prompts - CEFR B1 Level
      {
        type: "spontaneous_response",
        prompt: "If you could change one thing about your city or town, what would it be and why?",
        difficulty: "intermediate",
        level: "B1",
        timeLimit: 90,
        tips: [
          "What aspect of your city or town needs improvement",
          "Why this change would be beneficial",
          "How this change would impact the community"
        ]
      },
      {
        type: "spontaneous_response",
        prompt: "Talk about a challenging experience you had and how you overcame it.",
        difficulty: "intermediate",
        level: "B1",
        timeLimit: 90,
        tips: [
          "Describe the situation and why it was challenging",
          "Explain what actions you took",
          "Discuss what you learned from the experience"
        ]
      },
      
      // Spontaneous Response prompts - CEFR B2 Level
      {
        type: "spontaneous_response",
        prompt: "Discuss the advantages and disadvantages of remote work versus office work.",
        difficulty: "advanced",
        level: "B2",
        timeLimit: 120,
        tips: [
          "Compare productivity and work-life balance",
          "Consider social interaction and team collaboration",
          "Analyze the environmental and economic impacts",
          "Provide a balanced view with examples"
        ]
      },
      
      // Spontaneous Response prompts - CEFR C1 Level
      {
        type: "spontaneous_response",
        prompt: "To what extent do you think artificial intelligence will transform education in the next decade?",
        difficulty: "expert",
        level: "C1",
        timeLimit: 120,
        tips: [
          "Analyze potential benefits and risks",
          "Consider different educational levels and contexts",
          "Discuss ethical implications",
          "Provide nuanced arguments with specific examples"
        ]
      },
      
      // Read Aloud prompts - CEFR A2 Level
      {
        type: "read_aloud",
        prompt: "Read this text aloud with appropriate expression: 'The small cafe on the corner became my sanctuary during the busy workweek. Every Friday afternoon, I would reward myself with a cup of freshly brewed coffee and a pastry while watching people hurry by through the large windows. Those quiet moments of reflection helped me maintain balance in my hectic life.'",
        difficulty: "beginner",
        level: "A2",
        timeLimit: 40,
        tips: [
          "Read at a comfortable pace",
          "Use appropriate intonation to convey meaning",
          "Pronounce each word clearly"
        ]
      },
      
      // Read Aloud prompts - CEFR B1 Level
      {
        type: "read_aloud",
        prompt: "Read the following paragraph with clear pronunciation: 'Technology continues to transform the way we live, work, and communicate. With advancements in artificial intelligence and machine learning, we are witnessing remarkable innovations that were once considered impossible. As these changes accelerate, it becomes increasingly important to consider both the benefits and potential drawbacks of our increasingly digital world.'",
        difficulty: "intermediate",
        level: "B1",
        timeLimit: 45,
        tips: [
          "Focus on clear pronunciation",
          "Maintain a steady pace",
          "Pay attention to punctuation and pauses"
        ]
      },
      
      // Read Aloud prompts - CEFR B2 Level
      {
        type: "read_aloud",
        prompt: "Read the following text with appropriate expression and emphasis: 'The relationship between technology and privacy is increasingly complex. While digital platforms enhance our ability to connect and share information, they simultaneously create unprecedented challenges regarding data security and personal privacy. Finding the right balance between innovation and protection requires thoughtful consideration of both technological capabilities and ethical principles.'",
        difficulty: "advanced",
        level: "B2",
        timeLimit: 60,
        tips: [
          "Maintain natural rhythm and appropriate pauses",
          "Emphasize key points through intonation",
          "Articulate complex words clearly",
          "Connect ideas with appropriate phrasing"
        ]
      },
      
      // Picture Description prompts - CEFR A2 Level
      {
        type: "picture_description",
        prompt: "Look at the image and describe what you see. Include details about the people, location, and any activities taking place.",
        difficulty: "beginner",
        level: "A2",
        timeLimit: 60,
        resourceUrl: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80",
        tips: [
          "Describe the main elements in the image",
          "Comment on what might be happening",
          "Use descriptive vocabulary"
        ]
      },
      
      // Picture Description prompts - CEFR B1 Level
      {
        type: "picture_description",
        prompt: "Study the image carefully and describe what you see. Explain what might be happening, how the people might be feeling, and what could happen next.",
        difficulty: "intermediate",
        level: "B1",
        timeLimit: 90,
        resourceUrl: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80",
        tips: [
          "Use a range of descriptive adjectives",
          "Comment on the mood or atmosphere",
          "Make logical inferences about the context",
          "Structure your description from general to specific details"
        ]
      },
      
      // Role Play scenarios - CEFR A2 Level
      {
        type: "role_play",
        prompt: "Imagine you're checking into a hotel and there's a problem with your reservation. Have a conversation with the hotel receptionist to resolve the issue.",
        difficulty: "beginner",
        level: "A2",
        timeLimit: 75,
        tips: [
          "Explain the problem clearly",
          "Ask appropriate questions",
          "Suggest possible solutions",
          "Be polite but assertive"
        ]
      },
      
      // Role Play scenarios - CEFR B1 Level
      {
        type: "role_play",
        prompt: "You're in a job interview for a position you really want. The interviewer asks you to describe your strengths and why you're the right person for the job. Respond to this question.",
        difficulty: "intermediate",
        level: "B1",
        timeLimit: 90,
        tips: [
          "Highlight relevant skills and experience",
          "Give specific examples",
          "Connect your abilities to the job requirements",
          "Show enthusiasm and confidence"
        ]
      },
      
      // Role Play scenarios - CEFR B2 Level
      {
        type: "role_play",
        prompt: "You're participating in a work meeting where your team is discussing a new project proposal. Express your opinion about the project, respond to potential concerns, and suggest improvements to the plan.",
        difficulty: "advanced",
        level: "B2",
        timeLimit: 120,
        tips: [
          "Begin with a clear stance on the proposal",
          "Provide logical reasoning for your opinions",
          "Address potential counter-arguments respectfully",
          "Conclude with constructive suggestions",
          "Use appropriate business language and formal register"
        ]
      },
      
      // Role Play scenarios - CEFR C1 Level
      {
        type: "role_play",
        prompt: "As a representative of your company, you need to negotiate a contract with a potential client who has expressed concerns about pricing and delivery timelines. Present your position, address their concerns, and work toward a mutually beneficial agreement.",
        difficulty: "expert",
        level: "C1",
        timeLimit: 150,
        tips: [
          "Establish rapport and demonstrate understanding of their position",
          "Present your constraints and requirements clearly",
          "Use persuasive language and logical argumentation",
          "Suggest creative compromises and alternatives",
          "Maintain professional tone throughout the negotiation"
        ]
      },
      
      // Listening Comprehension - CEFR B1 Level
      // Note: For production, replace with actual audio files
      {
        type: "listening_comprehension",
        prompt: "Listen to the audio clip about environmental conservation and then summarize the main points discussed.",
        difficulty: "intermediate",
        level: "B1",
        timeLimit: 120,
        resourceUrl: "https://example.com/audio/environment_discussion.mp3", 
        tips: [
          "Listen for key points and supporting details",
          "Take note of the speaker's main argument",
          "Pay attention to examples provided",
          "Organize your response logically"
        ]
      },
      
      // Listening Comprehension - CEFR B2 Level  
      {
        type: "listening_comprehension",
        prompt: "Listen to the podcast excerpt about technological innovation and then answer: How might these developments affect various industries according to the speakers?",
        difficulty: "advanced",
        level: "B2",
        timeLimit: 150,
        resourceUrl: "https://example.com/audio/tech_innovation.mp3",
        tips: [
          "Listen for specific impacts mentioned for different sectors",
          "Note both positive and negative potential effects",
          "Pay attention to expert opinions and predictions",
          "Organize your response by industry or by type of impact"
        ]
      },
      
      // Academic Discussion - CEFR C1 Level
      {
        type: "academic_discussion",
        prompt: "Discuss the ethical implications of using genetic engineering technologies for human enhancement. Consider multiple perspectives and provide a nuanced analysis.",
        difficulty: "expert",
        level: "C1",
        timeLimit: 180,
        tips: [
          "Define key concepts clearly",
          "Present multiple ethical frameworks",
          "Consider societal, individual, and scientific perspectives",
          "Provide specific examples to support your arguments",
          "Acknowledge limitations and uncertainties in your reasoning"
        ]
      },
      
      // Story Continuation - CEFR B1 Level
      {
        type: "story_continuation",
        prompt: "Continue this story: 'Sarah looked at the mysterious package on her doorstep. There was no return address, only her name written in elegant handwriting. She hesitated before picking it up...'",
        difficulty: "intermediate",
        level: "B1",
        timeLimit: 120,
        tips: [
          "Maintain narrative consistency",
          "Develop the character and situation further",
          "Use descriptive language to set the scene",
          "Include dialogue if appropriate",
          "Create a logical progression of events"
        ]
      },
      
      // Debate Topic - CEFR B2 Level
      {
        type: "debate",
        prompt: "Should social media platforms be responsible for moderating user content? Present arguments for or against this position.",
        difficulty: "advanced",
        level: "B2", 
        timeLimit: 150,
        tips: [
          "Take a clear position",
          "Support your arguments with specific examples",
          "Address potential counter-arguments",
          "Consider legal, ethical, and practical dimensions",
          "Conclude with a summary of your position"
        ]
      }
    ];

    for (const prompt of defaultPrompts) {
      const categoryId = categoryMap.get(prompt.level);
      if (categoryId) {
        await storage.createPrompt({
          ...prompt,
          categoryId
        });
      } else {
        console.error(`Could not find category for level: ${prompt.level}`);
      }
    }
  }
}

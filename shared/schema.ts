import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// CEFR Level enum
export const CEFRLevels = {
  A1: "A1",
  A2: "A2", 
  B1: "B1",
  B2: "B2",
  C1: "C1",
  C2: "C2"
} as const;

// Test Type enum
export const TestTypes = {
  READ_ALOUD: "read_aloud",
  SPONTANEOUS_RESPONSE: "spontaneous_response",
  LISTENING_COMPREHENSION: "listening_comprehension",
  ROLE_PLAY: "role_play",
  PICTURE_DESCRIPTION: "picture_description"
} as const;

// Difficulty Level enum
export const DifficultyLevels = {
  BEGINNER: "beginner",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
  EXPERT: "expert"
} as const;

// Minimum score required to advance to the next level (out of 100)
export const PROGRESSION_THRESHOLD = 80;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  email: text("email").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  lastActive: timestamp("last_active"),
  profilePicture: text("profile_picture"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  email: true,
  profilePicture: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Test Categories
export const testCategories = pgTable("test_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  level: text("level").notNull(), // CEFR Level
  isActive: boolean("is_active").default(true),
});

export const insertTestCategorySchema = createInsertSchema(testCategories).pick({
  name: true,
  description: true,
  level: true,
  isActive: true,
});

export type InsertTestCategory = z.infer<typeof insertTestCategorySchema>;
export type TestCategory = typeof testCategories.$inferSelect;

// Test prompts
export const testPrompts = pgTable("test_prompts", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => testCategories.id),
  type: text("type").notNull(), // Test type
  prompt: text("prompt").notNull(),
  tips: text("tips").array(),
  resourceUrl: text("resource_url"), // Audio file for listening, image for description
  difficulty: text("difficulty").notNull(), // CEFR level
  timeLimit: integer("time_limit").default(60), // Time limit in seconds
});

export const insertTestPromptSchema = createInsertSchema(testPrompts).pick({
  categoryId: true,
  type: true,
  prompt: true,
  tips: true,
  resourceUrl: true,
  difficulty: true,
  timeLimit: true,
});

export type InsertTestPrompt = z.infer<typeof insertTestPromptSchema>;
export type TestPrompt = typeof testPrompts.$inferSelect;

// Enhanced Test Results
export const testResults = pgTable("test_results", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  categoryId: integer("category_id").references(() => testCategories.id),
  overallScore: integer("overall_score").notNull(),
  pronunciationScore: integer("pronunciation_score").notNull(),
  fluencyScore: integer("fluency_score").notNull(),
  vocabularyScore: integer("vocabulary_score").notNull(),
  grammarScore: integer("grammar_score").notNull(),
  listeningScore: integer("listening_score"),
  cefrLevel: text("cefr_level").notNull(),
  strengths: text("strengths").array(),
  improvements: text("improvements").array(),
  recommendations: text("recommendations").array(),
  createdAt: timestamp("created_at").defaultNow(),
  feedback: text("feedback").notNull(),
  testDuration: integer("test_duration"), // in seconds
});

export const insertTestResultSchema = createInsertSchema(testResults).omit({
  id: true,
  createdAt: true,
});

export type InsertTestResult = z.infer<typeof insertTestResultSchema>;
export type TestResult = typeof testResults.$inferSelect;

// Test Submissions
export const testSubmissions = pgTable("test_submissions", {
  id: serial("id").primaryKey(),
  testResultId: integer("test_result_id").references(() => testResults.id),
  promptId: integer("prompt_id").references(() => testPrompts.id),
  audioUrl: text("audio_url"),
  transcript: text("transcript"),
  evaluation: jsonb("evaluation"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  responseTime: integer("response_time"), // Time taken to respond in seconds
  isCorrect: boolean("is_correct"), // For multiple choice/listening questions
});

export const insertTestSubmissionSchema = createInsertSchema(testSubmissions).omit({
  id: true,
  submittedAt: true,
});

export type InsertTestSubmission = z.infer<typeof insertTestSubmissionSchema>;
export type TestSubmission = typeof testSubmissions.$inferSelect;

// User Progress
export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  testsCompleted: integer("tests_completed").default(0),
  averageScore: integer("average_score").default(0),
  currentCefrLevel: text("current_cefr_level").default("A2"),
  strengths: text("strengths").array(),
  improvementAreas: text("improvement_areas").array(), 
  lastTestDate: timestamp("last_test_date"),
  totalPracticeTime: integer("total_practice_time").default(0), // in minutes
  highestDifficultyUnlocked: text("highest_difficulty_unlocked").default(DifficultyLevels.BEGINNER), // Track progression through difficulty levels
  beginnerScore: integer("beginner_score").default(0),
  intermediateScore: integer("intermediate_score").default(0),
  advancedScore: integer("advanced_score").default(0),
  expertScore: integer("expert_score").default(0)
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
});

export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;

// Learning Resources
export const learningResources = pgTable("learning_resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  resourceType: text("resource_type").notNull(), // video, article, exercise
  url: text("url").notNull(),
  cefrLevel: text("cefr_level").notNull(),
  skillFocus: text("skill_focus").array(), // Which skills this helps with
  durationMinutes: integer("duration_minutes"),
});

export const insertLearningResourceSchema = createInsertSchema(learningResources).omit({
  id: true,
});

export type InsertLearningResource = z.infer<typeof insertLearningResourceSchema>;
export type LearningResource = typeof learningResources.$inferSelect;

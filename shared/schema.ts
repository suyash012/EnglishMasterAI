import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Test prompts
export const testPrompts = pgTable("test_prompts", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  tips: text("tips").array(),
});

export const insertTestPromptSchema = createInsertSchema(testPrompts).pick({
  prompt: true,
  tips: true,
});

export type InsertTestPrompt = z.infer<typeof insertTestPromptSchema>;
export type TestPrompt = typeof testPrompts.$inferSelect;

// Test Results
export const testResults = pgTable("test_results", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  overallScore: integer("overall_score").notNull(),
  vocabularyScore: integer("vocabulary_score").notNull(),
  grammarScore: integer("grammar_score").notNull(),
  phraseScore: integer("phrase_score").notNull(),
  strengths: text("strengths").array(),
  improvements: text("improvements").array(),
  recommendations: text("recommendations").array(),
  createdAt: timestamp("created_at").defaultNow(),
  feedback: text("feedback").notNull(),
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
});

export const insertTestSubmissionSchema = createInsertSchema(testSubmissions).omit({
  id: true,
});

export type InsertTestSubmission = z.infer<typeof insertTestSubmissionSchema>;
export type TestSubmission = typeof testSubmissions.$inferSelect;

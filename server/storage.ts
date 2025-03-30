import { 
  users, type User, type InsertUser,
  testPrompts, type TestPrompt, type InsertTestPrompt,
  testResults, type TestResult, type InsertTestResult,
  testSubmissions, type TestSubmission, type InsertTestSubmission
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Test prompt methods
  getPrompt(id: number): Promise<TestPrompt | undefined>;
  getAllPrompts(): Promise<TestPrompt[]>;
  createPrompt(prompt: InsertTestPrompt): Promise<TestPrompt>;
  
  // Test result methods
  getTestResult(id: number): Promise<TestResult | undefined>;
  getTestResultsByUserId(userId: number): Promise<TestResult[]>;
  createTestResult(result: InsertTestResult): Promise<TestResult>;
  
  // Test submission methods
  getTestSubmission(id: number): Promise<TestSubmission | undefined>;
  getTestSubmissionsByResultId(resultId: number): Promise<TestSubmission[]>;
  createTestSubmission(submission: InsertTestSubmission): Promise<TestSubmission>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private prompts: Map<number, TestPrompt>;
  private testResults: Map<number, TestResult>;
  private testSubmissions: Map<number, TestSubmission>;
  
  private userIdCounter: number;
  private promptIdCounter: number;
  private resultIdCounter: number;
  private submissionIdCounter: number;

  constructor() {
    this.users = new Map();
    this.prompts = new Map();
    this.testResults = new Map();
    this.testSubmissions = new Map();
    
    this.userIdCounter = 1;
    this.promptIdCounter = 1;
    this.resultIdCounter = 1;
    this.submissionIdCounter = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Test prompt methods
  async getPrompt(id: number): Promise<TestPrompt | undefined> {
    return this.prompts.get(id);
  }
  
  async getAllPrompts(): Promise<TestPrompt[]> {
    return Array.from(this.prompts.values());
  }
  
  async createPrompt(insertPrompt: InsertTestPrompt): Promise<TestPrompt> {
    const id = this.promptIdCounter++;
    const prompt: TestPrompt = { 
      ...insertPrompt, 
      id,
      tips: insertPrompt.tips || []  // Ensure tips is always an array
    };
    this.prompts.set(id, prompt);
    return prompt;
  }
  
  // Test result methods
  async getTestResult(id: number): Promise<TestResult | undefined> {
    return this.testResults.get(id);
  }
  
  async getTestResultsByUserId(userId: number): Promise<TestResult[]> {
    return Array.from(this.testResults.values()).filter(
      (result) => result.userId === userId
    );
  }
  
  async createTestResult(insertResult: InsertTestResult): Promise<TestResult> {
    const id = this.resultIdCounter++;
    const now = new Date();
    const result: TestResult = { 
      id,
      userId: insertResult.userId || null,
      overallScore: insertResult.overallScore,
      vocabularyScore: insertResult.vocabularyScore,
      grammarScore: insertResult.grammarScore,
      phraseScore: insertResult.phraseScore,
      strengths: insertResult.strengths || [],
      improvements: insertResult.improvements || [],
      recommendations: insertResult.recommendations || [],
      feedback: insertResult.feedback,
      createdAt: now
    };
    this.testResults.set(id, result);
    return result;
  }
  
  // Test submission methods
  async getTestSubmission(id: number): Promise<TestSubmission | undefined> {
    return this.testSubmissions.get(id);
  }
  
  async getTestSubmissionsByResultId(resultId: number): Promise<TestSubmission[]> {
    return Array.from(this.testSubmissions.values()).filter(
      (submission) => submission.testResultId === resultId
    );
  }
  
  async createTestSubmission(insertSubmission: InsertTestSubmission): Promise<TestSubmission> {
    const id = this.submissionIdCounter++;
    const submission: TestSubmission = { 
      id,
      testResultId: insertSubmission.testResultId || null,
      promptId: insertSubmission.promptId || null,
      audioUrl: insertSubmission.audioUrl || null,
      transcript: insertSubmission.transcript || null,
      evaluation: insertSubmission.evaluation || null
    };
    this.testSubmissions.set(id, submission);
    return submission;
  }
}

export const storage = new MemStorage();

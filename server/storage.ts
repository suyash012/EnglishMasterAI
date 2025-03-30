import { 
  users, type User, type InsertUser,
  testCategories, type TestCategory, type InsertTestCategory,
  testPrompts, type TestPrompt, type InsertTestPrompt,
  testResults, type TestResult, type InsertTestResult,
  testSubmissions, type TestSubmission, type InsertTestSubmission,
  userProgress, type UserProgress, type InsertUserProgress,
  learningResources, type LearningResource, type InsertLearningResource
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Test category methods
  getCategory(id: number): Promise<TestCategory | undefined>;
  getAllCategories(): Promise<TestCategory[]>;
  getCategoriesByLevel(level: string): Promise<TestCategory[]>;
  createCategory(category: InsertTestCategory): Promise<TestCategory>;
  
  // Test prompt methods
  getPrompt(id: number): Promise<TestPrompt | undefined>;
  getAllPrompts(): Promise<TestPrompt[]>;
  getPromptsByCategory(categoryId: number): Promise<TestPrompt[]>;
  getPromptsByType(type: string): Promise<TestPrompt[]>;
  getPromptsByDifficulty(difficulty: string): Promise<TestPrompt[]>;
  createPrompt(prompt: InsertTestPrompt): Promise<TestPrompt>;
  
  // Test result methods
  getTestResult(id: number): Promise<TestResult | undefined>;
  getTestResultsByUserId(userId: number): Promise<TestResult[]>;
  getTestResultsByCategory(categoryId: number): Promise<TestResult[]>;
  getLatestTestResultByUser(userId: number): Promise<TestResult | undefined>;
  createTestResult(result: InsertTestResult): Promise<TestResult>;
  
  // Test submission methods
  getTestSubmission(id: number): Promise<TestSubmission | undefined>;
  getTestSubmissionsByResultId(resultId: number): Promise<TestSubmission[]>;
  getTestSubmissionsByPromptId(promptId: number): Promise<TestSubmission[]>;
  createTestSubmission(submission: InsertTestSubmission): Promise<TestSubmission>;
  
  // User progress methods
  getUserProgress(userId: number): Promise<UserProgress | undefined>;
  updateUserProgress(userId: number, progressData: Partial<UserProgress>): Promise<UserProgress | undefined>;
  createUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  
  // Learning resources methods
  getLearningResource(id: number): Promise<LearningResource | undefined>;
  getLearningResourcesByLevel(level: string): Promise<LearningResource[]>;
  getLearningResourcesBySkill(skill: string): Promise<LearningResource[]>;
  createLearningResource(resource: InsertLearningResource): Promise<LearningResource>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, TestCategory>;
  private prompts: Map<number, TestPrompt>;
  private testResults: Map<number, TestResult>;
  private testSubmissions: Map<number, TestSubmission>;
  private progressRecords: Map<number, UserProgress>;
  private learningResources: Map<number, LearningResource>;
  
  private userIdCounter: number;
  private categoryIdCounter: number;
  private promptIdCounter: number;
  private resultIdCounter: number;
  private submissionIdCounter: number;
  private progressIdCounter: number;
  private resourceIdCounter: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.prompts = new Map();
    this.testResults = new Map();
    this.testSubmissions = new Map();
    this.progressRecords = new Map();
    this.learningResources = new Map();
    
    this.userIdCounter = 1;
    this.categoryIdCounter = 1;
    this.promptIdCounter = 1;
    this.resultIdCounter = 1;
    this.submissionIdCounter = 1;
    this.progressIdCounter = 1;
    this.resourceIdCounter = 1;
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
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now,
      lastActive: now,
      displayName: insertUser.displayName || null,
      email: insertUser.email || null,
      profilePicture: insertUser.profilePicture || null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData, lastActive: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Test category methods
  async getCategory(id: number): Promise<TestCategory | undefined> {
    return this.categories.get(id);
  }
  
  async getAllCategories(): Promise<TestCategory[]> {
    return Array.from(this.categories.values());
  }
  
  async getCategoriesByLevel(level: string): Promise<TestCategory[]> {
    return Array.from(this.categories.values()).filter(
      (category) => category.level === level
    );
  }
  
  async createCategory(category: InsertTestCategory): Promise<TestCategory> {
    const id = this.categoryIdCounter++;
    const newCategory: TestCategory = { 
      ...category, 
      id,
      isActive: category.isActive === undefined ? true : category.isActive 
    };
    this.categories.set(id, newCategory);
    return newCategory;
  }
  
  // Test prompt methods
  async getPrompt(id: number): Promise<TestPrompt | undefined> {
    return this.prompts.get(id);
  }
  
  async getAllPrompts(): Promise<TestPrompt[]> {
    return Array.from(this.prompts.values());
  }
  
  async getPromptsByCategory(categoryId: number): Promise<TestPrompt[]> {
    return Array.from(this.prompts.values()).filter(
      (prompt) => prompt.categoryId === categoryId
    );
  }
  
  async getPromptsByType(type: string): Promise<TestPrompt[]> {
    return Array.from(this.prompts.values()).filter(
      (prompt) => prompt.type === type
    );
  }
  
  async getPromptsByDifficulty(difficulty: string): Promise<TestPrompt[]> {
    return Array.from(this.prompts.values()).filter(
      (prompt) => prompt.difficulty === difficulty
    );
  }
  
  async createPrompt(insertPrompt: InsertTestPrompt): Promise<TestPrompt> {
    const id = this.promptIdCounter++;
    const prompt: TestPrompt = { 
      ...insertPrompt, 
      id,
      categoryId: insertPrompt.categoryId || null,
      type: insertPrompt.type,
      prompt: insertPrompt.prompt,
      difficulty: insertPrompt.difficulty,
      tips: insertPrompt.tips || [],
      resourceUrl: insertPrompt.resourceUrl || null,
      timeLimit: insertPrompt.timeLimit || null
    };
    this.prompts.set(id, prompt);
    return prompt;
  }
  
  // Test result methods
  async getTestResult(id: number): Promise<TestResult | undefined> {
    return this.testResults.get(id);
  }
  
  async getTestResultsByUserId(userId: number): Promise<TestResult[]> {
    return Array.from(this.testResults.values())
      .filter((result) => result.userId === userId)
      .sort((a, b) => {
        // Handle null createdAt safely
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.getTime() - a.createdAt.getTime(); 
      }); // Sort by date desc
  }
  
  async getTestResultsByCategory(categoryId: number): Promise<TestResult[]> {
    return Array.from(this.testResults.values())
      .filter((result) => result.categoryId === categoryId);
  }
  
  async getLatestTestResultByUser(userId: number): Promise<TestResult | undefined> {
    const userResults = await this.getTestResultsByUserId(userId);
    return userResults.length > 0 ? userResults[0] : undefined;
  }
  
  async createTestResult(insertResult: InsertTestResult): Promise<TestResult> {
    const id = this.resultIdCounter++;
    const now = new Date();
    const result: TestResult = { 
      id,
      userId: insertResult.userId || null,
      categoryId: insertResult.categoryId || null,
      overallScore: insertResult.overallScore,
      pronunciationScore: insertResult.pronunciationScore,
      fluencyScore: insertResult.fluencyScore,
      vocabularyScore: insertResult.vocabularyScore,
      grammarScore: insertResult.grammarScore,
      listeningScore: insertResult.listeningScore || null,
      cefrLevel: insertResult.cefrLevel,
      strengths: insertResult.strengths || [],
      improvements: insertResult.improvements || [],
      recommendations: insertResult.recommendations || [],
      feedback: insertResult.feedback,
      testDuration: insertResult.testDuration || null,
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
  
  async getTestSubmissionsByPromptId(promptId: number): Promise<TestSubmission[]> {
    return Array.from(this.testSubmissions.values()).filter(
      (submission) => submission.promptId === promptId
    );
  }
  
  async createTestSubmission(insertSubmission: InsertTestSubmission): Promise<TestSubmission> {
    const id = this.submissionIdCounter++;
    const now = new Date();
    const submission: TestSubmission = { 
      id,
      testResultId: insertSubmission.testResultId || null,
      promptId: insertSubmission.promptId || null,
      audioUrl: insertSubmission.audioUrl || null,
      transcript: insertSubmission.transcript || null,
      evaluation: insertSubmission.evaluation || null,
      submittedAt: now,
      responseTime: insertSubmission.responseTime || null,
      isCorrect: insertSubmission.isCorrect || null
    };
    this.testSubmissions.set(id, submission);
    return submission;
  }
  
  // User progress methods
  async getUserProgress(userId: number): Promise<UserProgress | undefined> {
    return Array.from(this.progressRecords.values())
      .find(progress => progress.userId === userId);
  }
  
  async updateUserProgress(userId: number, progressData: Partial<UserProgress>): Promise<UserProgress | undefined> {
    const progress = await this.getUserProgress(userId);
    if (!progress) return undefined;
    
    const updatedProgress = { ...progress, ...progressData };
    this.progressRecords.set(progress.id, updatedProgress);
    return updatedProgress;
  }
  
  async createUserProgress(insertProgress: InsertUserProgress): Promise<UserProgress> {
    const id = this.progressIdCounter++;
    const progress: UserProgress = { 
      ...insertProgress, 
      id,
      userId: insertProgress.userId || null,
      testsCompleted: insertProgress.testsCompleted || 0,
      averageScore: insertProgress.averageScore || 0,
      currentCefrLevel: insertProgress.currentCefrLevel || "A2",
      strengths: insertProgress.strengths || [],
      improvementAreas: insertProgress.improvementAreas || [],
      lastTestDate: insertProgress.lastTestDate || null,
      totalPracticeTime: insertProgress.totalPracticeTime || 0
    };
    this.progressRecords.set(id, progress);
    return progress;
  }
  
  // Learning resources methods
  async getLearningResource(id: number): Promise<LearningResource | undefined> {
    return this.learningResources.get(id);
  }
  
  async getLearningResourcesByLevel(level: string): Promise<LearningResource[]> {
    return Array.from(this.learningResources.values())
      .filter(resource => resource.cefrLevel === level);
  }
  
  async getLearningResourcesBySkill(skill: string): Promise<LearningResource[]> {
    return Array.from(this.learningResources.values())
      .filter(resource => resource.skillFocus && resource.skillFocus.includes(skill));
  }
  
  async createLearningResource(insertResource: InsertLearningResource): Promise<LearningResource> {
    const id = this.resourceIdCounter++;
    const resource: LearningResource = { 
      ...insertResource, 
      id,
      skillFocus: insertResource.skillFocus || [],
      durationMinutes: insertResource.durationMinutes || null
    };
    this.learningResources.set(id, resource);
    return resource;
  }
}

export const storage = new MemStorage();

// Test Prompt related types
export interface TestPrompt {
  id: number;
  prompt: string;
  tips: string[];
}

// Audio recording related types
export type RecordingState = 'inactive' | 'recording' | 'paused' | 'stopping';

// Test result related types
export interface CategoryScore {
  score: number;
  feedback: string;
}

export interface TestFeedback {
  strengths: string[];
  improvements: string[];
  recommendations: string[];
}

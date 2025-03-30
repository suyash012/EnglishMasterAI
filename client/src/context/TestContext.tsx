import React, { createContext, useState, useContext, ReactNode } from 'react';

export interface TestResult {
  overallScore: number;
  vocabularyScore: number;
  grammarScore: number;
  phraseScore: number;
  fluencyScore?: number;
  pronunciationScore?: number;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  feedback: string;
  level?: string; // CEFR level (A2, B1, B2, C1)
  fallback?: boolean; // Flag for fallback evaluation
}

interface TestContextType {
  currentTab: 'intro' | 'test' | 'results';
  setCurrentTab: (tab: 'intro' | 'test' | 'results') => void;
  currentQuestion: number;
  setCurrentQuestion: (question: number) => void;
  testResults: TestResult[];
  addTestResult: (result: TestResult) => void;
  testCompleted: boolean;
  completeTest: () => void;
  resetTest: () => void;
}

const TestContext = createContext<TestContextType | undefined>(undefined);

export const TestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<'intro' | 'test' | 'results'>('intro');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testCompleted, setTestCompleted] = useState(false);

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const completeTest = () => {
    setTestCompleted(true);
  };

  const resetTest = () => {
    setCurrentQuestion(0);
    setTestResults([]);
    setTestCompleted(false);
  };

  return (
    <TestContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        currentQuestion,
        setCurrentQuestion,
        testResults,
        addTestResult,
        testCompleted,
        completeTest,
        resetTest
      }}
    >
      {children}
    </TestContext.Provider>
  );
};

export const useTest = () => {
  const context = useContext(TestContext);
  if (context === undefined) {
    throw new Error('useTest must be used within a TestProvider');
  }
  return context;
};

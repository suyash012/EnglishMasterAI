import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-your-api-key-here"
});

// Audio transcription function
export async function transcribeAudio(audioFilePath: string): Promise<string> {
  try {
    const audioReadStream = fs.createReadStream(audioFilePath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
    });

    return transcription.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

// Enhanced English evaluation function
export async function analyzeSpokenEnglish(transcript: string, prompt: string, testType?: string, difficulty?: string): Promise<{
  overallScore: number;
  pronunciationScore: number;
  fluencyScore: number;
  vocabularyScore: number;
  grammarScore: number;
  listeningScore?: number;
  cefrLevel: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  feedback: string;
  testDuration?: number;
}> {
  const systemPrompt = `
    You are an expert English language evaluator following CEFR standards. Analyze the provided transcription of spoken English based on the following criteria:
    
    1. Pronunciation: accuracy of phonemes, word stress, and intonation
    2. Fluency: speech rate, pausing patterns, and natural delivery
    3. Vocabulary usage: word choice, variety, appropriateness for context
    4. Grammar accuracy: sentence structure, tense usage, grammatical correctness
    ${testType === 'listening_comprehension' ? '5. Active Listening: comprehension and appropriate responses to audio stimuli' : ''}
    
    The speaker was responding to this prompt: "${prompt}"
    ${testType ? `This was a ${testType.replace('_', ' ')} task.` : ''}
    ${difficulty ? `The expected proficiency level is ${difficulty}.` : ''}
    
    Provide a detailed assessment with numerical scores (0-100) for each category and an overall score.
    Determine the appropriate CEFR level (A1, A2, B1, B2, C1, or C2) based on the performance.
    Also include specific strengths, areas for improvement, and learning recommendations.
    
    Respond with a JSON object in the following format:
    {
      "overallScore": number (0-100),
      "pronunciationScore": number (0-100),
      "fluencyScore": number (0-100),
      "vocabularyScore": number (0-100),
      "grammarScore": number (0-100),
      ${testType === 'listening_comprehension' ? '"listeningScore": number (0-100),' : ''}
      "cefrLevel": string (one of: "A1", "A2", "B1", "B2", "C1", "C2"),
      "strengths": [string, string, string],
      "improvements": [string, string, string],
      "recommendations": [string, string, string],
      "feedback": string (2-3 sentence summary of overall performance)
    }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: transcript
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);

    // Validate and normalize scores
    return {
      overallScore: Math.max(0, Math.min(100, Math.round(result.overallScore))),
      pronunciationScore: Math.max(0, Math.min(100, Math.round(result.pronunciationScore))),
      fluencyScore: Math.max(0, Math.min(100, Math.round(result.fluencyScore))),
      vocabularyScore: Math.max(0, Math.min(100, Math.round(result.vocabularyScore))),
      grammarScore: Math.max(0, Math.min(100, Math.round(result.grammarScore))),
      listeningScore: result.listeningScore ? Math.max(0, Math.min(100, Math.round(result.listeningScore))) : undefined,
      cefrLevel: result.cefrLevel || 'B1', // Default to B1 if not provided
      strengths: result.strengths.slice(0, 3),
      improvements: result.improvements.slice(0, 3),
      recommendations: result.recommendations.slice(0, 3),
      feedback: result.feedback
    };
  } catch (error) {
    console.error("Error analyzing spoken English:", error);
    throw new Error(`Failed to analyze spoken English: ${error.message}`);
  }
}

// Function to determine CEFR level from scores
export function determineCEFRLevel(scores: {
  pronunciationScore: number;
  fluencyScore: number;
  vocabularyScore: number;
  grammarScore: number;
  listeningScore?: number;
}): string {
  // Calculate average score
  const scoreValues = [
    scores.pronunciationScore, 
    scores.fluencyScore, 
    scores.vocabularyScore, 
    scores.grammarScore
  ];
  
  if (scores.listeningScore) {
    scoreValues.push(scores.listeningScore);
  }
  
  const avgScore = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length;
  
  // Map average score to CEFR level
  if (avgScore >= 90) return 'C2';
  if (avgScore >= 80) return 'C1';
  if (avgScore >= 70) return 'B2';
  if (avgScore >= 60) return 'B1';
  if (avgScore >= 50) return 'A2';
  return 'A1';
}

// Function to analyze an image description (for picture description tasks)
export async function analyzeImageDescription(transcript: string, imagePrompt: string): Promise<{
  overallScore: number;
  pronunciationScore: number;
  fluencyScore: number;
  vocabularyScore: number;
  grammarScore: number;
  cefrLevel: string;
  imageComprehension: number;
  detailLevel: number;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  feedback: string;
}> {
  const systemPrompt = `
    You are an expert English language evaluator. Analyze the provided transcription of a spoken image description based on the following criteria:
    
    1. Pronunciation: accuracy of phonemes, word stress, and intonation
    2. Fluency: speech rate, pausing patterns, and natural delivery
    3. Vocabulary usage: word choice, variety, appropriateness for context
    4. Grammar accuracy: sentence structure, tense usage, grammatical correctness
    5. Image comprehension: accurate interpretation of the visual content
    6. Detail level: ability to describe elements, relationships, and implications
    
    The image prompt was: "${imagePrompt}"
    
    Provide a detailed assessment with numerical scores (0-100) for each category and an overall score.
    Determine the appropriate CEFR level (A1, A2, B1, B2, C1, or C2) based on the performance.
    Also include specific strengths, areas for improvement, and learning recommendations.
    
    Respond with a JSON object in the following format:
    {
      "overallScore": number (0-100),
      "pronunciationScore": number (0-100),
      "fluencyScore": number (0-100),
      "vocabularyScore": number (0-100),
      "grammarScore": number (0-100),
      "cefrLevel": string (one of: "A1", "A2", "B1", "B2", "C1", "C2"),
      "imageComprehension": number (0-100),
      "detailLevel": number (0-100),
      "strengths": [string, string, string],
      "improvements": [string, string, string],
      "recommendations": [string, string, string],
      "feedback": string (2-3 sentence summary of overall performance)
    }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: transcript
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);

    // Validate and normalize scores
    return {
      overallScore: Math.max(0, Math.min(100, Math.round(result.overallScore))),
      pronunciationScore: Math.max(0, Math.min(100, Math.round(result.pronunciationScore))),
      fluencyScore: Math.max(0, Math.min(100, Math.round(result.fluencyScore))),
      vocabularyScore: Math.max(0, Math.min(100, Math.round(result.vocabularyScore))),
      grammarScore: Math.max(0, Math.min(100, Math.round(result.grammarScore))),
      cefrLevel: result.cefrLevel || 'B1',
      imageComprehension: Math.max(0, Math.min(100, Math.round(result.imageComprehension))),
      detailLevel: Math.max(0, Math.min(100, Math.round(result.detailLevel))),
      strengths: result.strengths.slice(0, 3),
      improvements: result.improvements.slice(0, 3),
      recommendations: result.recommendations.slice(0, 3),
      feedback: result.feedback
    };
  } catch (error) {
    console.error("Error analyzing image description:", error);
    throw new Error(`Failed to analyze image description: ${error.message}`);
  }
}

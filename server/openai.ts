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

// English evaluation function
export async function analyzeSpokenEnglish(transcript: string, prompt: string): Promise<{
  overallScore: number;
  vocabularyScore: number;
  grammarScore: number;
  phraseScore: number;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  feedback: string;
}> {
  const systemPrompt = `
    You are an expert English language evaluator. Analyze the provided transcription of spoken English based on the following criteria:
    
    1. Vocabulary usage: word choice, variety, appropriateness for context
    2. Grammar accuracy: sentence structure, tense usage, grammatical correctness
    3. Phrase construction: use of natural expressions and idioms
    
    The speaker was responding to this prompt: "${prompt}"
    
    Provide a detailed assessment with numerical scores (0-100) for each category and an overall score.
    Also include specific strengths, areas for improvement, and learning recommendations.
    
    Respond with a JSON object in the following format:
    {
      "overallScore": number (0-100),
      "vocabularyScore": number (0-100),
      "grammarScore": number (0-100),
      "phraseScore": number (0-100),
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
      vocabularyScore: Math.max(0, Math.min(100, Math.round(result.vocabularyScore))),
      grammarScore: Math.max(0, Math.min(100, Math.round(result.grammarScore))),
      phraseScore: Math.max(0, Math.min(100, Math.round(result.phraseScore))),
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

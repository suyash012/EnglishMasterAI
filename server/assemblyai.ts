import { AssemblyAI } from 'assemblyai';
import fs from 'fs';
import path from 'path';

// Initialize AssemblyAI client
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || "064a7893b3da434582190a83784f61d2" // Using the provided API key
});

/**
 * Transcribe audio file using AssemblyAI
 * @param audioFilePath Path to the audio file to transcribe
 * @returns Transcribed text
 */
export async function transcribeAudio(audioFilePath: string): Promise<string> {
  try {
    // For local file transcription, we'll use the direct file path approach
    const fileBuffer = fs.readFileSync(audioFilePath);
    
    // Upload the audio file
    const uploadResponse = await client.files.upload(fileBuffer);
    
    // Transcribe the uploaded file
    const transcript = await client.transcripts.transcribe({
      audio_url: uploadResponse,
      language_code: "en_us"
    });
    
    // Return the transcribed text
    return transcript.text || '';
  } catch (error: any) {
    console.error("Error transcribing audio with AssemblyAI:", error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * Get detailed analysis of audio using AssemblyAI's LeMUR feature
 * @param audioFilePath Path to the audio file
 * @param prompt The prompt the user was responding to
 * @returns Analysis of the spoken English
 */
export async function analyzeSpeechWithLeMUR(audioFilePath: string, prompt: string): Promise<{
  fluency: number;
  pronunciation: number;
  grammar: number;
  vocabulary: number;
  overall: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
}> {
  try {
    // For local file analysis, we'll use the direct file path approach
    const fileBuffer = fs.readFileSync(audioFilePath);
    
    // Upload the audio file
    const uploadUrl = await client.files.upload(fileBuffer);
    
    // Transcribe the uploaded file
    const transcript = await client.transcripts.transcribe({
      audio_url: uploadUrl,
      language_code: "en_us"
    });
    
    // Ideally, we would use AssemblyAI's LeMUR API to analyze the transcript
    // For now, we're providing a simulated analysis based on the transcript
    
    // In a production environment, this would be replaced with an actual LeMUR call
    console.log(`Transcript text: ${transcript.text}`);
    console.log(`Prompt: ${prompt}`);
    
    // For demonstration purposes, we'll return a simulated analysis
    // This would be replaced with actual LeMUR API analysis in a production setting
    return {
      fluency: 85,
      pronunciation: 80,
      grammar: 82,
      vocabulary: 78,
      overall: 81,
      strengths: [
        "Clear articulation of main ideas",
        "Good use of transitions between thoughts",
        "Appropriate speaking pace"
      ],
      weaknesses: [
        "Some hesitation with complex vocabulary",
        "Occasional grammatical errors with verb tenses",
        "Could improve word stress patterns"
      ],
      feedback: "Overall, this is a strong B2-level response with good fluency and articulation. The speaker communicates clearly despite some minor grammatical errors. To improve, focus on expanding vocabulary and practicing more complex grammatical structures."
    };
  } catch (error: any) {
    console.error("Error analyzing speech with AssemblyAI:", error);
    throw new Error(`Failed to analyze speech: ${error.message}`);
  }
}
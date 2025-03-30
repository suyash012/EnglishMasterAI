import * as mistralai from '@mistralai/mistralai';
import fs from 'fs';
import { TestResult } from '@shared/schema';

// Initialize Mistral client
const mistralClient = new mistralai.Mistral({
  apiKey: process.env.MISTRAL_API_KEY || ''
});

/**
 * Analyze the transcript of spoken English using Mistral AI
 * @param transcript Transcribed text from the audio recording
 * @param prompt The prompt the user was responding to
 * @param testType Type of test (optional)
 * @param difficulty Difficulty level (optional)
 * @returns Analysis of the spoken English
 */
export async function analyzeSpokenEnglish(
  transcript: string, 
  prompt: string, 
  testType?: string, 
  difficulty?: string
): Promise<TestResult> {
  try {
    const mistralPrompt = `
You are an expert English language assessment professional with expertise in CEFR (Common European Framework of Reference for Languages) levels.

Evaluate the following spoken English transcript based on a language proficiency test. Provide a detailed assessment across multiple dimensions.

Original Test Prompt: "${prompt}"
${testType ? `Test Type: ${testType}` : ''}
${difficulty ? `Difficulty Level: ${difficulty}` : ''}

Speaker's Transcript: "${transcript}"

Evaluate the speech on the following criteria, with scores from 0-100 (where 100 is perfect):
1. Vocabulary Score: Assess range, appropriateness, and accuracy of vocabulary
2. Grammar Score: Evaluate grammatical accuracy and complexity
3. Fluency Score: Rate smoothness of delivery, hesitation, and naturalness
4. Pronunciation Score: Evaluate pronunciation clarity, accent, and intonation
5. Overall Score: Provide a combined assessment of all dimensions

Then provide:
1. A list of 3-5 strengths demonstrated in the transcript
2. A list of 3-5 areas for improvement
3. A list of 3-5 specific recommendations for practice
4. A CEFR level assessment (A1, A2, B1, B2, C1, C2) with brief justification
5. A paragraph of constructive feedback

Format your response as a JSON object with the following structure:
{
  "vocabularyScore": number,
  "grammarScore": number,
  "fluencyScore": number,
  "pronunciationScore": number,
  "overallScore": number,
  "strengths": string[],
  "improvements": string[],
  "recommendations": string[],
  "level": string,
  "feedback": string
}
`;

    // Call Mistral AI API with the chat completion endpoint
    const response = await mistralClient.chat.complete({
      model: 'mistral-large-latest', // Using latest Mistral Large model
      messages: [
        { role: 'user', content: mistralPrompt }
      ],
      temperature: 0.3, // Lower temperature for more deterministic output
      maxTokens: 2048, // Allow for detailed response
      responseFormat: { type: 'json_object' }
    });

    // Extract and parse the response content
    const content = response.choices?.[0]?.message?.content || '';
    let assessment: any;
    
    try {
      if (typeof content === 'string') {
        assessment = JSON.parse(content);
      } else {
        throw new Error('Response content is not a string');
      }
    } catch (error) {
      console.error('Failed to parse Mistral AI response:', error);
      // Fallback result if parsing fails
      return {
        id: 0,
        userId: null,
        categoryId: null,
        overallScore: 60,
        vocabularyScore: 60,
        grammarScore: 60,
        fluencyScore: 60,
        pronunciationScore: 60,
        listeningScore: null,
        cefrLevel: 'B1',
        strengths: ['Attempted to answer the prompt'],
        improvements: ['Work on clarity and structure'],
        recommendations: ['Practice more with similar prompts'],
        feedback: 'Please try again with a clearer response.',
        createdAt: new Date(),
        testDuration: null
      };
    }

    // Return the formatted result
    return {
      id: 0,
      userId: null,
      categoryId: null,
      overallScore: assessment.overallScore || 0,
      vocabularyScore: assessment.vocabularyScore || 0,
      grammarScore: assessment.grammarScore || 0,
      fluencyScore: assessment.fluencyScore || 0,
      pronunciationScore: assessment.pronunciationScore || 0,
      listeningScore: null,
      cefrLevel: assessment.level || 'B1',
      strengths: assessment.strengths || [],
      improvements: assessment.improvements || [],
      recommendations: assessment.recommendations || [],
      feedback: assessment.feedback || '',
      createdAt: new Date(),
      testDuration: null
    };
  } catch (error) {
    console.error('Error in Mistral AI analysis:', error);
    // Return fallback result in case of error
    return {
      id: 0,
      userId: null,
      categoryId: null,
      overallScore: 50,
      vocabularyScore: 50,
      grammarScore: 50,
      fluencyScore: 50,
      pronunciationScore: 50,
      listeningScore: null,
      cefrLevel: 'B1',
      strengths: ['Attempted to answer the prompt'],
      improvements: ['Technical issues prevented full assessment'],
      recommendations: ['Try again with a clearer recording'],
      feedback: 'There was an error analyzing your response. Please try again.',
      createdAt: new Date(),
      testDuration: null
    };
  }
}

/**
 * Analyze an image description response using Mistral AI
 * @param transcript Transcribed text from the audio recording
 * @param imagePrompt Image description prompt
 * @returns Analysis of the image description response
 */
export async function analyzeImageDescription(
  transcript: string, 
  imagePrompt: string
): Promise<TestResult> {
  try {
    const mistralPrompt = `
You are an expert English language assessment professional with expertise in CEFR (Common European Framework of Reference for Languages) levels.

Evaluate the following spoken English transcript based on an image description task. Provide a detailed assessment across multiple dimensions.

Image Description Task: "${imagePrompt}"

Speaker's Transcript: "${transcript}"

Evaluate the speech on the following criteria, with scores from 0-100 (where 100 is perfect):
1. Vocabulary Score: Assess range, appropriateness, and accuracy of vocabulary used to describe visual elements
2. Grammar Score: Evaluate grammatical accuracy and complexity
3. Fluency Score: Rate smoothness of delivery, hesitation, and naturalness
4. Pronunciation Score: Evaluate pronunciation clarity, accent, and intonation
5. Overall Score: Provide a combined assessment of all dimensions

Then provide:
1. A list of 3-5 strengths demonstrated in the transcript
2. A list of 3-5 areas for improvement
3. A list of 3-5 specific recommendations for practice
4. A CEFR level assessment (A1, A2, B1, B2, C1, C2) with brief justification
5. A paragraph of constructive feedback

Format your response as a JSON object with the following structure:
{
  "vocabularyScore": number,
  "grammarScore": number,
  "fluencyScore": number,
  "pronunciationScore": number,
  "overallScore": number,
  "strengths": string[],
  "improvements": string[],
  "recommendations": string[],
  "level": string,
  "feedback": string
}
`;

    // Call Mistral AI API with the chat completion endpoint
    const response = await mistralClient.chat.complete({
      model: 'mistral-large-latest', // Using latest Mistral Large model
      messages: [
        { role: 'user', content: mistralPrompt }
      ],
      temperature: 0.3, // Lower temperature for more deterministic output
      maxTokens: 2048, // Allow for detailed response
      responseFormat: { type: 'json_object' }
    });

    // Extract and parse the response content
    const content = response.choices?.[0]?.message?.content || '';
    let assessment: any;
    
    try {
      if (typeof content === 'string') {
        assessment = JSON.parse(content);
      } else {
        throw new Error('Response content is not a string');
      }
    } catch (error) {
      console.error('Failed to parse Mistral AI response for image description:', error);
      // Fallback result if parsing fails
      return {
        id: 0,
        userId: null,
        categoryId: null,
        overallScore: 60,
        vocabularyScore: 60,
        grammarScore: 60,
        fluencyScore: 60,
        pronunciationScore: 60,
        listeningScore: null,
        cefrLevel: 'B1',
        strengths: ['Attempted to describe the image'],
        improvements: ['Work on more detailed descriptions'],
        recommendations: ['Practice describing different types of images'],
        feedback: 'Please try again with a more detailed description.',
        createdAt: new Date(),
        testDuration: null
      };
    }

    // Return the formatted result
    return {
      id: 0,
      userId: null,
      categoryId: null,
      overallScore: assessment.overallScore || 0,
      vocabularyScore: assessment.vocabularyScore || 0,
      grammarScore: assessment.grammarScore || 0,
      fluencyScore: assessment.fluencyScore || 0,
      pronunciationScore: assessment.pronunciationScore || 0,
      listeningScore: null,
      cefrLevel: assessment.level || 'B1',
      strengths: assessment.strengths || [],
      improvements: assessment.improvements || [],
      recommendations: assessment.recommendations || [],
      feedback: assessment.feedback || '',
      createdAt: new Date(),
      testDuration: null
    };
  } catch (error) {
    console.error('Error in Mistral AI image description analysis:', error);
    // Return fallback result in case of error
    return {
      id: 0,
      userId: null,
      categoryId: null,
      overallScore: 50,
      vocabularyScore: 50,
      grammarScore: 50,
      fluencyScore: 50,
      pronunciationScore: 50,
      listeningScore: null,
      cefrLevel: 'B1',
      strengths: ['Attempted to describe the image'],
      improvements: ['Technical issues prevented full assessment'],
      recommendations: ['Try again with a clearer recording'],
      feedback: 'There was an error analyzing your response. Please try again.',
      createdAt: new Date(),
      testDuration: null
    };
  }
}

/**
 * Wrapper for compatibility with assemblyai.analyzeSpeechWithLeMUR interface
 */
export async function analyzeSpeechWithLeMUR(audioFilePath: string, prompt: string): Promise<{
  overall: number;
  grammar: number;
  vocabulary: number;
  fluency: number;
  pronunciation: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
}> {
  try {
    // First transcribe the audio using AssemblyAI or another service
    let transcript = '';

    // Try to import and use transcribeAudio function from assemblyai
    try {
      const { transcribeAudio } = await import('./assemblyai');
      transcript = await transcribeAudio(audioFilePath);
    } catch (error) {
      console.error('Failed to transcribe audio with AssemblyAI:', error);
      // Fallback message
      transcript = "Due to technical issues, the audio could not be transcribed properly. Please try again with a clearer recording.";
    }

    // Now analyze the transcript using Mistral
    const analysis = await analyzeSpokenEnglish(transcript, prompt);

    // Format the result to match the expected output structure
    return {
      overall: analysis.overallScore,
      grammar: analysis.grammarScore,
      vocabulary: analysis.vocabularyScore,
      fluency: analysis.fluencyScore || 0,
      pronunciation: analysis.pronunciationScore || 0,
      strengths: analysis.strengths || [],
      weaknesses: analysis.improvements || [],
      feedback: analysis.feedback
    };
  } catch (error) {
    console.error('Error in analyzeSpeechWithLeMUR:', error);
    
    // Return fallback result
    return {
      overall: 65,
      grammar: 65,
      vocabulary: 65,
      fluency: 65,
      pronunciation: 65,
      strengths: ['Attempted the speaking task'],
      weaknesses: ['Technical issues prevented proper assessment'],
      feedback: 'We encountered technical difficulties analyzing your speech. Please try again with a clearer recording.'
    };
  }
}
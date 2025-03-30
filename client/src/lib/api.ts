import { apiRequest } from "@/lib/queryClient";
import { TestResult } from "@/context/TestContext";

// Function to upload audio and get transcription
export async function uploadAudio(audioBlob: Blob, promptId: number): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('promptId', promptId.toString());

  const response = await fetch('/api/submit-audio', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload audio: ${response.statusText}`);
  }

  const data = await response.json();
  return data.transcript;
}

// Function to evaluate transcription
export async function evaluateTranscription(transcript: string, promptId: number): Promise<TestResult> {
  const response = await apiRequest('POST', '/api/evaluate', {
    transcript,
    promptId
  });

  if (!response.ok) {
    throw new Error(`Failed to evaluate transcription: ${response.statusText}`);
  }

  return await response.json();
}

// Function to submit final test results
export async function submitTestResults(testResult: TestResult) {
  const response = await apiRequest('POST', '/api/submit-test-results', testResult);
  
  if (!response.ok) {
    throw new Error(`Failed to submit test results: ${response.statusText}`);
  }

  return await response.json();
}

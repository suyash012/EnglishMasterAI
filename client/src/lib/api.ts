import { apiRequest } from "@/lib/queryClient";
import { TestResult } from "@/context/TestContext";

// Function to upload audio and get transcription with optional direct analysis
export async function uploadAudio(audioBlob: Blob, promptId: number, analyzeDirectly: boolean = false): Promise<{
  transcript: string;
  evaluation?: TestResult;
}> {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('promptId', promptId.toString());
  
  // Add flag for direct analysis if requested
  if (analyzeDirectly) {
    formData.append('analyze', 'true');
  }

  const response = await fetch('/api/submit-audio', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload audio: ${response.statusText}`);
  }

  const data = await response.json();
  
  // If we get both a transcript and evaluation, return both
  if (data.transcript && data.evaluation) {
    return {
      transcript: data.transcript,
      evaluation: data.evaluation as TestResult
    };
  }
  
  // Otherwise just return the transcript
  return { transcript: data.transcript };
}

// Function to evaluate transcription separately
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

import { apiRequest } from "@/lib/queryClient";
import { TestResult } from "@/context/TestContext";

// Function to upload audio and get transcription with optional direct analysis
export async function uploadAudio(audioBlob: Blob, promptId: number, analyzeDirectly: boolean = false): Promise<{
  transcript: string;
  evaluation?: TestResult;
}> {
  // Validate input parameters
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('Invalid audio data: The audio recording appears to be empty');
  }
  
  if (isNaN(promptId) || promptId < 0) {
    throw new Error('Invalid prompt ID');
  }
  
  // Create form data with proper naming
  const formData = new FormData();
  
  // Add a timestamp to make the filename more unique
  const timestamp = new Date().getTime();
  const filename = `recording_${promptId}_${timestamp}.webm`;
  
  // Create a properly named file from the blob
  const audioFile = new File([audioBlob], filename, {
    type: audioBlob.type || 'audio/webm'
  });
  
  formData.append('audio', audioFile);
  formData.append('promptId', promptId.toString());
  
  // Add flag for direct analysis if requested
  if (analyzeDirectly) {
    formData.append('analyze', 'true');
  }

  console.log(`Uploading audio file: ${filename}, size: ${audioBlob.size} bytes`);
  
  try {
    const response = await fetch('/api/submit-audio', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data) {
      throw new Error('Empty response from server');
    }
    
    // If we get both a transcript and evaluation, return both
    if (data.transcript && data.evaluation) {
      console.log('Received both transcript and evaluation from server');
      return {
        transcript: data.transcript,
        evaluation: data.evaluation as TestResult
      };
    }
    
    // Check if we at least have a transcript
    if (!data.transcript) {
      throw new Error('No transcript returned from server');
    }
    
    // Otherwise just return the transcript
    console.log('Received transcript only from server');
    return { transcript: data.transcript };
  } catch (error) {
    console.error('Error uploading audio:', error);
    throw error;
  }
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

import { useState, useEffect, FC } from "react";
import { useTest } from "@/context/TestContext";
import { useRecorder } from "@/hooks/useRecorder";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { TestPrompt } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { uploadAudio, evaluateTranscription } from "@/lib/api";

interface TestTabProps {
  prompts: TestPrompt[];
}

const TestTab: FC<TestTabProps> = ({ prompts }) => {
  const { toast } = useToast();
  const { 
    currentQuestion, 
    setCurrentQuestion, 
    addTestResult, 
    completeTest, 
    setCurrentTab,
    resetTest
  } = useTest();
  
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);
  
  const { 
    isRecording, 
    recordingState,
    recordingTime,
    startRecording, 
    stopRecording, 
    audioBlob, 
    resetRecording 
  } = useRecorder();

  // Get the current prompt time limit
  const currentPromptTimeLimit = prompts[currentQuestion]?.timeLimit || 60;
  
  // Reset for new question
  useEffect(() => {
    setTimeRemaining(currentPromptTimeLimit);
    setTimerActive(false);
    setRecordingComplete(false);
    resetRecording();
  }, [currentQuestion, resetRecording, currentPromptTimeLimit]);

  // Timer logic for countdown - completely rewritten
  useEffect(() => {
    // Only create one interval that runs when timerActive is true
    let timerInterval: NodeJS.Timeout | null = null;
    
    if (timerActive && timeRemaining > 0) {
      // Create a single interval for countdown
      timerInterval = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            // Auto-stop recording if time runs out
            if (isRecording) {
              stopRecording();
              setRecordingComplete(true);
              toast({
                title: "Time's up!",
                description: "Your recording has been automatically saved.",
                variant: "default"
              });
            }
            
            // Clear the interval
            if (timerInterval) {
              clearInterval(timerInterval);
            }
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }
    
    // Cleanup function
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerActive, isRecording, stopRecording, toast]);
  
  // Track recording state to update UI
  useEffect(() => {
    if (!isRecording && recordingState === 'inactive' && recordingComplete) {
      // Recording has completed
      setTimerActive(false);
    }
  }, [isRecording, recordingState, recordingComplete]);

  // Calculate progress
  const progress = ((currentQuestion + 1) / prompts.length) * 100;

  // Handle recording with clear debugging
  const handleRecording = async () => {
    try {
      if (!isRecording) {
        console.log('Starting recording...');
        
        // Reset UI states first
        setRecordingComplete(false);
        setTimerActive(false);
        
        // Start recording and wait for it to initialize
        await startRecording();
        
        // Update timer state after recording starts
        setTimerActive(true);
        
        console.log('Recording started successfully!');
      } else {
        console.log('Stopping recording...');
        
        // Stop timer first
        setTimerActive(false);
        
        // Then stop recording
        stopRecording();
        
        // Update UI state
        setRecordingComplete(true);
        
        console.log('Recording stopped successfully!');
        
        // Show feedback to user
        toast({
          title: "Recording Complete",
          description: "Your response has been recorded. Click 'Submit Answer' to continue.",
          variant: "default"
        });
      }
    } catch (err) {
      console.error('Error in handleRecording:', err);
      
      // Reset states on error
      setTimerActive(false);
      resetRecording();
      
      // Notify user with detailed error message
      toast({
        title: "Recording Error",
        description: "There was a problem with the microphone. Please make sure your microphone is connected and browser permissions are granted.",
        variant: "destructive"
      });
    }
  };

  // Handle submitting audio for transcription and analysis
  const submitAudioMutation = useMutation({
    mutationFn: async () => {
      if (!audioBlob) throw new Error("No audio recorded");
      
      // Use the updated API function with direct analysis enabled
      // This will use AssemblyAI for both transcription and analysis in one request
      return await uploadAudio(audioBlob, prompts[currentQuestion].id, true);
    },
    onSuccess: (data) => {
      // If we got both transcript and evaluation in one go
      if (data.evaluation) {
        // Add result to context
        addTestResult(data.evaluation);
        
        // Move to next question or finish test
        if (currentQuestion < prompts.length - 1) {
          setCurrentQuestion(currentQuestion + 1);
        } else {
          completeTest();
          setCurrentTab('results');
        }
      } else {
        // If we only got transcript, submit for evaluation separately
        evaluateTranscriptMutation.mutate({
          transcript: data.transcript,
          promptId: prompts[currentQuestion].id
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to process audio: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Handle evaluation as a separate step (fallback if direct analysis isn't available)
  const evaluateTranscriptMutation = useMutation({
    mutationFn: async (data: { transcript: string, promptId: number }) => {
      return await evaluateTranscription(data.transcript, data.promptId);
    },
    onSuccess: (data) => {
      // Add result to context
      addTestResult(data);
      
      // Move to next question or finish test
      if (currentQuestion < prompts.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        completeTest();
        setCurrentTab('results');
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to evaluate response: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Handle next question
  const handleNextQuestion = () => {
    if (recordingComplete && audioBlob) {
      submitAudioMutation.mutate();
    } else {
      // Skip without evaluation
      if (currentQuestion < prompts.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        resetTest();
        setCurrentTab('intro');
        toast({
          title: "Test incomplete",
          description: "You must record answers to complete the test.",
          variant: "destructive"
        });
      }
    }
  };

  // Loading state for processing
  const isProcessing = submitAudioMutation.isPending || evaluateTranscriptMutation.isPending;

  return (
    <div className="fade-in">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium text-gray-800">
              Question {currentQuestion + 1} of {prompts.length}
            </h2>
            
            <div className={`flex items-center font-medium ${timeRemaining < 10 ? 'text-error' : 'text-gray-700'}`}>
              <span className="material-icons mr-1">timer</span>
              <span>{timeRemaining}s remaining</span>
            </div>
          </div>
          
          <div className="bg-neutral-100 p-5 rounded-lg mb-6">
            <div className="flex items-start mb-2">
              <span className="material-icons text-primary mt-1 mr-2">
                {prompts[currentQuestion].type === 'picture_description' ? 'image' : 
                 prompts[currentQuestion].type === 'read_aloud' ? 'menu_book' :
                 prompts[currentQuestion].type === 'listening_comprehension' ? 'hearing' :
                 prompts[currentQuestion].type === 'role_play' ? 'people' : 'assignment'}
              </span>
              <div>
                <span className="text-gray-600 text-sm font-medium block mb-1">
                  {prompts[currentQuestion].type && 
                    prompts[currentQuestion].type.replace(/_/g, ' ').toUpperCase()}
                </span>
                <h3 className="text-lg font-medium text-gray-800 mb-3">
                  {prompts[currentQuestion].prompt}
                </h3>
              </div>
            </div>
            
            {/* Display resource image for picture description */}
            {prompts[currentQuestion].type === 'picture_description' && prompts[currentQuestion].resourceUrl && (
              <div className="my-4 border border-gray-200 rounded-lg overflow-hidden">
                <img 
                  src={prompts[currentQuestion].resourceUrl} 
                  alt="Describe this image"
                  className="w-full object-cover h-64"
                />
              </div>
            )}
            
            {/* Display audio player for listening comprehension */}
            {prompts[currentQuestion].type === 'listening_comprehension' && prompts[currentQuestion].resourceUrl && (
              <div className="my-4 p-3 border border-gray-200 rounded-lg bg-white">
                <p className="text-sm text-gray-600 mb-2">Listen to the audio:</p>
                <audio 
                  controls 
                  className="w-full" 
                  src={prompts[currentQuestion].resourceUrl}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
            
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Consider mentioning:
              </p>
              {Array.isArray(prompts[currentQuestion].tips) && prompts[currentQuestion].tips.length > 0 ? (
                <ul className="list-disc pl-5 text-gray-600 text-sm">
                  {prompts[currentQuestion].tips.map((tip, index) => (
                    <li key={index} className="mt-1">{tip}</li>
                  ))}
                </ul>
              ) : (
                <ul className="list-disc pl-5 text-gray-600 text-sm">
                  <li className="mt-1">Start speaking naturally about the topic.</li>
                </ul>
              )}
            </div>
            
            {prompts[currentQuestion].difficulty && (
              <div className="mt-4 text-xs inline-block">
                <span className={`py-1 px-2 rounded-full ${
                  prompts[currentQuestion].difficulty === 'beginner' ? 'bg-green-100 text-green-800' : 
                  prompts[currentQuestion].difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  {prompts[currentQuestion].difficulty.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          {isRecording && (
            <div className="mb-6 bg-error bg-opacity-10 p-5 rounded-lg border border-error">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="relative flex h-4 w-4 mr-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-error"></span>
                    </div>
                    <div>
                      <p className="text-error font-semibold">Recording in progress</p>
                      <p className="text-sm text-gray-600 mt-1">Speaking time: {recordingTime} seconds</p>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-error flex items-center">
                    <span className="material-icons mr-1 animate-pulse">mic</span>
                    REC
                  </div>
                </div>
                
                {/* Audio waveform visualization */}
                <div className="w-full h-16 bg-white rounded-md overflow-hidden relative border border-error border-opacity-30">
                  <div className="absolute inset-0 flex items-end justify-between px-1 py-1">
                    {/* Create 30 bars for the audio visualization */}
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div 
                        key={i}
                        className="audio-bar w-1 rounded-full"
                        style={{ 
                          height: `${Math.max(15, Math.abs(Math.sin(i * 0.3 + recordingTime * 0.2) * 50))}%`,
                          animationDelay: `${i * 0.05}s`
                        }}
                      ></div>
                    ))}
                  </div>
                  
                  {/* Recording time display */}
                  <div className="absolute top-1 right-2 bg-error bg-opacity-10 text-error font-mono text-xs px-2 py-1 rounded-full">
                    {recordingTime}s
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {recordingComplete && (
            <div className="mb-6 bg-success bg-opacity-10 p-5 rounded-lg border border-success">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="material-icons text-success mr-2">check_circle</span>
                  <div>
                    <p className="text-success font-semibold">Recording completed!</p>
                    <p className="text-sm text-gray-600 mt-1">Your answer has been saved. Duration: {recordingTime} seconds</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setRecordingComplete(false);
                    resetRecording();
                  }}
                  disabled={isProcessing}
                  className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Record again
                </button>
              </div>
            </div>
          )}
          
          {isProcessing && (
            <div className="mb-6 bg-secondary bg-opacity-10 p-5 rounded-lg border border-secondary">
              <div className="flex items-center">
                <span className="material-icons text-secondary animate-spin mr-2">autorenew</span>
                <div>
                  <p className="text-secondary font-semibold">Processing your answer...</p>
                  <p className="text-sm text-gray-600 mt-1">This might take a few seconds. Please wait.</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div>
              <button
                onClick={handleNextQuestion}
                disabled={isRecording || isProcessing}
                className="px-4 py-2 text-neutral-300 hover:text-neutral-400 transition disabled:opacity-50"
              >
                Skip Question
              </button>
            </div>
            
            <div className="flex space-x-3">
              {!recordingComplete ? (
                <button 
                  onClick={handleRecording}
                  disabled={isProcessing}
                  className={`flex items-center px-6 py-2 text-white rounded-md transition disabled:opacity-50 ${isRecording ? 'bg-neutral-400 hover:bg-neutral-500' : 'bg-error hover:bg-error-dark'}`}
                >
                  <span className="material-icons mr-1">mic</span>
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
              ) : (
                <div className="flex space-x-3">
                  <button 
                    onClick={(e) => {
                      e.preventDefault(); // Prevent double clicks
                      if (!isProcessing && audioBlob && audioBlob.size > 0) {
                        console.log('Submitting answer with audio size:', audioBlob.size);
                        submitAudioMutation.mutate();
                      } else {
                        console.error('Cannot submit: audioBlob missing or processing already in progress');
                        toast({
                          title: "Error",
                          description: "Cannot submit recording. Please try recording again.",
                          variant: "destructive"
                        });
                      }
                    }}
                    disabled={isProcessing || !audioBlob || audioBlob.size === 0}
                    className="flex items-center px-6 py-2 bg-success text-white rounded-md hover:bg-green-700 transition disabled:opacity-50"
                  >
                    <span className="material-icons mr-1">check</span>
                    Submit Answer
                  </button>
                  
                  <button 
                    onClick={handleNextQuestion}
                    disabled={isProcessing}
                    className="flex items-center px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition disabled:opacity-50"
                  >
                    {currentQuestion < prompts.length - 1 ? 'Next Question' : 'Finish Test'}
                    <span className="material-icons ml-1">arrow_forward</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-b-lg border-t border-gray-200">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div className="text-sm font-medium text-gray-700 mb-3 md:mb-0">
              Test Progress: {currentQuestion + 1}/{prompts.length} questions
            </div>
            
            <div className="w-full md:w-2/3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div 
                  className="bg-primary h-3 rounded-full progress-bar transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${progress}%` }}
                >
                  {progress > 15 && (
                    <span className="text-white text-xs font-bold">{Math.round(progress)}%</span>
                  )}
                </div>
              </div>
              
              <div className="mt-1 text-xs text-right">
                <span className="text-gray-600 font-medium">
                  {recordingComplete ? 'Answer saved!' : isRecording ? 'Recording...' : 'Ready for next question'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestTab;

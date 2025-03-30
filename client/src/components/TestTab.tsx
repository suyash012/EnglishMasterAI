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
    startRecording, 
    stopRecording, 
    audioBlob, 
    resetRecording 
  } = useRecorder();

  // Reset for new question
  useEffect(() => {
    setTimeRemaining(60);
    setTimerActive(false);
    setRecordingComplete(false);
    resetRecording();
  }, [currentQuestion, resetRecording]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && isRecording) {
      stopRecording();
      setRecordingComplete(true);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeRemaining, isRecording, stopRecording]);

  // Calculate progress
  const progress = ((currentQuestion + 1) / prompts.length) * 100;

  // Handle recording
  const handleRecording = () => {
    if (!isRecording) {
      startRecording();
      setTimerActive(true);
    } else {
      stopRecording();
      setTimerActive(false);
      setRecordingComplete(true);
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
            <h2 className="text-xl font-medium text-neutral-400">
              Question {currentQuestion + 1} of {prompts.length}
            </h2>
            
            <div className="flex items-center text-neutral-300">
              <span className="material-icons mr-1">timer</span>
              <span>{timeRemaining}s</span>
            </div>
          </div>
          
          <div className="bg-neutral-100 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-medium text-neutral-400 mb-3">
              {prompts[currentQuestion].prompt}
            </h3>
            
            <p className="text-sm text-neutral-300">
              Consider mentioning:
              {Array.isArray(prompts[currentQuestion].tips) && prompts[currentQuestion].tips.length > 0 ? (
                prompts[currentQuestion].tips.map((tip, index) => (
                  <span key={index} className="block mt-1">• {tip}</span>
                ))
              ) : (
                <span className="block mt-1">• Start speaking naturally about the topic.</span>
              )}
            </p>
          </div>
          
          {isRecording && (
            <div className="mb-6 bg-error bg-opacity-10 p-4 rounded-lg">
              <div className="flex items-center">
                <span className="relative flex h-3 w-3 mr-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-error"></span>
                </span>
                <p className="text-error font-medium">Recording your answer...</p>
              </div>
            </div>
          )}
          
          {recordingComplete && (
            <div className="mb-6 bg-success bg-opacity-10 p-4 rounded-lg">
              <div className="flex items-center">
                <span className="material-icons text-success mr-2">check_circle</span>
                <p className="text-success font-medium">Recording completed!</p>
              </div>
            </div>
          )}
          
          {isProcessing && (
            <div className="mb-6 bg-secondary bg-opacity-10 p-4 rounded-lg">
              <div className="flex items-center">
                <span className="material-icons text-secondary animate-spin mr-2">autorenew</span>
                <p className="text-secondary font-medium">Processing your answer...</p>
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
                <button 
                  onClick={handleNextQuestion}
                  disabled={isProcessing}
                  className="flex items-center px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition disabled:opacity-50"
                >
                  {currentQuestion < prompts.length - 1 ? 'Next Question' : 'Finish Test'}
                  <span className="material-icons ml-1">arrow_forward</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-neutral-100 p-4 rounded-b-lg">
          <div className="flex justify-between items-center">
            <div className="text-sm text-neutral-300">
              Progress: {currentQuestion + 1}/{prompts.length} questions
            </div>
            
            <div className="w-2/3 bg-neutral-200 rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full progress-bar" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestTab;

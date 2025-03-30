import { useState, useEffect, useRef } from 'react';
import { RecordingState } from '@/types';

interface UseRecorderReturn {
  isRecording: boolean;
  recordingState: RecordingState;
  recordingTime: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
  audioBlob: Blob | null;
  error: Error | null;
}

export const useRecorder = (): UseRecorderReturn => {
  // Basic state for recording status
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('inactive');
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Refs for recording internals
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  
  // Timer to track recording duration
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);
  
  // Clear resources on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  const startRecording = async (): Promise<void> => {
    try {
      console.log("Starting recording...");
      
      // Reset state
      audioChunksRef.current = [];
      setAudioBlob(null);
      setError(null);
      setRecordingTime(0);
      
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Create and configure media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(`Received audio chunk: ${event.data.size} bytes`);
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstart = () => {
        console.log("MediaRecorder started");
        setIsRecording(true);
        setRecordingState('recording');
      };
      
      mediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped");
        
        // Create audio blob
        const audioData = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioData);
        
        // Stop tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        // Update state
        setIsRecording(false);
        setRecordingState('inactive');
        
        console.log("Recording completed, blob created", audioData.size);
      };
      
      // Start recording - collect data every 1 second
      mediaRecorder.start(1000);
      
    } catch (err) {
      console.error("Error starting recording:", err);
      setError(err instanceof Error ? err : new Error('Unknown recording error'));
      setRecordingState('inactive');
      setIsRecording(false);
      alert("Could not access microphone. Please grant permission and try again.");
    }
  };
  
  const stopRecording = (): void => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log("Stopping recording...");
      setRecordingState('stopping');
      mediaRecorderRef.current.stop();
    }
  };
  
  const resetRecording = (): void => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    audioChunksRef.current = [];
    setAudioBlob(null);
    setError(null);
    setIsRecording(false);
    setRecordingState('inactive');
    setRecordingTime(0);
    mediaRecorderRef.current = null;
    streamRef.current = null;
  };
  
  return {
    isRecording,
    recordingState,
    recordingTime,
    startRecording,
    stopRecording,
    resetRecording,
    audioBlob,
    error
  };
};

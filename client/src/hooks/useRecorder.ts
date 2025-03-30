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
      // Clear any existing timer first
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Start a new timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log("Started recording timer");
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      console.log("Cleared recording timer");
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);
  
  // Clear resources on unmount
  useEffect(() => {
    return () => {
      // Cleanup function
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
      
      // Reset state first
      resetRecording();
      
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      
      // Create and configure media recorder with proper mime type
      const options = { mimeType: 'audio/webm' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log(`Received audio chunk: ${event.data.size} bytes`);
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstart = () => {
        console.log("MediaRecorder started successfully");
        setIsRecording(true);
        setRecordingState('recording');
        setRecordingTime(0);
      };
      
      mediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped");
        
        // Only create a blob if we have data
        if (audioChunksRef.current.length > 0) {
          // Create audio blob
          const audioData = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log("Audio blob created with size:", audioData.size, "bytes");
          setAudioBlob(audioData);
        } else {
          console.warn("No audio data collected during recording");
          setError(new Error("No audio data was recorded. Please try again."));
        }
        
        // Stop tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log("Audio track stopped");
          });
          streamRef.current = null;
        }
        
        // Update state
        setIsRecording(false);
        setRecordingState('inactive');
      };
      
      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError(new Error("Recording error occurred"));
        setIsRecording(false);
        setRecordingState('inactive');
      };
      
      // Request a data chunk immediately and then every 1 second
      mediaRecorder.start(1000);
      console.log("MediaRecorder.start called with 1000ms interval");
      
      // Force collect a chunk immediately to ensure we get something
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log("Requesting initial data chunk...");
          mediaRecorderRef.current.requestData();
        }
      }, 100);
      
    } catch (err) {
      console.error("Error starting recording:", err);
      setError(err instanceof Error ? err : new Error('Unknown recording error'));
      setRecordingState('inactive');
      setIsRecording(false);
      
      // Try to provide a more helpful message
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        alert("Microphone access denied. Please grant permission to use the microphone in your browser settings.");
      } else {
        alert("Could not access microphone. Please check your device settings and try again.");
      }
    }
  };
  
  const stopRecording = (): void => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log("Stopping recording...");
      
      // Request one final data chunk before stopping
      try {
        mediaRecorderRef.current.requestData();
      } catch (err) {
        console.warn("Error requesting final data chunk:", err);
      }
      
      setRecordingState('stopping');
      
      // Actually stop the recorder after a short delay to ensure we get the last chunk
      setTimeout(() => {
        if (mediaRecorderRef.current) {
          try {
            mediaRecorderRef.current.stop();
            console.log("MediaRecorder stopped");
          } catch (err) {
            console.error("Error stopping MediaRecorder:", err);
          }
        }
      }, 100);
    } else {
      console.warn("Cannot stop recording: MediaRecorder is not in recording state");
    }
  };
  
  const resetRecording = (): void => {
    console.log("Resetting recorder state");
    
    // Stop current recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn("Error stopping MediaRecorder during reset:", err);
      }
    }
    
    // Stop and release media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Reset all state
    audioChunksRef.current = [];
    setAudioBlob(null);
    setError(null);
    setIsRecording(false);
    setRecordingState('inactive');
    setRecordingTime(0);
    mediaRecorderRef.current = null;
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

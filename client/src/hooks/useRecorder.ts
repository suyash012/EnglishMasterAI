import { useState, useEffect, useRef, useCallback } from 'react';
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
  const timerIntervalRef = useRef<number | null>(null);
  
  // Cleanup function to release resources
  const cleanup = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping MediaRecorder', e);
      }
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    mediaRecorderRef.current = null;
  }, []);
  
  // Reset recording state completely
  const resetRecording = useCallback(() => {
    console.log('Resetting recorder state');
    cleanup();
    audioChunksRef.current = [];
    setAudioBlob(null);
    setError(null);
    setIsRecording(false);
    setRecordingState('inactive');
    setRecordingTime(0);
  }, [cleanup]);
  
  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
  // Timer effect to update recording time
  useEffect(() => {
    if (isRecording) {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
      
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isRecording]);
  
  // Start recording function
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      console.log('Starting recording...');
      
      // Reset any previous recording state
      resetRecording();
      
      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder API is not supported in this browser');
      }
      
      // Request audio access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;
      
      // Create a new MediaRecorder instance
      // Try different MIME types to improve compatibility
      let mimeType = '';
      const supportedTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4;codecs=mp4a.40.2',
        ''  // Empty string uses browser default
      ];
      
      for (const type of supportedTypes) {
        if (type === '' || MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      console.log(`Using MIME type: ${mimeType || 'browser default'}`);
      
      // Create recorder with selected MIME type
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      
      // Set up event handlers
      let hasReceivedData = false;
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          hasReceivedData = true;
          console.log(`Received audio chunk: ${event.data.size} bytes`);
          audioChunksRef.current.push(event.data);
        }
      };
      
      recorder.onstart = () => {
        console.log('MediaRecorder started');
        setIsRecording(true);
        setRecordingState('recording');
        setRecordingTime(0);
      };
      
      recorder.onstop = () => {
        console.log('MediaRecorder stopped, processing data...');
        
        // Create audio blob from chunks
        if (hasReceivedData && audioChunksRef.current.length > 0) {
          const audioType = mimeType || 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type: audioType });
          console.log(`Created audio blob: ${blob.size} bytes, type: ${blob.type}`);
          setAudioBlob(blob);
        } else {
          console.warn('No audio data collected during recording');
          setError(new Error('No audio data was recorded. Please try again.'));
        }
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        setIsRecording(false);
        setRecordingState('inactive');
      };
      
      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError(new Error('Recording error occurred'));
      };
      
      // Start recording - collect data in larger chunks (2.5 seconds)
      // to ensure we get complete audio data
      recorder.start(2500);
      console.log('MediaRecorder started with 2.5s interval');
      
      // Force a data request after 100ms to test functionality
      setTimeout(() => {
        try {
          if (recorder.state === 'recording') {
            recorder.requestData();
            console.log('Requested initial data check');
          }
        } catch (e) {
          console.warn('Could not request initial data', e);
        }
      }, 100);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      
      // Cleanup any partial setup
      cleanup();
      
      // Set error state
      setError(err instanceof Error ? err : new Error('Unknown recording error'));
      setIsRecording(false);
      setRecordingState('inactive');
      
      // Show user-friendly error message
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          alert('Microphone access was denied. Please grant permission to use your microphone.');
        } else if (err.name === 'NotFoundError') {
          alert('No microphone was found on your device. Please connect a microphone and try again.');
        } else {
          alert(`Microphone error: ${err.message}`);
        }
      } else {
        alert('Could not start recording. Please check your microphone and try again.');
      }
    }
  }, [resetRecording, cleanup]);
  
  // Stop recording function
  const stopRecording = useCallback((): void => {
    console.log('Stopping recording...');
    
    if (!mediaRecorderRef.current) {
      console.warn('No MediaRecorder instance found');
      return;
    }
    
    if (mediaRecorderRef.current.state === 'recording') {
      setRecordingState('stopping');
      
      try {
        // Request a final chunk of data before stopping
        mediaRecorderRef.current.requestData();
        
        // Stop the recorder after a short delay
        setTimeout(() => {
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
          }
        }, 100);
      } catch (err) {
        console.error('Error stopping MediaRecorder:', err);
        
        // Ensure we cleanup even on error
        cleanup();
        setIsRecording(false);
        setRecordingState('inactive');
      }
    } else {
      console.warn('MediaRecorder is not in recording state');
      setIsRecording(false);
      setRecordingState('inactive');
    }
  }, [cleanup]);
  
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

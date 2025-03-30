import { useState, useCallback, useEffect } from 'react';
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
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('inactive');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    };
  }, [mediaRecorder]);

  // Timer effect for recording time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRecording) {
      // Set interval to update recording time every second
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else if (!isRecording && recordingTime !== 0 && recordingState === 'inactive') {
      // Only reset recording time when completely inactive, not when just stopping
      setRecordingTime(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, recordingTime, recordingState]);

  const startRecording = useCallback(async () => {
    try {
      // Reset previous recording state
      setAudioChunks([]);
      setAudioBlob(null);
      setError(null);
      setRecordingTime(0);
      setRecordingState('recording');
      
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      console.log('Microphone access granted, creating recorder...');
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      
      recorder.addEventListener('dataavailable', (event) => {
        console.log('Data available from recorder', event.data.size);
        if (event.data.size > 0) {
          chunks.push(event.data);
          setAudioChunks(prevChunks => [...prevChunks, event.data]);
        }
      });
      
      recorder.addEventListener('start', () => {
        console.log('Recording started');
        setIsRecording(true);
      });
      
      recorder.addEventListener('stop', () => {
        console.log('Recording stopped, processing audio...');
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Stop all audio tracks to release microphone
        stream.getAudioTracks().forEach(track => track.stop());
        setIsRecording(false);
        setRecordingState('inactive');
        console.log('Recording processed and saved');
      });
      
      // Request data every 1 second to ensure we capture audio in chunks
      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      console.log('Recording has started successfully');
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setRecordingState('inactive');
      setError(err instanceof Error ? err : new Error('Unknown error during recording'));
      alert('Could not access microphone. Please ensure microphone permissions are granted in your browser.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      setRecordingState('stopping');
      mediaRecorder.stop();
    }
  }, [mediaRecorder]);

  const resetRecording = useCallback(() => {
    setAudioChunks([]);
    setAudioBlob(null);
    setError(null);
    setIsRecording(false);
    setRecordingState('inactive');
    setRecordingTime(0);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setMediaRecorder(null);
  }, [mediaRecorder]);

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

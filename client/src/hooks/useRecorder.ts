import { useState, useCallback, useEffect } from 'react';

interface UseRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
  audioBlob: Blob | null;
  error: Error | null;
}

export const useRecorder = (): UseRecorderReturn => {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
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

  const startRecording = useCallback(async () => {
    try {
      // Reset previous recording state
      setAudioChunks([]);
      setAudioBlob(null);
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      });
      
      recorder.addEventListener('stop', () => {
        const chunks = audioChunks;
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Stop all audio tracks to release microphone
        stream.getAudioTracks().forEach(track => track.stop());
        setIsRecording(false);
      });
      
      // Start recording
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error during recording'));
      console.error('Error starting recording:', err);
    }
  }, [audioChunks]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  }, [mediaRecorder]);

  const resetRecording = useCallback(() => {
    setAudioChunks([]);
    setAudioBlob(null);
    setError(null);
    setIsRecording(false);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setMediaRecorder(null);
  }, [mediaRecorder]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    resetRecording,
    audioBlob,
    error
  };
};

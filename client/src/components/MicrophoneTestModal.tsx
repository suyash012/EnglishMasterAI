import { FC, useState, useEffect, useRef } from 'react';
import { useRecorder } from '@/hooks/useRecorder';

interface MicrophoneTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MicrophoneTestModal: FC<MicrophoneTestModalProps> = ({ isOpen, onClose }) => {
  // Component state
  const [isTesting, setIsTesting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // Clean up URL on unmount
  const audioUrlRef = useRef<string | null>(null);
  
  // Get recorder hook
  const { 
    isRecording, 
    startRecording, 
    stopRecording, 
    resetRecording,
    audioBlob, 
    recordingTime 
  } = useRecorder();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsTesting(false);
      setAudioUrl(null);
      resetRecording();
    }
  }, [isOpen, resetRecording]);

  // Create URL for audio playback when blob is available
  useEffect(() => {
    if (audioBlob) {
      // Clean up previous URL if it exists
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      
      const url = URL.createObjectURL(audioBlob);
      audioUrlRef.current = url;
      setAudioUrl(url);
    }
    
    // Clean up on unmount
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, [audioBlob]);

  // Handle start test button click
  const handleStartTest = async () => {
    try {
      console.log('Starting microphone test...');
      // Reset any previous recording state first
      resetRecording();
      setIsTesting(true);
      
      // Attempt to start recording
      await startRecording();
      console.log('Microphone test recording started successfully');
    } catch (err) {
      console.error('Error starting test recording:', err);
      setIsTesting(false);
      alert("Could not access microphone. Please check your browser permissions and try again.");
    }
  };

  // Handle stop test button click
  const handleStopTest = () => {
    console.log('Stopping microphone test...');
    
    // First stop the recording to capture audio
    stopRecording();
    
    // Then update UI state
    setIsTesting(false);
    
    console.log('Microphone test recording stopped');
  };

  // Don't render anything if modal is closed
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
      <div className="bg-white rounded-lg max-w-md w-full p-6 scale-in">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-neutral-400">Microphone Test</h3>
          <button onClick={onClose} className="text-neutral-300 hover:text-neutral-400">
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <p className="mb-4 text-neutral-400">
          Speak into your microphone to see if it's working properly.
        </p>
        
        <div className="bg-neutral-100 rounded-lg p-4 mb-4 flex items-center justify-center h-24">
          {isTesting ? (
            <div className="flex items-end h-16 space-x-1">
              <div className="wave wave1 w-2 h-8 bg-secondary rounded-t-md"></div>
              <div className="wave wave2 w-2 h-10 bg-secondary rounded-t-md"></div>
              <div className="wave wave3 w-2 h-12 bg-secondary rounded-t-md"></div>
              <div className="wave wave4 w-2 h-10 bg-secondary rounded-t-md"></div>
              <div className="wave wave5 w-2 h-8 bg-secondary rounded-t-md"></div>
            </div>
          ) : audioUrl ? (
            <div className="w-full">
              <audio src={audioUrl} controls className="w-full" />
            </div>
          ) : (
            <div className="text-neutral-300">
              Click "Start Test" to begin recording
            </div>
          )}
        </div>
        
        <div className="flex justify-between">
          {isTesting ? (
            <button 
              onClick={handleStopTest}
              className="flex items-center px-4 py-2 bg-error text-white rounded-md hover:bg-error-dark transition"
            >
              <span className="material-icons mr-1">stop</span>
              Stop Test
            </button>
          ) : (
            <button 
              onClick={handleStartTest}
              className="flex items-center px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition"
            >
              <span className="material-icons mr-1">mic</span>
              Start Test
            </button>
          )}
          
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition"
          >
            {audioBlob ? 'Sounds Good' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MicrophoneTestModal;

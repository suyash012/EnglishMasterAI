import { useState, type FC } from "react";
import { useTest } from "@/context/TestContext";
import MicrophoneTestModal from "./MicrophoneTestModal";

const IntroductionTab: FC = () => {
  const { setCurrentTab } = useTest();
  const [isMicTestOpen, setIsMicTestOpen] = useState(false);

  return (
    <div className="fade-in">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-medium text-neutral-400 mb-4">Welcome to your English Speaking Assessment</h2>
        <p className="mb-4 text-neutral-400">This test will evaluate your spoken English skills based on:</p>
        
        <div className="mb-6">
          <div className="flex items-start mb-3">
            <span className="material-icons text-secondary mr-2 mt-0.5">check_circle</span>
            <div>
              <h3 className="font-medium text-neutral-400">Vocabulary Usage</h3>
              <p className="text-sm text-neutral-300">Word choice, variety, and appropriateness for context</p>
            </div>
          </div>
          
          <div className="flex items-start mb-3">
            <span className="material-icons text-secondary mr-2 mt-0.5">check_circle</span>
            <div>
              <h3 className="font-medium text-neutral-400">Grammar Accuracy</h3>
              <p className="text-sm text-neutral-300">Sentence structure, tense usage, and grammatical correctness</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="material-icons text-secondary mr-2 mt-0.5">check_circle</span>
            <div>
              <h3 className="font-medium text-neutral-400">Phrase Construction</h3>
              <p className="text-sm text-neutral-300">Use of natural expressions and idioms</p>
            </div>
          </div>
        </div>
        
        <h3 className="font-medium text-neutral-400 mb-2">How the test works:</h3>
        <ol className="list-decimal pl-5 mb-6 text-neutral-400">
          <li className="mb-2">You will be given 5 speaking prompts, one at a time</li>
          <li className="mb-2">For each prompt, you will have 60 seconds to record your response</li>
          <li className="mb-2">Our AI will analyze your speech and provide feedback</li>
          <li>You will receive a detailed score breakdown at the end</li>
        </ol>
        
        <div className="bg-neutral-100 p-4 rounded-md mb-6">
          <h3 className="flex items-center font-medium text-neutral-400 mb-2">
            <span className="material-icons text-warning mr-2">tips_and_updates</span>
            Tips for best results:
          </h3>
          <ul className="list-disc pl-5 text-neutral-400">
            <li className="mb-1">Use a quiet environment with minimal background noise</li>
            <li className="mb-1">Speak clearly at a natural pace</li>
            <li className="mb-1">Position your microphone properly</li>
            <li>Test your microphone before starting</li>
          </ul>
        </div>
        
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setIsMicTestOpen(true)}
            className="flex items-center px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition"
          >
            <span className="material-icons mr-1">mic</span>
            Test Microphone
          </button>
          
          <button 
            onClick={() => setCurrentTab('test')}
            className="flex items-center px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition"
          >
            Start Test
            <span className="material-icons ml-1">arrow_forward</span>
          </button>
        </div>
      </div>

      <MicrophoneTestModal 
        isOpen={isMicTestOpen} 
        onClose={() => setIsMicTestOpen(false)} 
      />
    </div>
  );
};

export default IntroductionTab;

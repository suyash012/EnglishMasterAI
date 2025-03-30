import { useState, type FC } from "react";
import { useTest } from "@/context/TestContext";
import MicrophoneTestModal from "./MicrophoneTestModal";
import { DifficultyLevels } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

const IntroductionTab: FC = () => {
  const { setCurrentTab, selectedDifficulty, setSelectedDifficulty } = useTest();
  const [isMicTestOpen, setIsMicTestOpen] = useState(false);

  // Get user progress to determine which difficulty levels are unlocked
  const { data: userProgress } = useQuery({
    queryKey: ['/api/user-progress/1'], // Using user ID 1 for now
    queryFn: async () => {
      try {
        const response = await fetch('/api/user-progress/1');
        if (!response.ok) {
          // If user progress doesn't exist yet, return default values
          return {
            unlockedLevels: {
              [DifficultyLevels.BEGINNER]: true,
              [DifficultyLevels.INTERMEDIATE]: false,
              [DifficultyLevels.ADVANCED]: false,
              [DifficultyLevels.EXPERT]: false
            },
            levelScores: {
              [DifficultyLevels.BEGINNER]: 0,
              [DifficultyLevels.INTERMEDIATE]: 0,
              [DifficultyLevels.ADVANCED]: 0,
              [DifficultyLevels.EXPERT]: 0
            }
          };
        }
        return response.json();
      } catch (error) {
        // Return default unlocked levels if there's an error
        return {
          unlockedLevels: {
            [DifficultyLevels.BEGINNER]: true,
            [DifficultyLevels.INTERMEDIATE]: false,
            [DifficultyLevels.ADVANCED]: false,
            [DifficultyLevels.EXPERT]: false
          },
          levelScores: {
            [DifficultyLevels.BEGINNER]: 0,
            [DifficultyLevels.INTERMEDIATE]: 0,
            [DifficultyLevels.ADVANCED]: 0,
            [DifficultyLevels.EXPERT]: 0
          }
        };
      }
    }
  });

  // Default to all levels unlocked if userProgress data is not available
  const unlockedLevels = userProgress?.unlockedLevels || {
    [DifficultyLevels.BEGINNER]: true,
    [DifficultyLevels.INTERMEDIATE]: true,
    [DifficultyLevels.ADVANCED]: true,
    [DifficultyLevels.EXPERT]: true
  };

  // Difficulty level colors and labels
  const difficultyConfig = {
    [DifficultyLevels.BEGINNER]: { 
      color: 'bg-green-100 text-green-800 border-green-300',
      activeColor: 'bg-green-600 text-white',
      label: 'Beginner',
      icon: 'fitness_center'
    },
    [DifficultyLevels.INTERMEDIATE]: { 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      activeColor: 'bg-yellow-600 text-white',
      label: 'Intermediate',
      icon: 'trending_up'
    },
    [DifficultyLevels.ADVANCED]: { 
      color: 'bg-orange-100 text-orange-800 border-orange-300',
      activeColor: 'bg-orange-600 text-white',
      label: 'Advanced',
      icon: 'stars'
    },
    [DifficultyLevels.EXPERT]: { 
      color: 'bg-red-100 text-red-800 border-red-300',
      activeColor: 'bg-red-600 text-white',
      label: 'Expert',
      icon: 'workspace_premium'
    }
  };

  return (
    <div className="fade-in">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Welcome to your English Speaking Assessment</h2>
        <p className="mb-4 text-gray-700">This test will evaluate your spoken English skills based on:</p>
        
        <div className="mb-6">
          <div className="flex items-start mb-3">
            <span className="material-icons text-secondary mr-2 mt-0.5">check_circle</span>
            <div>
              <h3 className="font-semibold text-gray-700">Vocabulary Usage</h3>
              <p className="text-sm text-gray-600">Word choice, variety, and appropriateness for context</p>
            </div>
          </div>
          
          <div className="flex items-start mb-3">
            <span className="material-icons text-secondary mr-2 mt-0.5">check_circle</span>
            <div>
              <h3 className="font-semibold text-gray-700">Grammar Accuracy</h3>
              <p className="text-sm text-gray-600">Sentence structure, tense usage, and grammatical correctness</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="material-icons text-secondary mr-2 mt-0.5">check_circle</span>
            <div>
              <h3 className="font-semibold text-gray-700">Phrase Construction</h3>
              <p className="text-sm text-gray-600">Use of natural expressions and idioms</p>
            </div>
          </div>
        </div>
        
        {/* Difficulty selection */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Select Difficulty Level:</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Object.entries(difficultyConfig).map(([level, config]) => (
              <button
                key={level}
                onClick={() => setSelectedDifficulty(level as any)}
                disabled={!unlockedLevels[level]}
                className={`p-3 rounded-lg border text-center transition-all ${
                  selectedDifficulty === level 
                    ? config.activeColor
                    : unlockedLevels[level]
                      ? `${config.color} hover:opacity-80`
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                }`}
              >
                <span className="material-icons block mx-auto mb-1">{config.icon}</span>
                <span className="font-medium">{config.label}</span>
                {userProgress?.levelScores && userProgress.levelScores[level] > 0 && (
                  <div className="mt-1 text-xs">
                    {unlockedLevels[level] ? `Score: ${userProgress.levelScores[level]}` : 'Locked'}
                  </div>
                )}
                {!unlockedLevels[level] && (
                  <div className="flex items-center justify-center mt-1">
                    <span className="material-icons text-xs mr-1">lock</span>
                    <span className="text-xs">Score 80+ to unlock</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
        
        <h3 className="font-semibold text-gray-800 mb-2">How the test works:</h3>
        <ol className="list-decimal pl-5 mb-6 text-gray-700">
          <li className="mb-2">You will be given 5 speaking prompts, one at a time</li>
          <li className="mb-2">For each prompt, you will have 60 seconds to record your response</li>
          <li className="mb-2">Our AI will analyze your speech and provide feedback</li>
          <li>You will receive a detailed score breakdown at the end</li>
        </ol>
        
        <div className="bg-neutral-100 p-4 rounded-md mb-6">
          <h3 className="flex items-center font-semibold text-gray-800 mb-2">
            <span className="material-icons text-warning mr-2">tips_and_updates</span>
            Tips for best results:
          </h3>
          <ul className="list-disc pl-5 text-gray-700">
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
            Start {difficultyConfig[selectedDifficulty as keyof typeof difficultyConfig].label} Test
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

import { FC, useEffect, useState } from "react";
import { useTest } from "@/context/TestContext";
import { format } from "date-fns";

const ResultsTab: FC = () => {
  const { testResults, resetTest, setCurrentTab } = useTest();
  const currentDate = format(new Date(), "MMMM d, yyyy");
  
  const [overallScore, setOverallScore] = useState(0);
  const [vocabularyScore, setVocabularyScore] = useState(0);
  const [grammarScore, setGrammarScore] = useState(0);
  const [phraseScore, setPhraseScore] = useState(0);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");

  // Calculate average scores
  useEffect(() => {
    if (testResults.length === 0) return;

    const totalResults = testResults.length;
    
    // Calculate average scores
    const overallTotal = testResults.reduce((acc, result) => acc + result.overallScore, 0);
    const vocabularyTotal = testResults.reduce((acc, result) => acc + result.vocabularyScore, 0);
    const grammarTotal = testResults.reduce((acc, result) => acc + result.grammarScore, 0);
    const phraseTotal = testResults.reduce((acc, result) => acc + result.phraseScore, 0);
    
    setOverallScore(Math.round(overallTotal / totalResults));
    setVocabularyScore(Math.round(vocabularyTotal / totalResults));
    setGrammarScore(Math.round(grammarTotal / totalResults));
    setPhraseScore(Math.round(phraseTotal / totalResults));
    
    // Get strengths from the latest result
    setStrengths(testResults[testResults.length - 1].strengths);
    setImprovements(testResults[testResults.length - 1].improvements);
    setRecommendations(testResults[testResults.length - 1].recommendations);
    setFeedback(testResults[testResults.length - 1].feedback);
  }, [testResults]);

  // Handle retaking the test
  const handleRetakeTest = () => {
    resetTest();
    setCurrentTab('intro');
  };

  // Function to get performance description
  const getPerformanceDescription = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Very Good";
    if (score >= 70) return "Good";
    if (score >= 60) return "Satisfactory";
    if (score >= 50) return "Fair";
    return "Needs Improvement";
  };

  // Handle download results
  const handleDownloadResults = () => {
    const resultsText = `
SpeakScore English Assessment Results
Date: ${currentDate}

Overall Score: ${overallScore}/100 - ${getPerformanceDescription(overallScore)}

Category Scores:
- Vocabulary: ${vocabularyScore}/100
- Grammar: ${grammarScore}/100
- Phrasing: ${phraseScore}/100

Strengths:
${strengths.map(s => `- ${s}`).join('\n')}

Areas for Improvement:
${improvements.map(i => `- ${i}`).join('\n')}

Recommended Learning Focus:
${recommendations.map(r => `- ${r}`).join('\n')}

Overall Feedback:
${feedback}
    `;

    const blob = new Blob([resultsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SpeakScore_Results_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-neutral-400">Your Assessment Results</h2>
          
          <div className="flex items-center">
            <span className="material-icons text-secondary mr-1">calendar_today</span>
            <span className="text-sm text-neutral-300">{currentDate}</span>
          </div>
        </div>
        
        <div className="bg-primary bg-opacity-5 p-5 rounded-lg mb-6 text-center">
          <h3 className="text-lg font-medium text-neutral-400 mb-2">Overall Score</h3>
          
          <div className="flex items-center justify-center mb-2">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path 
                  className="stroke-neutral-200" 
                  fill="none" 
                  strokeWidth="3.8" 
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                ></path>
                <path 
                  className="stroke-primary" 
                  fill="none" 
                  strokeWidth="3.8" 
                  strokeDasharray={`${overallScore}, 100`} 
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                ></path>
                <text x="18" y="20.5" className="text-3xl font-medium" textAnchor="middle" fill="currentColor" style={{ color: "var(--primary)" }}>
                  {overallScore}
                </text>
              </svg>
            </div>
          </div>
          
          <p className="text-neutral-300">
            <span className="font-medium text-secondary">{getPerformanceDescription(overallScore)}</span> - {feedback}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-neutral-100 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-neutral-400">Vocabulary</h4>
              <span className="font-medium text-secondary">{vocabularyScore}/100</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-1.5 mb-2">
              <div 
                className="bg-secondary h-1.5 rounded-full" 
                style={{ width: `${vocabularyScore}%` }}
              ></div>
            </div>
            <p className="text-sm text-neutral-300">
              {
                vocabularyScore >= 80 ? "Excellent range of vocabulary with precise word choice" :
                vocabularyScore >= 70 ? "Good range of vocabulary with appropriate word choice" :
                vocabularyScore >= 60 ? "Adequate vocabulary for basic communication" :
                "Limited vocabulary range"
              }
            </p>
          </div>
          
          <div className="bg-neutral-100 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-neutral-400">Grammar</h4>
              <span className="font-medium text-secondary">{grammarScore}/100</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-1.5 mb-2">
              <div 
                className="bg-secondary h-1.5 rounded-full" 
                style={{ width: `${grammarScore}%` }}
              ></div>
            </div>
            <p className="text-sm text-neutral-300">
              {
                grammarScore >= 80 ? "Consistently accurate with complex structures" :
                grammarScore >= 70 ? "Generally accurate with occasional minor errors" :
                grammarScore >= 60 ? "Basic grammar with some recurring errors" :
                "Frequent grammatical errors"
              }
            </p>
          </div>
          
          <div className="bg-neutral-100 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-neutral-400">Phrasing</h4>
              <span className="font-medium text-secondary">{phraseScore}/100</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-1.5 mb-2">
              <div 
                className="bg-secondary h-1.5 rounded-full" 
                style={{ width: `${phraseScore}%` }}
              ></div>
            </div>
            <p className="text-sm text-neutral-300">
              {
                phraseScore >= 80 ? "Natural, idiomatic expressions throughout" :
                phraseScore >= 70 ? "Natural expression with some idiomatic usage" :
                phraseScore >= 60 ? "Basic phrases with occasional natural expressions" :
                "Limited range of expressions"
              }
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-neutral-400 mb-3">Detailed Feedback</h3>
          
          <div className="mb-4">
            <h4 className="font-medium text-neutral-400 mb-1">Strengths:</h4>
            <ul className="list-disc pl-5 text-neutral-400">
              {strengths.map((strength, index) => (
                <li key={`strength-${index}`} className="mb-1">{strength}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-neutral-400 mb-1">Areas for Improvement:</h4>
            <ul className="list-disc pl-5 text-neutral-400">
              {improvements.map((improvement, index) => (
                <li key={`improvement-${index}`} className="mb-1">{improvement}</li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="bg-neutral-100 p-4 rounded-lg mb-6">
          <h3 className="flex items-center font-medium text-neutral-400 mb-2">
            <span className="material-icons text-secondary mr-2">school</span>
            Recommended Learning Focus
          </h3>
          <p className="text-neutral-400 mb-3">
            Based on your performance, we recommend focusing on the following areas:
          </p>
          <div className="flex flex-wrap gap-2">
            {recommendations.map((recommendation, index) => (
              <span
                key={`recommendation-${index}`}
                className="bg-secondary bg-opacity-10 text-secondary px-3 py-1 rounded-full text-sm"
              >
                {recommendation}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex justify-between">
          <button 
            onClick={handleRetakeTest}
            className="flex items-center px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary hover:bg-opacity-5 transition"
          >
            <span className="material-icons mr-1">refresh</span>
            Retake Test
          </button>
          
          <button
            onClick={handleDownloadResults}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition"
          >
            <span className="material-icons mr-1">download</span>
            Download Results
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsTab;

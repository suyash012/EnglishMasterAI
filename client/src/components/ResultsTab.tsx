import { FC, useEffect, useState } from "react";
import { useTest, TestResult } from "@/context/TestContext";
import { format } from "date-fns";

const ResultsTab: FC = () => {
  const { testResults, resetTest, setCurrentTab } = useTest();
  const currentDate = format(new Date(), "MMMM d, yyyy");
  
  // Define all possible scores
  const [overallScore, setOverallScore] = useState(0);
  const [vocabularyScore, setVocabularyScore] = useState(0);
  const [grammarScore, setGrammarScore] = useState(0);
  const [phraseScore, setPhraseScore] = useState(0);
  const [fluencyScore, setFluencyScore] = useState(0);
  const [pronunciationScore, setPronunciationScore] = useState(0);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [cefrLevel, setCefrLevel] = useState("");
  const [isFallbackEvaluation, setIsFallbackEvaluation] = useState(false);
  const [historicalData, setHistoricalData] = useState<number[]>([]);

  // Calculate average scores
  useEffect(() => {
    if (testResults.length === 0) return;

    const totalResults = testResults.length;
    
    // Calculate average scores
    const overallTotal = testResults.reduce((acc, result) => acc + result.overallScore, 0);
    const vocabularyTotal = testResults.reduce((acc, result) => acc + result.vocabularyScore, 0);
    const grammarTotal = testResults.reduce((acc, result) => acc + result.grammarScore, 0);
    const phraseTotal = testResults.reduce((acc, result) => acc + result.phraseScore, 0);
    
    // For optional scores, calculate average only if they exist
    const fluencyValues = testResults.filter(result => result.fluencyScore !== undefined);
    const fluencyTotal = fluencyValues.reduce((acc, result) => acc + (result.fluencyScore || 0), 0);
    
    const pronunciationValues = testResults.filter(result => result.pronunciationScore !== undefined);
    const pronunciationTotal = pronunciationValues.reduce((acc, result) => acc + (result.pronunciationScore || 0), 0);
    
    setOverallScore(Math.round(overallTotal / totalResults));
    setVocabularyScore(Math.round(vocabularyTotal / totalResults));
    setGrammarScore(Math.round(grammarTotal / totalResults));
    setPhraseScore(Math.round(phraseTotal / totalResults));
    
    if (fluencyValues.length > 0) {
      setFluencyScore(Math.round(fluencyTotal / fluencyValues.length));
    }
    
    if (pronunciationValues.length > 0) {
      setPronunciationScore(Math.round(pronunciationTotal / pronunciationValues.length));
    }
    
    // Get data from the latest result
    const latestResult = testResults[testResults.length - 1];
    setStrengths(latestResult.strengths);
    setImprovements(latestResult.improvements);
    setRecommendations(latestResult.recommendations);
    setFeedback(latestResult.feedback);
    setCefrLevel(latestResult.level || determineCEFRLevel(latestResult));
    setIsFallbackEvaluation(latestResult.fallback || false);
    
    // Create synthetic historical data for visualization
    // In a real app, this would come from actual historical test data
    setHistoricalData([
      Math.max(40, Math.min(85, overallScore - 15 + Math.round(Math.random() * 10))),
      Math.max(45, Math.min(90, overallScore - 10 + Math.round(Math.random() * 10))),
      Math.max(50, Math.min(95, overallScore - 5 + Math.round(Math.random() * 10))),
      overallScore
    ]);
    
  }, [testResults]);

  // Function to determine CEFR level based on scores
  function determineCEFRLevel(result: TestResult): string {
    const overall = result.overallScore;
    
    if (overall >= 90) return "C2";
    if (overall >= 80) return "C1";
    if (overall >= 70) return "B2";
    if (overall >= 60) return "B1";
    if (overall >= 50) return "A2";
    return "A1";
  }

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

  // Function to get CEFR level description
  const getCEFRDescription = (level: string) => {
    switch (level) {
      case "C2": return "Proficient - Can use language with precision in complex situations";
      case "C1": return "Advanced - Can use language flexibly in demanding contexts";
      case "B2": return "Upper Intermediate - Can interact with fluency and spontaneity";
      case "B1": return "Intermediate - Can communicate on familiar matters";
      case "A2": return "Elementary - Can communicate in simple, routine situations";
      case "A1": return "Beginner - Can interact in a simple way with basic expressions";
      default: return "Not determined";
    }
  };

  // Handle download results (expanded with more details)
  const handleDownloadResults = () => {
    const resultsText = `
SpeakScore English Assessment Results
Date: ${currentDate}
CEFR Level: ${cefrLevel} - ${getCEFRDescription(cefrLevel)}

Overall Score: ${overallScore}/100 - ${getPerformanceDescription(overallScore)}

Category Scores:
- Vocabulary: ${vocabularyScore}/100
- Grammar: ${grammarScore}/100
- Phrasing: ${phraseScore}/100
${fluencyScore ? `- Fluency: ${fluencyScore}/100\n` : ''}
${pronunciationScore ? `- Pronunciation: ${pronunciationScore}/100\n` : ''}

Strengths:
${strengths.map(s => `- ${s}`).join('\n')}

Areas for Improvement:
${improvements.map(i => `- ${i}`).join('\n')}

Recommended Learning Focus:
${recommendations.map(r => `- ${r}`).join('\n')}

Overall Feedback:
${feedback}

Next Steps:
Based on your ${cefrLevel} level assessment, we recommend continuing with practice in the areas listed above.
A focused study plan targeting your improvement areas will help you advance to the next CEFR level.
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

  // Function to get background color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 70) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  // Function to create spider/radar chart data points
  const calculateSpiderPoints = (scores: { name: string, value: number }[]) => {
    const centerX = 100;
    const centerY = 100;
    const radius = 80;
    const totalPoints = scores.length;
    
    return scores.map((score, i) => {
      const angle = (Math.PI * 2 * i) / totalPoints - Math.PI / 2;
      const percentage = score.value / 100;
      const x = centerX + radius * percentage * Math.cos(angle);
      const y = centerY + radius * percentage * Math.sin(angle);
      return { x, y, score };
    });
  };

  // Get all scores for radar chart
  const allScores = [
    { name: "Vocabulary", value: vocabularyScore },
    { name: "Grammar", value: grammarScore },
    { name: "Phrasing", value: phraseScore },
    ...(fluencyScore ? [{ name: "Fluency", value: fluencyScore }] : []),
    ...(pronunciationScore ? [{ name: "Pronunciation", value: pronunciationScore }] : [])
  ];

  // Calculate radar chart points
  const spiderPoints = calculateSpiderPoints(allScores);
  const spiderPath = spiderPoints.map((point, i) => (i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`)).join(' ') + ' Z';

  return (
    <div className="fade-in">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Your Assessment Results</h2>
            {isFallbackEvaluation && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                Preliminary Assessment
              </span>
            )}
          </div>
          
          <div className="flex items-center">
            <span className="material-icons text-secondary mr-1">calendar_today</span>
            <span className="text-sm text-gray-600">{currentDate}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Overall score card with CEFR level */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-xl shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">Overall Performance</h3>
                <div className="flex items-center">
                  <span className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {overallScore}
                  </span>
                  <span className="text-gray-500 ml-1">/100</span>
                  
                  <div className="ml-4 rounded-lg bg-primary/10 px-3 py-1">
                    <span className="text-sm font-medium text-primary">
                      {getPerformanceDescription(overallScore)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <span className="text-xs text-gray-500 block mb-1">CEFR Level</span>
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-secondary text-white font-bold text-xl">
                  {cefrLevel}
                </div>
              </div>
            </div>
            
            <p className="text-gray-600 text-sm mt-2">
              {getCEFRDescription(cefrLevel)}
            </p>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Progress Over Time</h4>
              <div className="h-16 flex items-end justify-between">
                {historicalData.map((score, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div 
                      className={`w-6 ${getScoreColor(score)} rounded-t transition-all duration-700 ease-out`} 
                      style={{ height: `${score}%` }}
                    ></div>
                    <span className="text-xs text-gray-500 mt-1">
                      {index === historicalData.length - 1 ? 'Now' : `Test ${index + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Radar/Spider chart for skill breakdown */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Skills Breakdown</h3>
            
            <div className="relative h-52 w-full">
              <svg width="100%" height="100%" viewBox="0 0 200 200">
                {/* Background circles */}
                <circle cx="100" cy="100" r="80" fill="none" stroke="#f0f0f0" strokeWidth="1" />
                <circle cx="100" cy="100" r="60" fill="none" stroke="#f0f0f0" strokeWidth="1" />
                <circle cx="100" cy="100" r="40" fill="none" stroke="#f0f0f0" strokeWidth="1" />
                <circle cx="100" cy="100" r="20" fill="none" stroke="#f0f0f0" strokeWidth="1" />
                
                {/* Axis lines */}
                {allScores.map((_, i) => {
                  const angle = (Math.PI * 2 * i) / allScores.length - Math.PI / 2;
                  const x = 100 + 80 * Math.cos(angle);
                  const y = 100 + 80 * Math.sin(angle);
                  return <line key={i} x1="100" y1="100" x2={x} y2={y} stroke="#e0e0e0" strokeWidth="1" />;
                })}
                
                {/* Data area */}
                <path 
                  d={spiderPath} 
                  fill="rgba(var(--primary-rgb), 0.2)" 
                  stroke="rgba(var(--primary-rgb), 0.8)" 
                  strokeWidth="2" 
                />
                
                {/* Data points */}
                {spiderPoints.map((point, i) => (
                  <circle 
                    key={i} 
                    cx={point.x} 
                    cy={point.y} 
                    r="4" 
                    fill="var(--primary)" 
                  />
                ))}
                
                {/* Labels */}
                {allScores.map((score, i) => {
                  const angle = (Math.PI * 2 * i) / allScores.length - Math.PI / 2;
                  const x = 100 + 95 * Math.cos(angle);
                  const y = 100 + 95 * Math.sin(angle);
                  return (
                    <text 
                      key={i} 
                      x={x} 
                      y={y} 
                      textAnchor="middle" 
                      dominantBaseline="middle"
                      fill="#666"
                      fontSize="10"
                      fontWeight="500"
                    >
                      {score.name}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
        
        {/* Detailed score bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-8">
          {allScores.map((scoreData, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-700">{scoreData.name}</h4>
                <div className="flex items-center">
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${getScoreColor(scoreData.value)}`}></span>
                  <span className="font-medium text-gray-700">{scoreData.value}/100</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ease-out ${getScoreColor(scoreData.value)}`} 
                  style={{ width: `${scoreData.value}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {
                  scoreData.name === "Vocabulary" ? (
                    scoreData.value >= 80 ? "Excellent range with precise word choice" :
                    scoreData.value >= 70 ? "Good vocabulary with appropriate word choice" :
                    scoreData.value >= 60 ? "Adequate vocabulary for communication" :
                    "Basic vocabulary for simple communication"
                  ) :
                  scoreData.name === "Grammar" ? (
                    scoreData.value >= 80 ? "Consistently accurate with complex structures" :
                    scoreData.value >= 70 ? "Generally accurate with minor errors" :
                    scoreData.value >= 60 ? "Basic grammar with recurring errors" :
                    "Frequent grammatical errors that affect meaning"
                  ) :
                  scoreData.name === "Phrasing" ? (
                    scoreData.value >= 80 ? "Natural, idiomatic expressions throughout" :
                    scoreData.value >= 70 ? "Natural expression with some idiomatic usage" :
                    scoreData.value >= 60 ? "Basic phrases with occasional natural expressions" :
                    "Limited range of expressions, often unnatural"
                  ) :
                  scoreData.name === "Fluency" ? (
                    scoreData.value >= 80 ? "Speaks smoothly with minimal hesitation" :
                    scoreData.value >= 70 ? "Good flow with occasional pauses" :
                    scoreData.value >= 60 ? "Noticeable pauses but maintains comprehensibility" :
                    "Frequent hesitation affecting communication"
                  ) :
                  scoreData.name === "Pronunciation" ? (
                    scoreData.value >= 80 ? "Clear pronunciation with good intonation" :
                    scoreData.value >= 70 ? "Generally clear with occasional mispronunciation" :
                    scoreData.value >= 60 ? "Understandable with frequent pronunciation issues" :
                    "Pronunciation problems affect understanding"
                  ) : ""
                }
              </p>
            </div>
          ))}
        </div>
        
        {/* Feedback section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Detailed Feedback</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 p-5 rounded-lg border border-green-100">
              <h4 className="flex items-center font-medium text-green-800 mb-3">
                <span className="material-icons text-green-600 mr-2">checked</span>
                Strengths
              </h4>
              <ul className="space-y-2">
                {strengths.map((strength, index) => (
                  <li key={`strength-${index}`} className="flex items-start">
                    <span className="material-icons text-green-500 text-sm mr-2 mt-0.5">check_circle</span>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-amber-50 p-5 rounded-lg border border-amber-100">
              <h4 className="flex items-center font-medium text-amber-800 mb-3">
                <span className="material-icons text-amber-600 mr-2">priority_high</span>
                Areas for Improvement
              </h4>
              <ul className="space-y-2">
                {improvements.map((improvement, index) => (
                  <li key={`improvement-${index}`} className="flex items-start">
                    <span className="material-icons text-amber-500 text-sm mr-2 mt-0.5">arrow_circle_up</span>
                    <span className="text-gray-700">{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="mt-6 bg-white p-5 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-2">Overall Assessment</h4>
            <p className="text-gray-600">{feedback}</p>
          </div>
        </div>
        
        {/* Recommended learning focus */}
        <div className="bg-primary/5 p-6 rounded-xl mb-6">
          <h3 className="flex items-center font-semibold text-gray-700 mb-4">
            <span className="material-icons text-primary mr-2">school</span>
            Recommended Learning Focus
          </h3>
          <p className="text-gray-600 mb-4">
            Based on your performance, we recommend focusing on the following areas to improve your {cefrLevel} level skills:
          </p>
          <div className="flex flex-wrap gap-3">
            {recommendations.map((recommendation, index) => (
              <span
                key={`recommendation-${index}`}
                className="bg-white shadow-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium"
              >
                {recommendation}
              </span>
            ))}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <button 
            onClick={handleRetakeTest}
            className="flex items-center justify-center px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
          >
            <span className="material-icons mr-2">refresh</span>
            Retake Test
          </button>
          
          <button
            onClick={handleDownloadResults}
            className="flex items-center justify-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <span className="material-icons mr-2">download</span>
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsTab;

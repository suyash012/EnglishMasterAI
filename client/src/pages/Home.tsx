import { useEffect } from "react";
import Header from "@/components/Header";
import TabNavigation from "@/components/TabNavigation";
import IntroductionTab from "@/components/IntroductionTab";
import TestTab from "@/components/TestTab";
import ResultsTab from "@/components/ResultsTab";
import { useTest } from "@/context/TestContext";
import { useQuery } from "@tanstack/react-query";

const Home = () => {
  const { currentTab } = useTest();
  
  // Fetch test prompts
  const { data: prompts } = useQuery({
    queryKey: ['/api/prompts'],
    queryFn: async () => {
      const response = await fetch('/api/prompts');
      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }
      return response.json();
    }
  });

  return (
    <div className="bg-neutral-100 min-h-screen">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <Header />
        <TabNavigation />
        
        <div className="mb-8">
          {currentTab === 'intro' && <IntroductionTab />}
          {currentTab === 'test' && prompts && <TestTab prompts={prompts} />}
          {currentTab === 'results' && <ResultsTab />}
        </div>
      </div>
    </div>
  );
};

export default Home;

import { type FC } from "react";
import { useTest } from "@/context/TestContext";
import { cn } from "@/lib/utils";

const TabNavigation: FC = () => {
  const { currentTab, setCurrentTab, testCompleted } = useTest();

  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      <div className="flex border-b">
        <button 
          onClick={() => setCurrentTab('intro')}
          className={cn(
            "flex-1 py-3 px-4 text-center border-b-2 font-medium",
            currentTab === 'intro' 
              ? "border-primary text-primary font-bold" 
              : "border-transparent text-gray-700"
          )}
        >
          Introduction
        </button>
        <button 
          onClick={() => setCurrentTab('test')}
          className={cn(
            "flex-1 py-3 px-4 text-center border-b-2 font-medium",
            currentTab === 'test' 
              ? "border-primary text-primary font-bold" 
              : "border-transparent text-gray-700"
          )}
        >
          Test
        </button>
        <button 
          onClick={() => testCompleted ? setCurrentTab('results') : null}
          className={cn(
            "flex-1 py-3 px-4 text-center border-b-2 font-medium",
            currentTab === 'results' 
              ? "border-primary text-primary font-bold" 
              : "border-transparent text-gray-700",
            !testCompleted && "opacity-50 cursor-not-allowed"
          )}
        >
          Results
        </button>
      </div>
    </div>
  );
};

export default TabNavigation;

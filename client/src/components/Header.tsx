import { type FC } from "react";

const Header: FC = () => {
  return (
    <header className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="material-icons text-primary text-3xl mr-2">record_voice_over</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">SpeakScore</h1>
        </div>
        <div>
          <button className="text-primary hover:text-primary-dark">
            <span className="material-icons">help_outline</span>
          </button>
        </div>
      </div>
      <p className="text-gray-600 mt-1 font-medium">AI-Powered English Speaking Assessment</p>
    </header>
  );
};

export default Header;

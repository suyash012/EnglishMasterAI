import { type FC } from "react";

const Header: FC = () => {
  return (
    <header className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="material-icons text-primary text-3xl mr-2">record_voice_over</span>
          <h1 className="text-2xl sm:text-3xl font-medium text-neutral-400">SpeakScore</h1>
        </div>
        <div>
          <button className="text-primary hover:text-primary-dark">
            <span className="material-icons">help_outline</span>
          </button>
        </div>
      </div>
      <p className="text-neutral-300 mt-1">AI-Powered English Speaking Assessment</p>
    </header>
  );
};

export default Header;

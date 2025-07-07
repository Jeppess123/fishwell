import React from 'react';
import { Fish, Brain, Activity } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-teal-700 text-white shadow-2xl">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Fish className="w-12 h-12 text-teal-300" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-teal-200 bg-clip-text text-transparent">
                Fish Detection AI
              </h1>
              <p className="text-blue-200 text-sm font-medium">
                Advanced Marine Life Analysis System
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 bg-blue-800/50 px-4 py-2 rounded-full">
              <Brain className="w-5 h-5 text-teal-300" />
              <span className="text-sm font-medium">AI Powered</span>
            </div>
            <div className="flex items-center space-x-2 bg-blue-800/50 px-4 py-2 rounded-full">
              <Activity className="w-5 h-5 text-green-300" />
              <span className="text-sm font-medium">Real-time</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
import React, { useState, useEffect } from "react";
import { ChevronDown, Package, Zap, Code } from "lucide-react";

const HeroSection: React.FC = () => {
  const [animatedText, setAnimatedText] = useState("");
  const fullText = "Mayonation";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setAnimatedText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="min-h-screen flex items-center justify-center relative grid-pattern">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black"></div>
      <div className="relative z-10 text-center px-6 fade-in">
        <h1 className="text-7xl md:text-9xl font-thin text-white mb-6 glow-text">
          {animatedText}
          <span className="animate-pulse">_</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-2xl mx-auto">
          A lightweight and performant animation library for the web
        </p>
        <div className="flex items-center justify-center space-x-4 mb-12">
          <span className="text-sm text-gray-500 flex items-center">
            <Package size={16} className="mr-2" />
            ~5kb gzipped
          </span>
          <span className="text-sm text-gray-500 flex items-center">
            <Zap size={16} className="mr-2" />
            60fps optimized
          </span>
          <span className="text-sm text-gray-500 flex items-center">
            <Code size={16} className="mr-2" />
            TypeScript ready
          </span>
        </div>
        <div className="flex items-center justify-center space-x-4">
          <button className="px-8 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-all hover-lift">
            npm install mayonation
          </button>
          <button className="px-8 py-3 border border-gray-700 text-white font-medium rounded-lg hover:border-gray-500 transition-all hover-lift">
            View on GitHub
          </button>
        </div>
      </div>
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
        <ChevronDown size={24} className="text-gray-600" />
      </div>
    </section>
  );
};

export default HeroSection;

import React, { useState, useEffect } from "react";
import { ArrowRight, Package, Zap, Code, Github } from "lucide-react";

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
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div>
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            animation: 'grid-move 20s linear infinite'
          }}
        ></div>
      </div>

      {/* Floating orbs */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>
      
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Main title */}
        <div className="mb-8">
          <h1 className="text-7xl md:text-9xl font-light text-white mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              {animatedText}
            </span>
            <span className="animate-pulse text-purple-400">|</span>
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto rounded-full"></div>
        </div>

        {/* Subtitle */}
        <p className="text-2xl md:text-3xl text-gray-400 font-light mb-12 max-w-4xl mx-auto leading-relaxed">
          Craft fluid, performant animations with minimal code
        </p>

        {/* Stats */}
        <div className="flex flex-wrap items-center justify-center gap-8 mb-16">
          <div className="flex items-center space-x-2 px-4 py-2 bg-gray-900/50 backdrop-blur-sm rounded-full border border-gray-800/50">
            <Package size={18} className="text-purple-400" />
            <span className="text-sm font-medium text-gray-300">~5kb bundle</span>
          </div>
          <div className="flex items-center space-x-2 px-4 py-2 bg-gray-900/50 backdrop-blur-sm rounded-full border border-gray-800/50">
            <Zap size={18} className="text-yellow-400" />
            <span className="text-sm font-medium text-gray-300">60fps smooth</span>
          </div>
          <div className="flex items-center space-x-2 px-4 py-2 bg-gray-900/50 backdrop-blur-sm rounded-full border border-gray-800/50">
            <Code size={18} className="text-blue-400" />
            <span className="text-sm font-medium text-gray-300">TypeScript</span>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="group flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/25 hover:scale-105">
            <span>Get Started</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="group flex items-center space-x-2 px-8 py-4 bg-gray-900/50 backdrop-blur-sm border border-gray-700 text-gray-300 hover:text-white font-medium rounded-xl transition-all duration-300 hover:border-gray-500 hover:bg-gray-800/50">
            <Github size={18} />
            <span>View on GitHub</span>
          </button>
        </div>

        {/* Code preview hint */}
        <div className="mt-16 opacity-60">
          <p className="text-sm text-gray-500 mb-4">See it in action</p>
          <div className="flex justify-center">
            <div className="animate-bounce">
              <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-gray-600 rounded-full mt-2 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;

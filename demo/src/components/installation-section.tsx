import React, { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";

const InstallationSection: React.FC = () => {
  const [copied, setCopied] = useState("");

  useEffect(() => {
    Prism.highlightAll();
  }, []);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(""), 2000);
  };

  const codeExample = `import { mayo, timeline } from 'mayonation'

// Simple animation
mayo({
  target: '.element',
  translateX: 100,
  opacity: [0, 1],
  duration: 1000,
  ease: 'easeInOut'
}).play()

// Timeline animation
timeline()
  .add(mayo({ target: '.box1', translateX: 100 }))
  .add(mayo({ target: '.box2', scale: 2 }), '+=500')
  .play()

// Stagger animation
mayo({
  target: '.item',
  translateY: [100, 0],
  opacity: [0, 1],
  duration: 800,
  stagger: 100,
  ease: 'easeOut'
}).play()`;

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-full text-sm text-gray-400 mb-6">
            <Copy size={16} className="mr-2" />
            Installation
          </div>
          <h2 className="text-4xl md:text-5xl font-light text-white mb-6 tracking-tight">
            Get started in
            <span className="block bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              seconds
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Install Mayonation with your favorite package manager and start creating animations
          </p>
        </div>

        <div className="space-y-12">
          {/* Package Managers */}
          <div>
            <h3 className="text-lg font-medium text-white mb-6 flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              Package Manager
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="group relative">
                <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-800/50 p-4 flex items-center justify-between hover:border-gray-700/50 transition-all">
                  <code className="text-green-400 font-medium">npm install mayonation</code>
                  <button
                    onClick={() => copyToClipboard("npm install mayonation", "npm")}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100"
                  >
                    {copied === "npm" ? (
                      <>
                        <Check size={14} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="group relative">
                <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-800/50 p-4 flex items-center justify-between hover:border-gray-700/50 transition-all">
                  <code className="text-blue-400 font-medium">yarn add mayonation</code>
                  <button
                    onClick={() => copyToClipboard("yarn add mayonation", "yarn")}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100"
                  >
                    {copied === "yarn" ? (
                      <>
                        <Check size={14} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Usage */}
          <div>
            <h3 className="text-lg font-medium text-white mb-6 flex items-center">
              <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
              Basic Usage
            </h3>
            <div className="relative group">
              <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-800/50 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-xs font-medium text-gray-400 ml-3">
                      TypeScript
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(codeExample, "code")}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100"
                  >
                    {copied === "code" ? (
                      <>
                        <Check size={14} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* Code content */}
                <div className="p-6 overflow-hidden">
                  <pre className="text-sm leading-relaxed overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                    <code className="language-typescript">
                      {codeExample}
                    </code>
                  </pre>
                </div>
              </div>
              
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-green-600/10 blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
          </div>

          {/* CDN */}
          <div>
            <h3 className="text-lg font-medium text-white mb-6 flex items-center">
              <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
              CDN
            </h3>
            <div className="group relative">
              <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-800/50 p-4 hover:border-gray-700/50 transition-all">
                <pre className="text-sm overflow-x-auto">
                  <code className="language-html">
                    {`<script src="https://unpkg.com/mayonation@latest/dist/index.js"></script>`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Ready to build section */}
        <div className="text-center mt-20 p-8 bg-gray-900/20 backdrop-blur-sm rounded-2xl border border-gray-800/30">
          <h4 className="text-2xl font-medium text-white mb-4">
            Ready to build amazing animations?
          </h4>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Check out our examples and API documentation to learn more about what Mayonation can do
          </p>
          <div className="flex items-center justify-center space-x-4">
            <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:shadow-2xl hover:shadow-purple-500/25 hover:scale-105 transition-all duration-300">
              View Examples
            </button>
            <button className="px-6 py-3 border border-gray-600 text-gray-300 font-medium rounded-xl hover:border-gray-500 transition-colors">
              API Reference
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InstallationSection;

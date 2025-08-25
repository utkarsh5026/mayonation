import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

const InstallationSection: React.FC = () => {
  const [copied, setCopied] = useState("");

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <section className="py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-5xl font-thin text-white mb-4 text-center">
          Get Started
        </h2>
        <p className="text-gray-500 text-center mb-16 max-w-2xl mx-auto">
          Install Mayonation and start animating in seconds
        </p>

        <div className="space-y-8">
          {/* NPM Install */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Package Manager
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="code-block rounded-lg p-4 flex items-center justify-between">
                <code className="text-gray-300">npm install mayonation</code>
                <button
                  onClick={() =>
                    copyToClipboard("npm install mayonation", "npm")
                  }
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  {copied === "npm" ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <div className="code-block rounded-lg p-4 flex items-center justify-between">
                <code className="text-gray-300">yarn add mayonation</code>
                <button
                  onClick={() => copyToClipboard("yarn add mayonation", "yarn")}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  {copied === "yarn" ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Basic Usage */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Basic Usage
            </h3>
            <div className="code-block rounded-lg p-6">
              <pre className="text-gray-300 text-sm overflow-x-auto">
                <code>{`import { mayo, timeline } from 'mayonation'

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
}).play()`}</code>
              </pre>
            </div>
          </div>

          {/* CDN */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              CDN
            </h3>
            <div className="code-block rounded-lg p-4">
              <code className="text-gray-300 text-sm">
                {`<script src="https://unpkg.com/mayonation@latest/dist/index.js"></script>`}
              </code>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InstallationSection;

import React, { useState } from "react";
import {
  PlayCircle,
  RotateCcw,
  Copy,
  Code2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { mayo, timeline } from "mate";
import { examples } from "./examples";

const ExamplesSection: React.FC = () => {
  const [currentExample, setCurrentExample] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const currentDemo = examples[currentExample];
  const renderDemo = (
    demoType: string,
    element: HTMLElement,
    elementID: string
  ) => {
    if (!element) return null;

    // // Reset element first
    // element.style.transform = "";
    // element.style.backgroundColor = "";
    // element.style.borderRadius = "";
    // element.style.opacity = "";

    // Reset stagger items if they exist
    const staggerItems = element.querySelectorAll(".stagger-item");
    staggerItems.forEach((item) => {
      (item as HTMLElement).style.transform = "";
      (item as HTMLElement).style.opacity = "";
    });

    const target = `#${elementID}`;

    switch (demoType) {
      case "basicTransform":
        mayo({
          target,
          duration: 1500,
          to: {
            scale: 1.3,
            rotateZ: 180,
            translateX: 50,
          },
          ease: "easeInOutCubic",
        }).play();
        break;

      case "colorMorphing":
        mayo({
          target,
          duration: 2000,
          to: {
            backgroundColor: "#FF6B9D",
            borderRadius: "50%",
            scale: 1.2,
          },
          ease: "easeInOut",
        }).play();
        break;

      case "staggerWave":
        staggerItems.forEach((item, index) => {
          const htmlItem = item as HTMLElement;
          htmlItem.style.transition = `all 1s cubic-bezier(0.68, -0.55, 0.265, 1.55)`;
          htmlItem.style.transitionDelay = `${index * 150}ms`;
          setTimeout(() => {
            htmlItem.style.transform =
              "translateY(-40px) scale(1.1) rotate(15deg)";
          }, 50);
        });
        break;

      case "keyframePath": {
        mayo({
          target,
          duration: 3000,
          keyframes: [
            { offset: 0, translateX: 0, translateY: 0, scale: 1 },
            { offset: 0.25, translateX: 1000, translateY: -500, scale: 0.2 },
            { offset: 0.5, translateX: 500, translateY: -1000, scale: 1.8 },
            { offset: 0.75, translateX: -500, translateY: -1500, scale: 0.9 },
            { offset: 1, translateX: 0, translateY: 0, scale: 2 },
          ],
          ease: "easeIn",
        }).play();
        break;
      }
      case "elasticBounce":
        mayo({
          target,
          duration: 500,
          to: {
            translateX: 120,
            scale: 1.4,
            rotateZ: 360,
          },
          ease: "easeInOutCubic",
        }).play();
        break;

      case "chainSequence": {
        timeline()
          .add(target, {
            to: { scale: 1.3, rotateZ: 90 },
            duration: 500,
          })
          .add(
            target,
            {
              to: { translateX: 80, backgroundColor: "#10B981" },
              duration: 800,
            },
            "+=500"
          )

          .play();
        break;
      }

      case "pulseEffect": {
        let pulseCount = 0;
        const pulseInterval = setInterval(() => {
          element.style.transition = "all 1s ease-in-out";
          element.style.transform =
            pulseCount % 2 === 0 ? "scale(1.3)" : "scale(1)";
          element.style.opacity = pulseCount % 2 === 0 ? "0.7" : "1";
          pulseCount++;
          if (pulseCount > 4) clearInterval(pulseInterval);
        }, 1000);
        break;
      }

      case "springPhysics": {
        element.style.transition =
          "all 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        setTimeout(() => {
          element.style.transform =
            "translateX(100px) translateY(-60px) rotate(180deg) scale(1.2)";
        }, 50);
        break;
      }
    }

    return setTimeout(() => {
      element.style.transition = "all 0.5s ease-in-out";
      element.style.transform = "";
      element.style.backgroundColor = "";
      element.style.borderRadius = "";
      element.style.opacity = "";

      staggerItems.forEach((item) => {
        (item as HTMLElement).style.transform = "";
        (item as HTMLElement).style.opacity = "";
      });
    }, 4000);
  };

  const handlePlayAnimation = () => {
    if (isPlaying) return;

    setIsPlaying(true);
    const elementID = `demo-element-${currentExample}`;
    const element = document.getElementById(elementID);
    if (element) {
      renderDemo(currentDemo.demo, element, elementID);
    }

    setTimeout(() => {
      setIsPlaying(false);
    }, 4500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentDemo.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const nextExample = () => {
    setCurrentExample((prev) => (prev + 1) % examples.length);
  };

  const prevExample = () => {
    setCurrentExample((prev) => (prev - 1 + examples.length) % examples.length);
  };

  const renderDemoElement = () => {
    switch (currentDemo.demo) {
      case "staggerWave":
        return (
          <div id={`demo-element-${currentExample}`} className="flex space-x-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="stagger-item w-4 h-16 bg-emerald-500 rounded-lg"
              />
            ))}
          </div>
        );
      default:
        return (
          <div
            id={`demo-element-${currentExample}`}
            className={`w-20 h-20 bg-gradient-to-br ${currentDemo.gradient} rounded-xl shadow-lg`}
          />
        );
    }
  };

  return (
    <section className="py-32 px-6 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-thin text-white mb-4">
            Interactive Examples
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Explore Mayonation's capabilities with live code examples. Each
            animation demonstrates different features and techniques you can use
            in your projects.
          </p>
        </div>

        {/* Example Navigation */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-4">
            <button
              onClick={prevExample}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={24} />
            </button>

            <div className="flex space-x-2">
              {examples.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentExample(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentExample
                      ? "bg-white scale-125"
                      : "bg-gray-600 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextExample}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {/* Main Example Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Code Side */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-2">
                  {currentDemo.title}
                </h3>
                <div className="flex items-center space-x-3 mb-4">
                  <span className="px-3 py-1 bg-gray-800 text-gray-300 text-sm rounded-full">
                    {currentDemo.category}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {currentExample + 1} of {examples.length}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-gray-400 leading-relaxed">
              {currentDemo.description}
            </p>

            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Code2 size={16} className="text-gray-400" />
                  <span className="text-gray-400 text-sm font-mono">
                    TypeScript
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center space-x-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
                >
                  <Copy size={14} />
                  <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                </button>
              </div>

              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <pre className="text-sm text-gray-300 overflow-x-auto">
                  <code className="language-typescript">
                    {currentDemo.code}
                  </code>
                </pre>
              </div>
            </div>
          </div>

          {/* Animation Side */}
          <div className="space-y-6">
            <div className="relative">
              <div className="aspect-video bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden relative">
                {/* Animated background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${currentDemo.gradient} opacity-10`}
                />

                {/* Grid pattern */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />

                {/* Demo element container */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {renderDemoElement()}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={handlePlayAnimation}
                disabled={isPlaying}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  isPlaying
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                    : `bg-gradient-to-r ${currentDemo.gradient} text-white hover:scale-105 shadow-lg`
                }`}
              >
                <PlayCircle size={20} />
                <span>{isPlaying ? "Playing..." : "Play Animation"}</span>
              </button>

              <button
                onClick={() => {
                  const element = document.getElementById(
                    `demo-element-${currentExample}`
                  );
                  if (element) {
                    element.style.transform = "";
                    element.style.backgroundColor = "";
                    element.style.borderRadius = "";
                    element.style.opacity = "";
                  }
                }}
                className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-20 text-center">
          <div className="bg-gray-900/30 rounded-2xl p-8 border border-gray-800">
            <h4 className="text-xl font-semibold text-white mb-4">
              Ready to Start Animating?
            </h4>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              All these examples use the actual Mayonation library with its tiny
              ~5KB bundle size. Copy any code snippet and start creating your
              own animations.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <button className="px-6 py-3 bg-white text-black font-medium rounded-xl hover:bg-gray-100 transition-colors">
                Get Started
              </button>
              <button className="px-6 py-3 border border-gray-600 text-gray-300 font-medium rounded-xl hover:border-gray-500 transition-colors">
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExamplesSection;

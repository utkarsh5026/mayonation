import React, { useState, useEffect, useRef } from "react";
import {
  PlayCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import { mayo, timeline } from "mayonation";
import { examples } from "./examples";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-typescript";

const ExamplesSection: React.FC = () => {
  const [currentExample, setCurrentExample] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Track active animations and timeouts for cleanup
  const activeAnimationsRef = useRef<
    Array<{ stop?: () => void; reset?: () => void }>
  >([]);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentDemo = examples[currentExample];

  useEffect(() => {
    Prism.highlightAll();
  }, [currentExample]);

  // Cleanup function to stop all active animations
  const cleanupAnimations = () => {
    // Clear any pending cleanup timeout
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    // Stop all active animations
    activeAnimationsRef.current.forEach((animation) => {
      if (animation.stop) animation.stop();
      if (animation.reset) animation.reset();
    });
    activeAnimationsRef.current = [];
  };

  // Reset element to initial state
  const resetElement = (element: HTMLElement) => {
    // Remove all inline styles that might have been applied
    element.style.transform = "";
    element.style.backgroundColor = "";
    element.style.borderRadius = "";
    element.style.opacity = "";
    element.style.transition = "";

    // Reset stagger items
    const staggerItems = element.querySelectorAll(".stagger-item");
    staggerItems.forEach((item) => {
      const htmlItem = item as HTMLElement;
      htmlItem.style.transform = "";
      htmlItem.style.opacity = "";
      htmlItem.style.transition = "";
      htmlItem.style.transitionDelay = "";
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentDemo.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const renderDemo = (
    demoType: string,
    element: HTMLElement,
    elementID: string
  ) => {
    if (!element) return null;

    // Clean up any existing animations first
    cleanupAnimations();

    // Reset element to initial state
    resetElement(element);

    const target = `#${elementID}`;
    let animationInstance = null;

    switch (demoType) {
      case "basicTransform":
        animationInstance = mayo({
          target,
          duration: 1500,
          to: {
            scale: 1.3,
            rotateZ: 180,
            translateX: 50,
          },
          ease: "easeInOutCubic",
        });
        activeAnimationsRef.current.push(animationInstance);
        animationInstance.play();
        break;

      case "colorMorphing":
        animationInstance = mayo({
          target,
          duration: 2000,
          to: {
            backgroundColor: "#FF6B9D",
            borderRadius: "50%",
            scale: 1.2,
          },
          ease: "easeInOut",
        });
        activeAnimationsRef.current.push(animationInstance);
        animationInstance.play();
        break;

      case "staggerWave":
        // For stagger wave, we'll use mayo with stagger instead of manual CSS transitions
        animationInstance = mayo({
          target: `${target} .stagger-item`,
          duration: 1000,
          stagger: 150,
          to: {
            translateY: -40,
            scale: 1.1,
            rotateZ: 15,
          },
          ease: "easeInOut",
        });
        activeAnimationsRef.current.push(animationInstance);
        animationInstance.play();
        break;

      case "keyframePath":
        animationInstance = mayo({
          target,
          duration: 3000,
          keyframes: [
            { offset: 0, translateX: 0, translateY: 0, scale: 1 },
            { offset: 0.25, translateX: 100, translateY: -50, scale: 0.8 },
            { offset: 0.5, translateX: 50, translateY: -100, scale: 1.2 },
            { offset: 0.75, translateX: -50, translateY: -50, scale: 0.9 },
            { offset: 1, translateX: 0, translateY: 0, scale: 1 },
          ],
          ease: "easeIn",
        });
        activeAnimationsRef.current.push(animationInstance);
        animationInstance.play();
        break;

      case "elasticBounce":
        animationInstance = mayo({
          target,
          duration: 2000,
          to: {
            translateX: 120,
            scale: 1.4,
            rotateZ: 360,
          },
          ease: "easeInOutCubic",
        });
        activeAnimationsRef.current.push(animationInstance);
        animationInstance.play();
        break;

      case "chainSequence":
        animationInstance = timeline()
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
            "+=100"
          )
          .add(target, {
            to: { rotateZ: 270, borderRadius: "50%" },
            duration: 600,
          });

        activeAnimationsRef.current.push(animationInstance);
        animationInstance.play();
        break;

      case "pulseEffect":
        animationInstance = mayo({
          target,
          duration: 1000,
          to: {
            scale: 1.3,
            opacity: 0.7,
            borderRadius: "50%",
          },
          repeat: "infinite",
          yoyo: true,
          ease: "easeInOutQuad",
        });
        activeAnimationsRef.current.push(animationInstance);
        animationInstance.play();
        break;

      case "springPhysics": {
        // Create a custom easing function for spring physics
        const springEasing = (t: number) => {
          const c4 = (2 * Math.PI) / 3;
          return t === 0
            ? 0
            : t === 1
            ? 1
            : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        };

        animationInstance = mayo({
          target,
          duration: 2500,
          to: {
            translateX: 100,
            translateY: -60,
            rotateZ: 180,
            scale: 1.2,
          },
          ease: springEasing,
        });
        activeAnimationsRef.current.push(animationInstance);
        animationInstance.play();
        break;
      }
    }

    // Set up cleanup after animation completes
    cleanupTimeoutRef.current = setTimeout(() => {
      resetElement(element);
      setIsPlaying(false);
      cleanupAnimations();
    }, 4000);

    return cleanupTimeoutRef.current;
  };

  const handlePlayAnimation = () => {
    if (isPlaying) return;

    setIsPlaying(true);
    const elementID = `demo-element-${currentExample}`;
    const element = document.getElementById(elementID);

    if (element) {
      renderDemo(currentDemo.demo, element, elementID);
    }
  };

  const handleReset = () => {
    const elementID = `demo-element-${currentExample}`;
    const element = document.getElementById(elementID);

    if (element) {
      cleanupAnimations();
      resetElement(element);
      setIsPlaying(false);
    }
  };

  const nextExample = () => {
    // Clean up current animations when switching examples
    cleanupAnimations();
    setIsPlaying(false);
    setCurrentExample((prev) => (prev + 1) % examples.length);
  };

  const prevExample = () => {
    // Clean up current animations when switching examples
    cleanupAnimations();
    setIsPlaying(false);
    setCurrentExample((prev) => (prev - 1 + examples.length) % examples.length);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAnimations();
    };
  }, []);

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
              disabled={isPlaying}
            >
              <ChevronLeft size={24} />
            </button>

            <div className="flex space-x-2">
              {examples.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (!isPlaying) {
                      cleanupAnimations();
                      setCurrentExample(index);
                    }
                  }}
                  disabled={isPlaying}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentExample
                      ? "bg-white scale-125"
                      : "bg-gray-600 hover:bg-gray-400"
                  } ${isPlaying ? "cursor-not-allowed opacity-50" : ""}`}
                />
              ))}
            </div>

            <button
              onClick={nextExample}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              disabled={isPlaying}
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {/* Main Example Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Code Side */}
          <div className="flex flex-col justify-between min-h-[600px]">
            {/* Header Section */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="px-4 py-1.5 bg-gradient-to-r from-gray-800 to-gray-700 text-gray-300 text-sm font-medium rounded-full border border-gray-600">
                    {currentDemo.category}
                  </span>
                  <span className="text-gray-500 text-sm font-medium">
                    {currentExample + 1} of {examples.length}
                  </span>
                </div>
                <h3 className="text-3xl font-bold text-white leading-tight">
                  {currentDemo.title}
                </h3>
                <p className="text-gray-400 leading-relaxed text-lg">
                  {currentDemo.description}
                </p>
              </div>
            </div>

            {/* Code Block */}
            <div className="relative group flex-1 flex flex-col justify-center">
              <div className="bg-black border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header with enhanced styling */}
                <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
                    </div>
                    <div className="h-4 w-px bg-gray-600 mx-2"></div>
                    <span className="text-sm font-semibold text-gray-300 tracking-wide">
                      TypeScript
                    </span>
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-all duration-200 border border-gray-600 hover:border-gray-500"
                  >
                    {copied ? (
                      <>
                        <Check size={16} className="text-green-400" />
                        <span className="text-green-400 font-medium">
                          Copied!
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Code content with enhanced styling */}
                <div className="p-8 bg-black overflow-hidden">
                  <pre className="text-sm leading-7 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                    <code className="language-typescript block">
                      {currentDemo.code}
                    </code>
                  </pre>
                </div>
              </div>

              {/* Enhanced glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            </div>
          </div>

          {/* Animation Side */}
          <div className="flex flex-col justify-between min-h-[600px]">
            {/* Preview Container */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="relative">
                {/* Main preview area */}
                <div className="aspect-video bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden relative shadow-xl">
                  {/* Subtle grid pattern */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
                      `,
                      backgroundSize: "40px 40px",
                    }}
                  />

                  {/* Demo element container */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {renderDemoElement()}
                  </div>
                </div>

                {/* Floating info badge */}
                <div className="absolute -top-3 left-6 px-4 py-2 bg-black border border-gray-600 rounded-lg shadow-lg">
                  <span className="text-xs font-semibold text-gray-300 tracking-wider">
                    LIVE PREVIEW
                  </span>
                </div>
              </div>
            </div>

            {/* Enhanced Controls */}
            <div className="flex items-center justify-center space-x-6 mt-8">
              <button
                onClick={handlePlayAnimation}
                disabled={isPlaying}
                className={`group flex items-center space-x-3 px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform ${
                  isPlaying
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed scale-95"
                    : `bg-gradient-to-r ${currentDemo.gradient} text-white hover:scale-105 shadow-2xl hover:shadow-purple-500/30`
                }`}
              >
                <PlayCircle
                  size={22}
                  className={
                    !isPlaying
                      ? "group-hover:rotate-12 transition-transform"
                      : ""
                  }
                />
                <span className="text-lg">
                  {isPlaying ? "Playing..." : "Play Animation"}
                </span>
              </button>

              <button
                onClick={handleReset}
                className="group p-4 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-2xl transition-all duration-300 border border-gray-600 hover:border-gray-500 hover:scale-105"
                title="Reset Animation"
              >
                <RotateCcw
                  size={22}
                  className="group-hover:rotate-180 transition-transform duration-300"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExamplesSection;

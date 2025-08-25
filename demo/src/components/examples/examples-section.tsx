import React, { useRef, useState } from "react";
import { PlayCircle, RotateCcw, Copy, Code2 } from "lucide-react";
import { Mayonation } from "mate";

const ExamplesSection: React.FC = () => {
  const examples = [
    {
      title: "Scale & Rotate",
      category: "Transform",
      gradient: "from-blue-500 to-purple-500",
      description: "Smooth scaling and rotation transforms",
      demo: "scaleRotate",
      code: `new Mayonation({
  target: element,
  duration: 2000,
  to: { scale: 1.5, rotateZ: 360 },
  ease: "easeInOutCubic",
}).play();`,
    },
    {
      title: "Color Transition",
      category: "Styles",
      gradient: "from-green-500 to-teal-500",
      description: "Smooth color transitions and gradients",
      demo: "colorTransition",
      code: `new Mayonation({
  target: element,
  duration: 2000,
  to: { 
    backgroundColor: "#8B5CF6", 
    borderRadius: 20 
  },
  ease: "easeInOut",
}).play();`,
    },
    {
      title: "Stagger Animation",
      category: "Timing",
      gradient: "from-orange-500 to-red-500",
      description: "Multiple elements with staggered timing",
      demo: "stagger",
      code: `const children = element.querySelectorAll(".item");

new Mayonation({
  target: children,
  duration: 1500,
  stagger: 100, // 100ms delay between each
  to: { translateY: -20, opacity: 1 },
  ease: "easeOutCubic",
}).play();`,
    },
    {
      title: "Easing Showcase",
      category: "Easing",
      gradient: "from-pink-500 to-rose-500",
      description: "Different easing functions comparison",
      demo: "easing",
      code: `new Mayonation({
  target: element,
  duration: 1500,
  to: { translateX: 100 },
  ease: "easeInOutQuad", // Try: linear, easeIn, easeOut
}).play();`,
    },
    {
      title: "Keyframe Animation",
      category: "Keyframes",
      gradient: "from-indigo-500 to-blue-500",
      description: "Complex multi-step keyframe sequences",
      demo: "keyframes",
      code: `new Mayonation({
  target: element,
  duration: 3000,
  keyframes: [
    { offset: 0, translateX: 0, translateY: 0, scale: 1 },
    { offset: 0.25, translateX: 50, translateY: -30, scale: 1.2 },
    { offset: 0.5, translateX: 0, translateY: -60, scale: 0.8 },
    { offset: 0.75, translateX: -50, translateY: -30, scale: 1.2 },
    { offset: 1, translateX: 0, translateY: 0, scale: 1 },
  ],
  ease: "easeInOutCubic",
}).play();`,
    },
  ];

  const renderDemo = (demoType: string, elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    let animation: Mayonation | null = null;

    switch (demoType) {
      case "scaleRotate":
        animation = new Mayonation({
          target: element,
          duration: 2000,
          to: { scale: 1.5, rotateZ: 360 },
          ease: "easeInOutCubic",
        });
        break;
      case "colorTransition":
        animation = new Mayonation({
          target: element,
          duration: 2000,
          to: { backgroundColor: "#8B5CF6", borderRadius: 20 },
          ease: "easeInOut",
        });
        break;
      case "stagger": {
        const children = element.querySelectorAll(".stagger-item");
        animation = new Mayonation({
          target: children,
          duration: 1500,
          stagger: 100,
          to: { translateY: -20, opacity: 1 },
          ease: "easeOutCubic",
        });
        break;
      }
      case "easing":
        animation = new Mayonation({
          target: element,
          duration: 1500,
          to: { translateX: 100 },
          ease: "easeInOutQuad",
        });
        break;
      case "keyframes":
        animation = new Mayonation({
          target: element,
          duration: 3000,
          keyframes: [
            { offset: 0, translateX: 0, translateY: 0, scale: 1 },
            { offset: 0.25, translateX: 50, translateY: -30, scale: 1.2 },
            { offset: 0.5, translateX: 0, translateY: -60, scale: 0.8 },
            { offset: 0.75, translateX: -50, translateY: -30, scale: 1.2 },
            { offset: 1, translateX: 0, translateY: 0, scale: 1 },
          ],
          ease: "easeInOutCubic",
        });
        break;
    }

    if (animation) {
      animation.play();
      return animation;
    }
    return null;
  };

  const resetDemo = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.style.transform = "";
    element.style.backgroundColor = "";
    element.style.borderRadius = "";

    const children = element.querySelectorAll(".stagger-item");
    children.forEach((child) => {
      (child as HTMLElement).style.transform = "";
      (child as HTMLElement).style.opacity = "0.6";
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy code: ', err);
    });
  };

  const CodeDisplay = ({ code, title }: { code: string; title: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      copyToClipboard(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="bg-gray-900/90 rounded-lg p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-gray-400" />
            <span className="text-gray-400 text-sm font-mono">{title}</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
          >
            <Copy size={12} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="text-sm text-gray-300 overflow-x-auto">
          <code className="language-javascript">{code}</code>
        </pre>
      </div>
    );
  };

  const DemoBox = ({ example, index }: { example: any; index: number }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [showCode, setShowCode] = useState(false);
    const animationRef = useRef<Mayonation | null>(null);
    const elementId = `demo-${index}`;

    const handlePlay = async () => {
      if (isPlaying) return;

      setIsPlaying(true);
      const animation = renderDemo(example.demo, elementId);
      animationRef.current = animation;

      if (animation) {
        await animation.play();
      }

      setTimeout(() => {
        setIsPlaying(false);
      }, 2000);
    };

    const handleReset = () => {
      if (animationRef.current) {
        animationRef.current.reset();
      }
      resetDemo(elementId);
      setIsPlaying(false);
    };

    const renderDemoContent = () => {
      switch (example.demo) {
        case "scaleRotate":
          return (
            <div
              id={elementId}
              className="w-16 h-16 bg-blue-500 rounded-lg"
            ></div>
          );
        case "colorTransition":
          return (
            <div
              id={elementId}
              className="w-16 h-16 bg-green-500 rounded-lg"
            ></div>
          );
        case "stagger":
          return (
            <div id={elementId} className="flex space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="stagger-item w-3 h-12 bg-orange-500 rounded opacity-60"
                ></div>
              ))}
            </div>
          );
        case "easing":
          return (
            <div
              id={elementId}
              className="w-4 h-4 bg-pink-500 rounded-full"
            ></div>
          );
        case "keyframes":
          return (
            <div
              id={elementId}
              className="w-12 h-12 bg-indigo-500 rounded-lg"
            ></div>
          );
        default:
          return <div className="w-16 h-16 bg-gray-500 rounded-lg"></div>;
      }
    };

    return (
      <div className="group cursor-pointer hover-lift">
        <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative p-8">
          <div
            className={`absolute inset-0 bg-gradient-to-br ${example.gradient} opacity-20 group-hover:opacity-30 transition-opacity`}
          ></div>
          <div className="relative z-10 flex items-center justify-center h-full">
            {renderDemoContent()}
          </div>
          <div className="absolute bottom-4 right-4 flex gap-2 z-20">
            <button
              onClick={handlePlay}
              disabled={isPlaying}
              className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors disabled:opacity-50"
            >
              <PlayCircle size={20} />
            </button>
            <button
              onClick={handleReset}
              className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-white font-medium">{example.title}</h3>
              <p className="text-gray-600 text-sm">{example.category}</p>
            </div>
            <button
              onClick={() => setShowCode(!showCode)}
              className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
            >
              <Code2 size={14} />
              {showCode ? 'Hide Code' : 'Show Code'}
            </button>
          </div>
          <p className="text-gray-500 text-xs mb-2">{example.description}</p>
          {showCode && (
            <CodeDisplay code={example.code} title={`${example.title} Implementation`} />
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-5xl font-thin text-white mb-4 text-center">
          Interactive Examples
        </h2>
        <p className="text-gray-500 text-center mb-16 max-w-2xl mx-auto">
          Click play to see Mayonation in action, then click "Show Code" to view the implementation. 
          Each example demonstrates key features with copy-paste ready code snippets.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {examples.map((example, index) => (
            <DemoBox key={index} example={example} index={index} />
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600 text-sm">
            All examples use the actual Mayonation library. Check the network
            tab to see the &lt;5KB bundle size!
          </p>
        </div>
      </div>
    </section>
  );
};

export default ExamplesSection;

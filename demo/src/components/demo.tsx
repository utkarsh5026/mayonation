import React, { useState, useRef } from "react";
import { Play } from "lucide-react";

const DemoSection: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState("basic");
  const [isPlaying, setIsPlaying] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement[]>([]);

  const demos = {
    basic: {
      title: "Basic Animation",
      code: `mayo({
  target: '.box',
  translateX: 200,
  rotateZ: 360,
  scale: 1.5,
  duration: 1000,
  ease: 'easeInOut'
}).play()`,
      run: () => {
        if (boxRef.current) {
          // Using CSS for demo - replace with actual mayonation when available
          boxRef.current.style.transition = "all 1s ease-in-out";
          boxRef.current.style.transform =
            "translateX(200px) rotate(360deg) scale(1.5)";
          setTimeout(() => {
            if (boxRef.current) {
              boxRef.current.style.transform =
                "translateX(0) rotate(0) scale(1)";
            }
          }, 1000);
        }
      },
    },
    timeline: {
      title: "Timeline Sequence",
      code: `timeline()
  .add(mayo({
    target: '.box',
    translateX: 100,
    duration: 500
  }))
  .add(mayo({
    target: '.box',
    translateY: -50,
    scale: 1.5,
    duration: 500
  }), '+=200')
  .add(mayo({
    target: '.box',
    rotateZ: 180,
    duration: 500
  }))
  .play()`,
      run: () => {
        if (boxRef.current) {
          const box = boxRef.current;
          box.style.transition = "all 0.5s ease-in-out";

          // Step 1
          box.style.transform = "translateX(100px)";

          // Step 2
          setTimeout(() => {
            box.style.transform =
              "translateX(100px) translateY(-50px) scale(1.5)";
          }, 700);

          // Step 3
          setTimeout(() => {
            box.style.transform =
              "translateX(100px) translateY(-50px) scale(1.5) rotate(180deg)";
          }, 1200);

          // Reset
          setTimeout(() => {
            box.style.transform =
              "translateX(0) translateY(0) scale(1) rotate(0)";
          }, 1700);
        }
      },
    },
    stagger: {
      title: "Stagger Effect",
      code: `mayo({
  target: '.item',
  translateY: -20,
  opacity: [0, 1],
  duration: 800,
  stagger: 100,
  ease: 'easeOut'
}).play()`,
      run: () => {
        itemsRef.current.forEach((item, index) => {
          if (item) {
            item.style.transition = "all 0.8s ease-out";
            item.style.opacity = "0";
            item.style.transform = "translateY(0)";

            setTimeout(() => {
              item.style.opacity = "1";
              item.style.transform = "translateY(-20px)";
            }, index * 100);

            setTimeout(() => {
              item.style.opacity = "1";
              item.style.transform = "translateY(0)";
            }, 800 + index * 100);
          }
        });
      },
    },
  };

  const runDemo = () => {
    setIsPlaying(true);
    demos[activeDemo as keyof typeof demos].run();
    setTimeout(() => setIsPlaying(false), 2500);
  };

  return (
    <section className="py-32 px-6 relative">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-5xl font-thin text-white mb-4 text-center">
          Interactive Demos
        </h2>
        <p className="text-gray-500 text-center mb-16 max-w-2xl mx-auto">
          Try out Mayonation's features with live examples
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Demo Controls */}
          <div>
            <div className="flex space-x-2 mb-6">
              {Object.entries(demos).map(([key, demo]) => (
                <button
                  key={key}
                  onClick={() => setActiveDemo(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeDemo === key
                      ? "bg-white text-black"
                      : "bg-gray-900 text-gray-400 hover:text-white"
                  }`}
                >
                  {demo.title}
                </button>
              ))}
            </div>

            <div className="code-block rounded-lg p-6 mb-6">
              <pre className="text-gray-300">
                <code>{demos[activeDemo as keyof typeof demos].code}</code>
              </pre>
            </div>

            <button
              onClick={runDemo}
              disabled={isPlaying}
              className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center ${
                isPlaying
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
              }`}
            >
              <Play size={20} className="mr-2" />
              {isPlaying ? "Running..." : "Run Animation"}
            </button>
          </div>

          {/* Demo Stage */}
          <div className="flex items-center justify-center">
            <div className="w-full h-96 border border-gray-900 rounded-lg p-8 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 grid-pattern opacity-20"></div>

              {activeDemo === "stagger" ? (
                <div className="flex space-x-4 z-10">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      ref={(el) => {
                        if (el) itemsRef.current[i] = el;
                      }}
                      className="demo-box"
                    />
                  ))}
                </div>
              ) : (
                <div ref={boxRef} className="demo-box relative z-10"></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;

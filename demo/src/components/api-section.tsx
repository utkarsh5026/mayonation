import React, { useState } from "react";

const APISection: React.FC = () => {
  const [selectedAPI, setSelectedAPI] = useState("mayo");

  const apis = {
    mayo: {
      title: "mayo()",
      description: "Main animation function for creating single animations",
      params: [
        {
          name: "target",
          type: "ElementLike",
          desc: "Element(s) to animate (selector, element, or array)",
        },
        {
          name: "duration",
          type: "number",
          desc: "Animation duration in milliseconds",
        },
        { name: "ease", type: "EaseFunction", desc: "Easing function or name" },
        {
          name: "from",
          type: "AnimationProperties",
          desc: "Starting animation properties",
        },
        {
          name: "to",
          type: "AnimationProperties",
          desc: "Ending animation properties",
        },
        {
          name: "stagger",
          type: "number",
          desc: "Delay between multiple elements",
        },
      ],
    },
    timeline: {
      title: "timeline()",
      description: "Create complex animation sequences with precise timing",
      params: [
        { name: "loop", type: "boolean", desc: "Loop the timeline infinitely" },
        { name: "add()", type: "function", desc: "Add animation to timeline" },
        { name: "play()", type: "function", desc: "Start timeline playback" },
        {
          name: "pause()",
          type: "function",
          desc: "Pause timeline at current position",
        },
        {
          name: "seek()",
          type: "function",
          desc: "Jump to specific time position",
        },
        {
          name: "reset()",
          type: "function",
          desc: "Reset timeline to beginning",
        },
      ],
    },
    properties: {
      title: "Animation Properties",
      description: "Supported CSS and transform properties",
      params: [
        {
          name: "translateX/Y/Z",
          type: "number | string",
          desc: "Translation in px, %, em, rem",
        },
        {
          name: "rotateX/Y/Z",
          type: "number | string",
          desc: "Rotation in deg, rad, turn",
        },
        {
          name: "scale/scaleX/Y/Z",
          type: "number",
          desc: "Scale factor (1 = 100%)",
        },
        { name: "opacity", type: "number", desc: "Opacity from 0 to 1" },
        { name: "backgroundColor", type: "string", desc: "CSS color value" },
        { name: "width/height", type: "string", desc: "Dimensions with units" },
      ],
    },
    easing: {
      title: "Easing Functions",
      description: "Built-in easing functions for natural animations",
      params: [
        { name: "linear", type: "function", desc: "Constant speed throughout" },
        { name: "easeIn", type: "function", desc: "Accelerate from start" },
        { name: "easeOut", type: "function", desc: "Decelerate to end" },
        {
          name: "easeInOut",
          type: "function",
          desc: "Accelerate then decelerate",
        },
        {
          name: "easeInQuad",
          type: "function",
          desc: "Quadratic acceleration",
        },
        { name: "easeInCubic", type: "function", desc: "Cubic acceleration" },
      ],
    },
  };

  return (
    <section className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-5xl font-thin text-white mb-4 text-center">
          API Reference
        </h2>
        <p className="text-gray-500 text-center mb-16 max-w-2xl mx-auto">
          Complete documentation for all Mayonation features
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* API Navigation */}
          <div className="space-y-2">
            {Object.entries(apis).map(([key, api]) => (
              <button
                key={key}
                onClick={() => setSelectedAPI(key)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                  selectedAPI === key
                    ? "bg-gray-900 text-white border-l-2 border-purple-500"
                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-900/50"
                }`}
              >
                {api.title}
              </button>
            ))}
          </div>

          {/* API Details */}
          <div className="md:col-span-2">
            <div className="border border-gray-900 rounded-lg p-8">
              <h3 className="text-2xl font-medium text-white mb-2">
                {apis[selectedAPI as keyof typeof apis].title}
              </h3>
              <p className="text-gray-400 mb-8">
                {apis[selectedAPI as keyof typeof apis].description}
              </p>

              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                Parameters
              </h4>
              <div className="space-y-4">
                {apis[selectedAPI as keyof typeof apis].params.map(
                  (param, index) => (
                    <div
                      key={index}
                      className="border-l-2 border-gray-800 pl-4"
                    >
                      <div className="flex items-baseline space-x-2 mb-1">
                        <span className="text-purple-400 font-mono">
                          {param.name}
                        </span>
                        <span className="text-gray-600 text-sm">
                          {param.type}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm">{param.desc}</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default APISection;

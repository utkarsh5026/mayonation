import React from "react";
import { PlayCircle } from "lucide-react";

const ExamplesSection: React.FC = () => {
  const examples = [
    {
      title: "Morphing Shapes",
      category: "Transform",
      gradient: "from-blue-500 to-purple-500",
      description: "Smooth shape morphing with path interpolation",
    },
    {
      title: "Text Animation",
      category: "Typography",
      gradient: "from-green-500 to-teal-500",
      description: "Character-by-character text reveal effects",
    },
    {
      title: "Particle System",
      category: "Canvas",
      gradient: "from-orange-500 to-red-500",
      description: "Dynamic particle animations with physics",
    },
    {
      title: "SVG Path Drawing",
      category: "SVG",
      gradient: "from-pink-500 to-rose-500",
      description: "Animated SVG path drawing and tracing",
    },
    {
      title: "Scroll Trigger",
      category: "Interaction",
      gradient: "from-indigo-500 to-blue-500",
      description: "Animations triggered by scroll position",
    },
    {
      title: "3D Card Flip",
      category: "Transform",
      gradient: "from-yellow-500 to-orange-500",
      description: "Realistic 3D card flip with perspective",
    },
  ];

  return (
    <section className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-5xl font-thin text-white mb-4 text-center">
          Examples
        </h2>
        <p className="text-gray-500 text-center mb-16 max-w-2xl mx-auto">
          Explore what's possible with Mayonation
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {examples.map((example, index) => (
            <div key={index} className="group cursor-pointer hover-lift">
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${example.gradient} opacity-20 group-hover:opacity-30 transition-opacity`}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <PlayCircle
                    size={48}
                    className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-white font-medium">{example.title}</h3>
                <p className="text-gray-600 text-sm">{example.category}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {example.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExamplesSection;

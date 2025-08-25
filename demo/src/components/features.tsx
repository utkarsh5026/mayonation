import React from "react";
import { Layers, Brush, Activity, Grid, Key, Cpu } from "lucide-react";

const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: Layers,
      title: "Timeline Control",
      description:
        "Create complex animation sequences with precise timing control",
    },
    {
      icon: Brush,
      title: "CSS & SVG",
      description:
        "Animate CSS properties and SVG paths with built-in drawing effects",
    },
    {
      icon: Activity,
      title: "Easing Functions",
      description: "10+ built-in easing functions for natural motion",
    },
    {
      icon: Grid,
      title: "Stagger Effects",
      description: "Animate multiple elements with staggered timing",
    },
    {
      icon: Key,
      title: "Keyframes",
      description: "Define complex animations with multiple keyframes",
    },
    {
      icon: Cpu,
      title: "High Performance",
      description: "Optimized for 60fps animations with minimal overhead",
    },
  ];

  return (
    <section className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-5xl font-thin text-white mb-4 text-center">
          Features
        </h2>
        <p className="text-gray-500 text-center mb-16 max-w-2xl mx-auto">
          Everything you need to create stunning web animations
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="p-8 border border-gray-900 rounded-lg hover-lift hover:border-gray-700 transition-all fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center mb-6">
                  <Icon size={24} className="text-purple-400" />
                </div>
                <h3 className="text-xl font-medium text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

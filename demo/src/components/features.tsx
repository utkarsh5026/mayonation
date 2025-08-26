import React from "react";
import { Layers, Brush, Activity, Grid, Key, Cpu } from "lucide-react";

const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: Layers,
      title: "Timeline Control",
      description:
        "Create complex animation sequences with precise timing control",
      gradient: "from-purple-500/20 to-purple-600/20",
      iconColor: "text-purple-400",
    },
    {
      icon: Brush,
      title: "CSS & SVG",
      description:
        "Animate CSS properties and SVG paths with built-in drawing effects",
      gradient: "from-pink-500/20 to-pink-600/20",
      iconColor: "text-pink-400",
    },
    {
      icon: Activity,
      title: "Easing Functions",
      description: "10+ built-in easing functions for natural motion",
      gradient: "from-green-500/20 to-green-600/20",
      iconColor: "text-green-400",
    },
    {
      icon: Grid,
      title: "Stagger Effects",
      description: "Animate multiple elements with staggered timing",
      gradient: "from-blue-500/20 to-blue-600/20",
      iconColor: "text-blue-400",
    },
    {
      icon: Key,
      title: "Keyframes",
      description: "Define complex animations with multiple keyframes",
      gradient: "from-yellow-500/20 to-yellow-600/20",
      iconColor: "text-yellow-400",
    },
    {
      icon: Cpu,
      title: "High Performance",
      description: "Optimized for 60fps animations with minimal overhead",
      gradient: "from-red-500/20 to-red-600/20",
      iconColor: "text-red-400",
    },
  ];

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-4 py-2 bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-full text-sm text-gray-400 mb-6">
            <Cpu size={16} className="mr-2" />
            Powerful Features
          </div>
          <h2 className="text-4xl md:text-5xl font-light text-white mb-6 tracking-tight">
            Everything you need to create
            <span className="block bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              stunning animations
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Built for developers who value performance, simplicity, and beautiful motion
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative p-8 bg-gray-900/30 backdrop-blur-sm border border-gray-800/50 rounded-2xl hover:border-gray-700/50 transition-all duration-300 hover:bg-gray-900/50"
              >
                {/* Card glow effect */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10`}></div>
                
                {/* Icon */}
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={24} className={feature.iconColor} />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-semibold text-white mb-4 group-hover:text-gray-100 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                  {feature.description}
                </p>

                {/* Bottom accent line */}
                <div className={`absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-60 transition-opacity duration-300`}></div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20">
          <div className="inline-flex items-center space-x-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gray-600"></div>
            <p className="text-gray-500 text-sm">Ready to get started?</p>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-gray-600"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

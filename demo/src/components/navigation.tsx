import React from "react";
import { Github } from "lucide-react";

interface NavigationProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({
  activeSection,
  setActiveSection,
}) => {
  const sections = [
    "Hero",
    "Examples",
    "API",
    "Installation",
    "Features",
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 nav-blur border-b border-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg animate-pulse"></div>
            <span className="text-white font-bold text-xl">Mayonation</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            {sections.map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`text-sm transition-colors ${
                  activeSection === section
                    ? "text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {section}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/utkarsh5026/mayonation"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Github size={20} />
            </a>
            <button className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

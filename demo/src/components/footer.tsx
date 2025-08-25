import React from "react";
import { Github, Twitter } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-900 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded"></div>
              <span className="text-white font-medium">Mayonation</span>
            </div>
            <p className="text-gray-500 text-sm">
              A lightweight animation library for modern web applications
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-gray-500 hover:text-gray-300 text-sm"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-500 hover:text-gray-300 text-sm"
                >
                  Examples
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-500 hover:text-gray-300 text-sm"
                >
                  API Reference
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4">Community</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-gray-500 hover:text-gray-300 text-sm"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-500 hover:text-gray-300 text-sm"
                >
                  Discord
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-500 hover:text-gray-300 text-sm"
                >
                  Twitter
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4">More</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-gray-500 hover:text-gray-300 text-sm"
                >
                  Changelog
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-500 hover:text-gray-300 text-sm"
                >
                  License
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-500 hover:text-gray-300 text-sm"
                >
                  Contributing
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-900 pt-8 flex items-center justify-between">
          <p className="text-gray-600 text-sm">
            © 2024 Mayonation. Built by Utkarsh Priyadarshi
          </p>
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/utkarsh5026/mayonation"
              className="text-gray-600 hover:text-gray-400"
            >
              <Github size={18} />
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-400">
              <Twitter size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

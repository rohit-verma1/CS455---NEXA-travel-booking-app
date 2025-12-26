"use client";

import React, { useEffect, useState } from "react";
import { Search, User } from "lucide-react";

interface NavigationProps {
  onSearch?: (query: string) => void;
  onNavigate?: (section: "blogs" | "forums") => void;
  activeSection?: "blogs" | "forums";
}

const Navigation: React.FC<NavigationProps> = ({
  onSearch,
  onNavigate,
  activeSection = "blogs",
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    onSearch?.(searchQuery.trim());
  };

  const handleNavigate = (section: "blogs" | "forums") => {
    onNavigate?.(section);
  };

  const tabClasses = (section: "blogs" | "forums") =>
    `font-medium px-3 py-2 transition-colors relative ${
      activeSection === section
        ? "text-blue-600"
        : "text-gray-600 hover:text-gray-900"
    }`;

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/95 backdrop-blur-md shadow-sm" : "bg-white"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-500">
              <span className="text-sm font-bold text-white">N</span>
            </div>
            <span className="font-display text-xl font-semibold text-gray-900">
              Nexa
            </span>
          </div>

          <div className="hidden items-center space-x-8 md:flex">
            <button
              type="button"
              onClick={() => handleNavigate("blogs")}
              className={tabClasses("blogs")}
            >
              Blogs
              {activeSection === "blogs" && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleNavigate("forums")}
              className={tabClasses("forums")}
            >
              Forums
              {activeSection === "forums" && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search destinations..."
              className="w-64 rounded-lg border border-gray-300 px-10 py-2 text-sm text-gray-700 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </form>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600"
          >
            <User className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

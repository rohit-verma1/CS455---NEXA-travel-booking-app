"use client";

import React from "react";
import { Grid, List, Search } from "lucide-react";
import type { SortOption, TransportCategory } from "@/types/forum";

interface ForumFiltersProps {
  activeCategory: TransportCategory;
  onCategoryChange: (category: TransportCategory) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const categories: Array<{ id: TransportCategory; label: string; icon: string }> = [
  { id: "all", label: "All Routes", icon: "🛣️" },
  { id: "flights", label: "Flights", icon: "✈️" },
  { id: "trains", label: "Trains", icon: "🚂" },
  { id: "buses", label: "Buses", icon: "🚌" },
];

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "recent", label: "Most Recent" },
  { value: "popular", label: "Most Popular" },
  { value: "rating", label: "Highest Rated" },
  { value: "comments", label: "Most Discussed" },
];

const ForumFilters: React.FC<ForumFiltersProps> = ({
  activeCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="mb-8 rounded-2xl bg-white p-6 shadow-lg">
      <div className="mb-6 flex flex-wrap gap-4">
        {categories.map(category => (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategoryChange(category.id)}
            className={`border-b-[3px] px-6 py-3 font-semibold transition ${
              activeCategory === category.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            <span className="mr-2">{category.icon}</span>
            {category.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center space-x-4">
          <span className="text-gray-600">Sort by:</span>
          <select
            value={sortBy}
            onChange={event => onSortChange(event.target.value as SortOption)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={event => onSearchChange(event.target.value)}
              placeholder="Search routes..."
              className="w-64 rounded-lg border border-gray-300 px-10 py-2 text-sm text-gray-700 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-blue-100 p-2 text-blue-600 transition hover:bg-blue-200"
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForumFilters;

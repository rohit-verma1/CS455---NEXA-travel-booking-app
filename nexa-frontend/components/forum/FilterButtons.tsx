"use client";

import React from "react";

interface FilterButtonsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const filters = [
  { id: "all", label: "All Destinations" },
  { id: "mumbai", label: "Mumbai" },
  { id: "delhi", label: "Delhi" },
  { id: "chennai", label: "Chennai" },
  { id: "ahmedabad", label: "Ahmedabad" },
  { id: "kanpur", label: "Kanpur" },
  { id: "chandigarh", label: "Chandigarh" },
];

const FilterButtons: React.FC<FilterButtonsProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  return (
    <div className="mb-12 flex flex-wrap justify-center gap-3">
      {filters.map(filter => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onFilterChange(filter.id)}
          className={`rounded-full px-6 py-2 font-medium transition duration-300 ${
            activeFilter === filter.id
              ? "scale-105 bg-blue-600 text-white shadow-lg"
              : "border-2 border-gray-200 bg-white text-gray-600 hover:border-blue-600 hover:text-blue-600"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

export default FilterButtons;

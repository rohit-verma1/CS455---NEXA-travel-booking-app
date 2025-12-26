"use client";

import React from "react";
import { MessageCircle, Star, TrendingUp, Users } from "lucide-react";

const stats = [
  {
    icon: MessageCircle,
    value: "2,847",
    label: "Active Discussions",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    icon: Users,
    value: "15,392",
    label: "Community Members",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    icon: Star,
    value: "8,721",
    label: "Route Reviews",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    icon: TrendingUp,
    value: "98.2%",
    label: "Satisfaction Rate",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
];

const ForumStats: React.FC = () => {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map(stat => (
          <div
            key={stat.label}
            className={`${stat.bgColor} transform rounded-2xl p-6 text-center shadow-lg transition duration-300 hover:scale-105 hover:shadow-xl`}
          >
            <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <p className="mt-2 text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ForumStats;

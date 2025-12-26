"use client";

import React from "react";
import Image from "next/image";
import type { Blog } from "@/types/forum";

interface BlogCardProps {
  blog: Blog;
  onClick: () => void;
  index: number;
}

const BlogCard: React.FC<BlogCardProps> = ({ blog, onClick, index }) => {
  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-[28px] border border-white/60 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 shadow-[0_30px_80px_rgba(15,23,42,0.18)] opacity-0 transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_35px_90px_rgba(15,23,42,0.28)] animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={onClick}
    >
      <div className="relative">
        <Image
          src={blog.image}
          alt={blog.title}
          width={400}
          height={200}
          className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-slate-900/0 to-transparent" />
        <div className="absolute left-4 top-4">
          <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-900">
            {blog.station}
          </span>
        </div>
        <div className="absolute right-4 top-4">
          <span className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 px-3 py-1 text-xs font-semibold text-white">
            {blog.readTime}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-6">
        <h3 className="font-display line-clamp-2 text-2xl font-semibold text-slate-900 transition-colors duration-300 group-hover:text-blue-700">
          {blog.title}
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
          {blog.excerpt}
        </p>

        <div className="flex flex-wrap gap-2">
          {blog.tags.map(tag => (
            <span
              key={tag}
              className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-blue-700"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
            Click to read more
          </span>
          <svg
            className="h-5 w-5 text-blue-600 transition-transform duration-300 group-hover:translate-x-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default BlogCard;

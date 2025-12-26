"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import type { Blog } from "@/types/forum";

interface BlogModalProps {
  blog: Blog;
  onClose: () => void;
}

const BlogModal: React.FC<BlogModalProps> = ({ blog, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="animate-modal-in max-h-[90vh] w-full max-w-4xl scale-95 overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h3 className="font-display text-2xl font-bold text-gray-900">
            {blog.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="modal-scroll max-h-[calc(90vh-120px)] overflow-y-auto p-6">
          <div className="mb-6 flex items-center space-x-4 text-sm text-gray-500">
            <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-800">
              {blog.station}
            </span>
            {blog.createdAt && (
              <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
            )}
            <span>{blog.readTime}</span>
          </div>

          <div dangerouslySetInnerHTML={{ __html: blog.content }} />

          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="flex flex-wrap gap-2">
              {blog.tags.map(tag => (
                <span
                  key={tag}
                  className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogModal;

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Send, X } from "lucide-react";
import type { ForumThread } from "@/types/forum";

interface NewPostModalProps {
  onClose: () => void;
  onSubmit: (data: { forumId: string; title: string; content: string }) => void;
  forums: ForumThread[];
  defaultForumId?: string;
}

const NewPostModal: React.FC<NewPostModalProps> = ({
  onClose,
  onSubmit,
  forums,
  defaultForumId,
}) => {
  const [forumId, setForumId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (defaultForumId) {
      setForumId(defaultForumId);
    } else if (forums.length > 0) {
      setForumId(forums[0].forum_id);
    } else {
      setForumId("");
    }
  }, [defaultForumId, forums]);

  const selectedForum = useMemo(
    () => forums.find(forum => forum.forum_id === forumId),
    [forumId, forums]
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!forumId) {
      alert("Please pick a forum to post in.");
      return;
    }

    if (!title.trim() || !content.trim()) {
      alert("Title and content are required.");
      return;
    }

    onSubmit({
      forumId,
      title: title.trim(),
      content: content.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="animate-modal-in max-h-[90vh] w-full max-w-2xl scale-95 overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h3 className="font-display text-2xl font-bold text-gray-900">
            Add a Post
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(90vh-120px)] space-y-4 overflow-y-auto p-6"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Forum
            </label>
            <select
              value={forumId}
              onChange={event => setForumId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Select a discussion forum</option>
              {forums.map(forum => (
                <option key={forum.forum_id} value={forum.forum_id}>
                  {forum.title} · {forum.service}
                </option>
              ))}
            </select>
            {selectedForum && (
              <p className="mt-2 text-xs text-gray-500">
                Posting in {selectedForum.title} · {selectedForum.service}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Post Title
            </label>
            <input
              type="text"
              value={title}
              onChange={event => setTitle(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Title for your post"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Content
            </label>
            <textarea
              value={content}
              onChange={event => setContent(event.target.value)}
              rows={6}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Share your thoughts or ask a question..."
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Send className="h-4 w-4" />
                Post Discussion
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPostModal;

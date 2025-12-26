"use client";

import React, { useMemo, useState } from "react";
import { MessageCircle, ThumbsUp, X } from "lucide-react";
import { API } from "@/app/api";
import type { ForumThread } from "@/types/forum";

interface ForumThreadModalProps {
  forum: ForumThread;
  onClose: () => void;
  authToken: string | null;
  onCommentAdded?: () => void;
  onRequestNewPost?: () => void;
}

const ForumThreadModal: React.FC<ForumThreadModalProps> = ({
  forum,
  onClose,
  authToken,
  onCommentAdded,
  onRequestNewPost,
}) => {
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [flatCommentsVisible, setFlatCommentsVisible] = useState<Record<string, boolean>>({});
  const [isSubmittingPostId, setIsSubmittingPostId] = useState<string | null>(null);
  const [animatingPostId, setAnimatingPostId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const totalCommentCount = useMemo(() => {
    return forum.posts.reduce(
      (total, post) => total + (post.comments?.length ?? 0),
      0
    );
  }, [forum.posts]);

  const handleDraftChange = (postId: string, value: string) => {
    setCommentDrafts(prev => ({ ...prev, [postId]: value }));
  };

  const handleAddComment = async (postId: string) => {
    if (!authToken) {
      setErrorMessage("Please log in to post a comment.");
      return;
    }

    const content = (commentDrafts[postId] || "").trim();
    if (!content) return;

    setIsSubmittingPostId(postId);
    setErrorMessage("");

    try {
      const response = await fetch(API.FORUM_COMMENT_CREATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          Authorization: `Token ${authToken}`,
        },
        body: JSON.stringify({
          post: postId,
          content,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Unable to submit comment.");
      }

      setCommentDrafts(prev => ({ ...prev, [postId]: "" }));
      onCommentAdded?.();
    } catch (error) {
      console.error("Comment submit error:", error);
      setErrorMessage("Unable to save your comment. Please try again.");
    } finally {
      setIsSubmittingPostId(null);
    }
  };

  const toggleComments = (postId: string) => {
    setFlatCommentsVisible(prev => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleUpvoteAnimation = (postId: string) => {
    setAnimatingPostId(postId);
    setTimeout(() => {
      setAnimatingPostId(current => (current === postId ? null : current));
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="animate-modal-in max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 px-6 py-6">
          <div className="max-w-[70%] space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              {forum.service}
            </div>
            <h3 className="font-display text-3xl font-semibold text-slate-900">
              {forum.title}
            </h3>
            <p className="text-sm text-slate-600">
              {forum.description || "No description provided yet."}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase text-slate-400">
              <span>{forum.posts.length} posts</span>
              <span>{totalCommentCount} comments</span>
              <span>
                Started on{" "}
                {forum.created_at
                  ? new Date(forum.created_at).toLocaleDateString()
                  : "Unknown date"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onRequestNewPost?.()}
              className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Add Post
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
          {errorMessage && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {forum.posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No posts have been added yet. Start the discussion by adding the first post.
            </div>
          ) : (
            <div className="space-y-8">
              {forum.posts.map(post => {
                const comments = post.comments ?? [];
                return (
                  <article
                    key={post.post_id}
                    className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-[0_25px_60px_rgba(15,23,42,0.08)]"
                  >
                    <header className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
                        <span className="font-semibold text-slate-900">{post.user_name}</span>
                        <span>{post.created_ago}</span>
                      </div>
                      <h4 className="mt-2 text-xl font-semibold text-slate-900">{post.title}</h4>
                      <p className="text-sm text-slate-500">{post.content}</p>
                    </header>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleUpvoteAnimation(post.post_id)}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition ${
                          animatingPostId === post.post_id
                            ? "bg-blue-100 text-blue-600 scale-105"
                            : "hover:bg-slate-100"
                        }`}
                      >
                        <ThumbsUp
                          className={`h-4 w-4 transition-all ${
                            animatingPostId === post.post_id ? "animate-pulse" : ""
                          }`}
                        />
                        <span>Upvote</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleComments(post.post_id)}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1 transition hover:bg-slate-100"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>
                          {flatCommentsVisible[post.post_id] ?? true
                            ? "Hide comments"
                            : "Show comments"}
                        </span>
                      </button>
                    </div>

                    <div
                      className={`mt-6 space-y-4 ${
                        flatCommentsVisible[post.post_id] ?? true
                          ? "block"
                          : "hidden"
                      }`}
                    >
                      {comments.map(comment => (
                        <div
                          key={comment.comment_id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                            <span>{comment.user_name}</span>
                            <span>{comment.created_ago}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-700">{comment.content}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
                      <textarea
                        value={commentDrafts[post.post_id] ?? ""}
                        onChange={event => handleDraftChange(post.post_id, event.target.value)}
                        rows={3}
                        placeholder="Join the conversation..."
                        className="w-full resize-none rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                      <div className="mt-3 flex items-center justify-end gap-3">
                        {!authToken && (
                          <span className="text-xs text-red-500">
                            Log in to post a comment.
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={
                            !authToken ||
                            isSubmittingPostId === post.post_id ||
                            !(commentDrafts[post.post_id] || "").trim()
                          }
                          onClick={() => handleAddComment(post.post_id)}
                          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                        >
                          {isSubmittingPostId === post.post_id ? "Posting..." : "Post Comment"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumThreadModal;

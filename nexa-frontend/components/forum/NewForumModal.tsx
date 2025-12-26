"use client";

import React, { useState } from "react";
import { Send, X } from "lucide-react";

interface NewForumModalProps {
  onClose: () => void;
  onCreate: (payload: { title: string; description: string; service: string }) => void;
}

const serviceOptions = [
  { label: "Flights", value: "Flights" },
  { label: "Trains", value: "Trains" },
  { label: "Buses", value: "Buses" },
];

const NewForumModal: React.FC<NewForumModalProps> = ({ onClose, onCreate }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [service, setService] = useState(serviceOptions[1].value);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert("Title and description are required.");
      return;
    }

    onCreate({
      title: title.trim(),
      description: description.trim(),
      service,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="animate-modal-in max-h-[90vh] w-full max-w-2xl scale-95 overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h3 className="font-display text-2xl font-bold text-gray-900">
            Start New Discussion
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
              Discussion Title
            </label>
            <input
              type="text"
              value={title}
              onChange={event => setTitle(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="e.g., Mumbai to Delhi Rajdhani Express - Premium Experience"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              value={service}
              onChange={event => setService(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {serviceOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={event => setDescription(event.target.value)}
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Share the goal of this discussion and what kind of posts people should expect."
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
                Create Forum
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

export default NewForumModal;

"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Star, MoreVertical, MessageSquare, X, Loader2, RefreshCw, Send } from 'lucide-react';
import type { ProviderReviewComment } from '@/app/api';

interface ProviderReviewsData {
  average_rating: number;
  total_reviews: number;
  ratings_dict: Record<string, number>;
  comments: ProviderReviewComment[];
}

interface ReviewCard {
  id: string;
  passenger: string;
  rating: number;
  date: string;
  service: string;
  comment: string;
  title?: string;
  metadata?: string;
  responded: boolean;
}

interface ReviewsPageProps {
  theme: any;
  isDarkMode: boolean;
  reviewsData: ProviderReviewsData | null;
  serviceProviderLoading?: boolean;
  serviceProviderError?: string | null;
  refreshProviderData?: () => void;
}

const formatCommentDate = (value?: string) => {
  if (!value) return 'Unknown date';
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return 'Unknown date';
  return parsed.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const transformComments = (comments: ProviderReviewComment[]): ReviewCard[] => {
  return comments.map((comment, index) => {
    const formattedDate = formatCommentDate(comment.date);
    const service = comment.booking_source && comment.booking_destination
      ? `${comment.booking_source} → ${comment.booking_destination}`
      : comment.booking_source ?? comment.booking_destination ?? 'Booking';

    return {
      id: comment.booking_id ?? `${comment.user}-${comment.date ?? index}`,
      passenger: comment.user || 'Traveler',
      rating: Number(comment.rating ?? 0),
      date: formattedDate,
      service,
      comment: comment.comment_body ?? 'No message provided.',
      title: comment.comment_title,
      metadata: comment.booking_id ? `Booking ID: ${comment.booking_id}` : undefined,
      responded: false,
    };
  });
};

export default function ReviewsPage({
  theme,
  isDarkMode,
  reviewsData,
  serviceProviderLoading = false,
  serviceProviderError,
  refreshProviderData,
}: ReviewsPageProps) {
  const t = theme;
  const [reviews, setReviews] = useState<ReviewCard[]>([]);
  const [responseModal, setResponseModal] = useState<string | null>(null);

  useEffect(() => {
    setReviews(transformComments(reviewsData?.comments ?? []));
  }, [reviewsData]);

  const totalReviews = reviewsData?.total_reviews ?? reviews.length;
  const avgRating = reviewsData?.average_rating ?? (reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0);
  const safeAvgRating = Number.isFinite(avgRating) ? avgRating : 0;

  const distribution = useMemo(() => {
    const dict = reviewsData?.ratings_dict ?? {};
    return [5, 4, 3, 2, 1].map((rating) => {
      const count = Number(dict[rating.toString()] ?? 0);
      const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
      return { rating, count, percentage };
    });
  }, [reviewsData, totalReviews]);

  const handleRespondSuccess = (reviewId: string) => {
    setReviews(prev => prev.map(item => item.id === reviewId ? { ...item, responded: true } : item));
    setResponseModal(null);
  };

  return (
    <div className="space-y-6">
      <h1 className={`text-3xl font-bold ${t.text}`}>Customer Reviews & Feedback</h1>

      {serviceProviderError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex flex-col gap-2 text-sm text-rose-700">
            <span className="font-semibold">Unable to load reviews</span>
            <span>{serviceProviderError}</span>
            {refreshProviderData && (
              <button
                onClick={refreshProviderData}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-600 hover:text-rose-700"
              >
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            )}
          </div>
        </div>
      )}

      {serviceProviderLoading && !reviews.length && (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          Loading reviews...</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${t.card} rounded-xl p-6 border ${t.cardBorder}`}>
          <div className="text-center">
            <div className={`text-5xl font-bold ${t.text} mb-2`}>{safeAvgRating.toFixed(1)}</div>
            <div className="flex justify-center mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={`w-6 h-6 ${star <= Math.round(safeAvgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
              ))}
            </div>
            <div className={`${t.textSecondary}`}>
              Based on {totalReviews} review{totalReviews === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <div className={`lg:col-span-2 ${t.card} rounded-xl p-6 border ${t.cardBorder}`}>
          <h3 className={`text-lg font-bold ${t.text} mb-4`}>Rating Distribution</h3>
          <div className="space-y-3">
            {distribution.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-20">
                  <span className={`${t.text}`}>{rating}</span>
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                </div>
                <div className={`flex-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-3`}>
                  <div
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className={`${t.textSecondary} text-sm w-12`}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`${t.card} rounded-xl p-4 border ${t.cardBorder}`}>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${t.textSecondary} w-5 h-5`} />
            <input
              type="text"
              placeholder="Search reviews..."
              className={`w-full pl-10 pr-4 py-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} rounded-lg ${t.text} ${isDarkMode ? 'placeholder-gray-400' : 'placeholder-gray-500'} focus:outline-none focus:border-sky-500`}
            />
          </div>
          <select className={`px-4 py-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} rounded-lg ${t.text} focus:outline-none focus:border-sky-500`}>
            <option>All Ratings</option>
            <option>5 Stars</option>
            <option>4 Stars</option>
            <option>3 Stars</option>
            <option>2 Stars</option>
            <option>1 Star</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className={`rounded-xl border ${t.cardBorder} ${t.card} p-6 text-center text-sm ${t.textSecondary}`}>
            {serviceProviderLoading ? 'Waiting for reviews to load...' : 'No reviews yet.'}
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className={`${t.card} rounded-xl p-6 border ${t.cardBorder} hover:border-sky-500 transition-all ${review.responded ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600 flex items-center justify-center ${t.text} font-bold text-lg`}>
                    {review.passenger.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <div className={`${t.text} font-semibold`}>{review.passenger}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                        ))}
                      </div>
                      <span className={`${t.textSecondary} text-sm`}>{review.date}</span>
                    </div>
                  </div>
                </div>
                <button className={`${t.textSecondary} hover:${t.text}`}>
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              {review.title && <p className={`text-sm font-semibold ${t.textSecondary} mb-1`}>{review.title}</p>}
              <div className={`text-sm ${t.textSecondary} mb-2`}>{review.service}</div>
              <p className={`${t.text}`}>{review.comment}</p>
              {review.metadata && <p className={`text-xs ${t.textSecondary} mt-3`}>{review.metadata}</p>}

              {!review.responded && (
                <button
                  onClick={() => setResponseModal(review.id)}
                  className={`mt-4 px-4 py-2 bg-sky-600 ${t.text} rounded-lg hover:bg-sky-700 transition-colors text-sm flex items-center gap-2`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Respond to Review
                </button>
              )}

              {review.responded && (
                <div className="bg-sky-600/10 border border-sky-500/30 rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-sky-400" />
                    <span className="text-sm font-medium text-sky-400">Your Response</span>
                  </div>
                  <p className={`${t.textSecondary} text-sm`}>Thank you for your feedback! We&apos;re glad you had a good experience with our service.</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {responseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-gray-900 rounded-xl max-w-lg w-full border ${t.cardBorder}`}>
            <div className={`p-6 border-b ${t.cardBorder} flex items-center justify-between`}>
              <h2 className={`text-2xl font-bold ${t.text}`}>Respond to Review</h2>
              <button onClick={() => setResponseModal(null)} className={`${t.textSecondary} hover:${t.text}`}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium ${t.textSecondary} mb-2`}>Your Response</label>
                <textarea 
                  rows={5}
                  placeholder="Write your response..."
                  className={`w-full px-4 py-2 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} border ${t.cardBorder} rounded-lg ${t.text} focus:outline-none focus:border-sky-500`}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setResponseModal(null)} className={`flex-1 px-6 py-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} ${t.text} rounded-lg ${t.hover} transition-colors`}>
                  Cancel
                </button>
                <button 
                  onClick={() => responseModal && handleRespondSuccess(responseModal)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-700 via-blue-600 to-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Send Response
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

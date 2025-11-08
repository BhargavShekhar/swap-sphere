/**
 * Review Modal Component
 * Allows users to submit reviews after both users confirm session completion
 */

import { useState, useEffect } from 'react';
import { 
  submitReview, 
  getReviewStatus, 
  confirmCompletion,
  type SubmitReviewRequest 
} from '../services/review.api';
import { getExchanges, type Exchange } from '../services/exchange.api';
import { DisplayName } from './DisplayName';
import { UserAvatar } from './UserAvatar';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: {
    userA: { id: string; username: string; name?: string };
    userB: { id: string; username: string; name?: string };
  };
  currentUserId: string;
}

export function ReviewModal({
  isOpen,
  onClose,
  match,
  currentUserId,
}: ReviewModalProps) {
  const [userRating, setUserRating] = useState(0);
  const [teachingRating, setTeachingRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [readyForReview, setReadyForReview] = useState(false);
  const [bothConfirmed, setBothConfirmed] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const partner = match.userA.id === currentUserId ? match.userB : match.userA;
  const partnerId = partner.id;
  // Convert partner to User format for components
  const partnerUser = {
    id: partner.id,
    name: partner.name || partner.username,
    username: partner.username,
  };

  useEffect(() => {
    if (isOpen) {
      findSessionAndCheckStatus();
    }
  }, [isOpen]);

  const findSessionAndCheckStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Find exchange between these users
      const exchangesResponse = await getExchanges();
      const existingExchange = exchangesResponse.exchanges.find(
        (ex: Exchange) =>
          (ex.userA._id === currentUserId && ex.userB._id === partnerId) ||
          (ex.userB._id === currentUserId && ex.userA._id === partnerId)
      );

      if (existingExchange) {
        setSessionId(existingExchange._id);
        await checkReviewStatus(existingExchange._id);
      } else {
        setError('No session found. Please start a collaboration first.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error finding session:', err);
      setError('Failed to load session information');
      setLoading(false);
    }
  };

  const checkReviewStatus = async (exId: string) => {
    try {
      const status = await getReviewStatus(exId, currentUserId);
      
      setReadyForReview(status.readyForReview);
      setBothConfirmed(status.bothConfirmed);
      setHasReviewed(status.hasReviewed);
      setWaitingForPartner(status.status === 'in_progress' && !status.bothConfirmed);

      if (status.hasReviewed) {
        setError('You have already submitted a review for this session.');
      }
    } catch (err: any) {
      console.error('Error checking review status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!sessionId) return;

    try {
      setConfirming(true);
      setError(null);

      const response = await confirmCompletion(sessionId, currentUserId);
      
      setBothConfirmed(response.bothConfirmed);
      setReadyForReview(response.readyForReview);
      setWaitingForPartner(!response.bothConfirmed);

      if (response.bothConfirmed) {
        await checkReviewStatus(sessionId);
      }
    } catch (err: any) {
      console.error('Error confirming completion:', err);
      setError(err.response?.data?.error || 'Failed to confirm completion');
    } finally {
      setConfirming(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (userRating === 0 || teachingRating === 0) {
      setError('Please provide both ratings');
      return;
    }

    if (!sessionId) {
      setError('Session ID is required');
      return;
    }

    if (reviewText && reviewText.length > 250) {
      setError('Review text must be 250 characters or less');
      return;
    }

    setSubmitting(true);

    try {
      const reviewData: SubmitReviewRequest = {
        sessionId,
        reviewerId: currentUserId,
        partnerId,
        userRating,
        teachingRating,
        reviewText: reviewText.trim() || undefined,
      };

      await submitReview(reviewData);

      // Success - close modal and reset form
      setUserRating(0);
      setTeachingRating(0);
      setReviewText('');
      setHasReviewed(true);
      onClose();
      
      // Show success message
      alert('Review submitted successfully! Thank you for your feedback.');
    } catch (err: any) {
      console.error('Error submitting review:', err);
      setError(err.response?.data?.error || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({
    rating,
    onRatingChange,
    label,
  }: {
    rating: number;
    onRatingChange: (rating: number) => void;
    label: string;
  }) => {
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {label}
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onRatingChange(star)}
              className={`text-4xl transition-colors ${
                star <= rating
                  ? 'text-yellow-400'
                  : 'text-gray-300 hover:text-gray-400'
              }`}
              disabled={submitting || !readyForReview}
            >
              ★
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-3 text-lg text-gray-600 self-center font-semibold">
              {rating}/5
            </span>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <UserAvatar user={partnerUser} size="md" />
              <h2 className="text-2xl font-bold text-gray-900">
                Review <DisplayName user={partnerUser} />
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              disabled={submitting}
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-4 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading session information...</p>
            </div>
          ) : waitingForPartner ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">⏳</div>
              <p className="text-lg text-gray-700 mb-2 font-semibold">
                Waiting for partner to confirm session completion...
              </p>
              <p className="text-sm text-gray-500 mb-4">
                You can submit your review once both parties have confirmed.
              </p>
              <button
                onClick={findSessionAndCheckStatus}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Refresh Status
              </button>
            </div>
          ) : !bothConfirmed && sessionId ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-lg text-gray-700 mb-4 font-semibold">
                Please confirm that the collaboration session has ended.
              </p>
              <button
                onClick={handleConfirmCompletion}
                disabled={confirming}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg"
              >
                {confirming ? 'Confirming...' : 'Confirm Session Completion'}
              </button>
            </div>
          ) : hasReviewed ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✓</div>
              <p className="text-lg text-gray-700 mb-2 font-semibold">
                You have already submitted a review for this session.
              </p>
              <p className="text-sm text-gray-500">
                Thank you for your feedback!
              </p>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-6">
                Please rate your collaboration experience with <strong><DisplayName user={partnerUser} /></strong>. 
                Your feedback helps build trust in our community!
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Partner Rating */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <StarRating
                    rating={userRating}
                    onRatingChange={setUserRating}
                    label="Rate your partner (1-5 stars)"
                  />
                </div>

                {/* Teaching Quality Rating */}
                <div className="mb-6 p-4 bg-green-50 rounded-lg">
                  <StarRating
                    rating={teachingRating}
                    onRatingChange={setTeachingRating}
                    label="Rate teaching quality (1-5 stars)"
                  />
                </div>

                {/* Optional Text Review */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Optional Review Text (max 250 characters)
                  </label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your thoughts about the collaboration (optional)..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                    disabled={submitting}
                    maxLength={250}
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {reviewText.length}/250 characters
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || userRating === 0 || teachingRating === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


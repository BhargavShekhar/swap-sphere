/**
 * Review API Service
 * Handles review confirmations, submissions, and status checks
 */

import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
const REVIEW_API_BASE = `${BACKEND_URL}/api/review`;

export interface ReviewStatus {
  sessionId: string;
  status: string;
  userAConfirmed: boolean;
  userBConfirmed: boolean;
  bothConfirmed: boolean;
  readyForReview: boolean;
  hasReviewed: boolean;
}

export interface SubmitReviewRequest {
  sessionId: string;
  reviewerId: string;
  partnerId: string;
  userRating: number; // 1-5
  teachingRating: number; // 1-5
  reviewText?: string; // Optional, max 250 chars
}

export interface SubmitReviewResponse {
  success: boolean;
  message: string;
  review: {
    _id: string;
    userRating: number;
    teachingRating: number;
    reviewText?: string;
    createdAt: string;
  };
}

/**
 * Confirm session completion
 */
export async function confirmCompletion(sessionId: string, userId: string): Promise<{
  success: boolean;
  bothConfirmed: boolean;
  readyForReview: boolean;
  session: any;
}> {
  const response = await axios.post(
    `${REVIEW_API_BASE}/confirm`,
    { sessionId, userId }
  );
  return response.data;
}

/**
 * Get review status for a session
 */
export async function getReviewStatus(sessionId: string, userId?: string): Promise<ReviewStatus> {
  const params = userId ? { userId } : {};
  const response = await axios.get(
    `${REVIEW_API_BASE}/status/${sessionId}`,
    { params }
  );
  return response.data;
}

/**
 * Submit a review
 */
export async function submitReview(data: SubmitReviewRequest): Promise<SubmitReviewResponse> {
  const response = await axios.post(
    `${REVIEW_API_BASE}/submit`,
    data
  );
  return response.data;
}



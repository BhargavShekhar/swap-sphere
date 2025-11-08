/**
 * Review Model
 * Stores reviews for collaboration sessions
 */

import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IReview extends Document {
  sessionId: mongoose.Types.ObjectId; // Reference to Exchange/Session
  reviewerId: mongoose.Types.ObjectId; // User who wrote the review
  partnerId: mongoose.Types.ObjectId; // User being reviewed
  userRating: number; // 1-5 rating for the partner
  teachingRating: number; // 1-5 rating for teaching quality
  reviewText?: string; // Optional text review (max 250 chars)
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Exchange',
      required: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    teachingRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    reviewText: {
      type: String,
      trim: true,
      maxlength: 250,
    },
  },
  {
    timestamps: true,
    collection: 'reviews',
  }
);

// Index for faster queries
ReviewSchema.index({ sessionId: 1, reviewerId: 1 }); // Prevent duplicate reviews
ReviewSchema.index({ partnerId: 1, createdAt: -1 }); // Get reviews for a user
ReviewSchema.index({ reviewerId: 1, partnerId: 1 }); // Check if review exists

// Export model
const Review: Model<IReview> = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

export default Review;



/**
 * Exchange Model
 * Represents a learning exchange session between two matched users
 */

import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IExchange extends Document {
  userA: mongoose.Types.ObjectId; // User who offers Skill A
  userB: mongoose.Types.ObjectId; // User who offers Skill B
  skillA: string; // What userA is teaching
  skillB: string; // What userB is teaching
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  roomId: string; // Unique room ID for the classroom
  startedAt?: Date;
  completedAt?: Date;
  // Mutual confirmation
  userAConfirmed: boolean; // User A confirmed completion
  userBConfirmed: boolean; // User B confirmed completion
  // Reviews
  userAReview?: {
    rating: number; // 1-5
    review: string;
    skillTaught: string; // Which skill they reviewed
  };
  userBReview?: {
    rating: number; // 1-5
    review: string;
    skillTaught: string; // Which skill they reviewed
  };
  createdAt: Date;
  updatedAt: Date;
}

const ExchangeSchema = new Schema<IExchange>(
  {
    userA: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userB: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    skillA: {
      type: String,
      required: true,
      trim: true,
    },
    skillB: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    roomId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    userAConfirmed: {
      type: Boolean,
      default: false,
    },
    userBConfirmed: {
      type: Boolean,
      default: false,
    },
    userAReview: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      review: {
        type: String,
        trim: true,
      },
      skillTaught: {
        type: String,
        trim: true,
      },
    },
    userBReview: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      review: {
        type: String,
        trim: true,
      },
      skillTaught: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
    collection: 'exchanges',
  }
);

// Index for faster queries
ExchangeSchema.index({ userA: 1, status: 1 });
ExchangeSchema.index({ userB: 1, status: 1 });
ExchangeSchema.index({ roomId: 1 });

// Export model
const Exchange: Model<IExchange> = mongoose.models.Exchange || mongoose.model<IExchange>('Exchange', ExchangeSchema);

export default Exchange;


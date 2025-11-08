/**
 * Review Controller
 * Handles review business logic
 */

import mongoose from 'mongoose';
import Review from '../models/Review.js';

/**
 * Confirm session completion
 * Saves completion flag for each user
 * If both confirmed, allows review modal to open
 */
export async function confirmCompletion(req: any, res: any) {
  try {
    const { sessionId, userId } = req.body;

    if (!sessionId || !userId) {
      return res.status(400).json({ error: 'sessionId and userId are required' });
    }

    // Get exchange from matching-engine database
    const Exchange = (mongoose.models.Exchange || mongoose.model('Exchange', new mongoose.Schema({}, { strict: false }), 'exchanges')) as any;
    const exchange = await Exchange.findById(sessionId);

    if (!exchange) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const isUserA = String(exchange.userA) === userId;
    const isUserB = String(exchange.userB) === userId;

    if (!isUserA && !isUserB) {
      return res.status(403).json({ error: 'You are not part of this session' });
    }

    if (exchange.status !== 'in_progress') {
      return res.status(400).json({ error: 'Session must be in progress to confirm' });
    }

    // Mark confirmation
    if (isUserA) {
      exchange.userAConfirmed = true;
    } else {
      exchange.userBConfirmed = true;
    }

    // If both confirmed, mark as completed
    const bothConfirmed = exchange.userAConfirmed && exchange.userBConfirmed;
    if (bothConfirmed) {
      exchange.status = 'completed';
      exchange.completedAt = new Date();
    }

    await exchange.save();

    res.json({
      success: true,
      bothConfirmed,
      readyForReview: bothConfirmed,
      session: {
        _id: exchange._id,
        status: exchange.status,
        userAConfirmed: exchange.userAConfirmed,
        userBConfirmed: exchange.userBConfirmed,
      },
    });
  } catch (error: any) {
    console.error('Error confirming completion:', error);
    return res.status(500).json({ error: 'Failed to confirm completion', message: error.message });
  }
}

/**
 * Get review status for a session
 * Returns whether the session is ready for review
 */
export async function getReviewStatus(req: any, res: any) {
  try {
    const { id: sessionId } = req.params;
    const userId = req.query.userId || req.body.userId;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Get exchange from matching-engine database
    const Exchange = (mongoose.models.Exchange || mongoose.model('Exchange', new mongoose.Schema({}, { strict: false }), 'exchanges')) as any;
    const exchange = await Exchange.findById(sessionId);

    if (!exchange) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const isUserA = String(exchange.userA) === userId;
    const isUserB = String(exchange.userB) === userId;

    if (!isUserA && !isUserB && userId) {
      return res.status(403).json({ error: 'You are not part of this session' });
    }

    // Check if user has already submitted a review
    let hasReviewed = false;
    if (userId) {
      const partnerId = isUserA ? exchange.userB : exchange.userA;
      const existingReview = await Review.findOne({
        sessionId: new mongoose.Types.ObjectId(sessionId),
        reviewerId: new mongoose.Types.ObjectId(userId),
        partnerId: new mongoose.Types.ObjectId(partnerId),
      });
      hasReviewed = !!existingReview;
    }

    res.json({
      sessionId: exchange._id,
      status: exchange.status,
      userAConfirmed: exchange.userAConfirmed,
      userBConfirmed: exchange.userBConfirmed,
      bothConfirmed: exchange.userAConfirmed && exchange.userBConfirmed,
      readyForReview: exchange.status === 'completed' && exchange.userAConfirmed && exchange.userBConfirmed,
      hasReviewed,
    });
  } catch (error: any) {
    console.error('Error getting review status:', error);
    return res.status(500).json({ error: 'Failed to get review status', message: error.message });
  }
}

/**
 * Submit a review for a completed collaboration
 * Saves review to MongoDB, recalculates trust score, updates user profile
 */
export async function submitReview(req: any, res: any) {
  console.log("✅ submitReview route hit");
  try {
    const { sessionId, reviewerId, partnerId, userRating, teachingRating, reviewText } = req.body;

    // Validation
    if (!sessionId || !reviewerId || !partnerId || !userRating || !teachingRating) {
      return res.status(400).json({ error: 'sessionId, reviewerId, partnerId, userRating, and teachingRating are required' });
    }

    if (userRating < 1 || userRating > 5 || teachingRating < 1 || teachingRating > 5) {
      return res.status(400).json({ error: 'Ratings must be between 1 and 5' });
    }

    if (reviewText && reviewText.length > 250) {
      return res.status(400).json({ error: 'Review text must be 250 characters or less' });
    }

    // Verify session exists and is completed
    const Exchange = (mongoose.models.Exchange || mongoose.model('Exchange', new mongoose.Schema({}, { strict: false }), 'exchanges')) as any;
    const exchange = await Exchange.findById(sessionId);

    if (!exchange) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (exchange.status !== 'completed') {
      return res.status(400).json({ error: 'Session must be completed to submit a review' });
    }

    // Verify user is part of the session
    const isUserA = String(exchange.userA) === reviewerId;
    const isUserB = String(exchange.userB) === reviewerId;

    if (!isUserA && !isUserB) {
      return res.status(403).json({ error: 'You are not part of this session' });
    }

    // Verify partnerId matches
    const expectedPartnerId = isUserA ? String(exchange.userB) : String(exchange.userA);
    if (String(partnerId) !== expectedPartnerId) {
      return res.status(400).json({ error: 'Invalid partnerId' });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      sessionId: new mongoose.Types.ObjectId(sessionId),
      reviewerId: new mongoose.Types.ObjectId(reviewerId),
      partnerId: new mongoose.Types.ObjectId(partnerId),
    });

    if (existingReview) {
      return res.status(400).json({ error: 'Review already submitted for this session' });
    }

    // Create review
    const review = new Review({
      sessionId: new mongoose.Types.ObjectId(sessionId),
      reviewerId: new mongoose.Types.ObjectId(reviewerId),
      partnerId: new mongoose.Types.ObjectId(partnerId),
      userRating,
      teachingRating,
      reviewText: reviewText?.trim() || undefined,
    });

    await review.save();

    // Recalculate and update trust score for the partner
    await updateTrustScore(new mongoose.Types.ObjectId(partnerId));

    res.json({
      success: true,
      message: 'Review submitted successfully',
      review: {
        _id: review._id,
        userRating: review.userRating,
        teachingRating: review.teachingRating,
        reviewText: review.reviewText,
        createdAt: review.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    return res.status(500).json({ error: 'Failed to submit review', message: error.message });
  }
}

/**
 * Update trust score for a user
 * trust_score = (0.6 * average_user_rating) + (0.4 * average_teaching_rating)
 */
async function updateTrustScore(userId: mongoose.Types.ObjectId) {
  try {
    // Get all reviews for this user (as partnerId)
    const reviews = await Review.find({ partnerId: userId });

    if (reviews.length === 0) {
      return; // No reviews yet, keep default trust score
    }

    // Calculate averages
    const avgUserRating = reviews.reduce((sum: number, r: any) => sum + r.userRating, 0) / reviews.length;
    const avgTeachingRating = reviews.reduce((sum: number, r: any) => sum + r.teachingRating, 0) / reviews.length;

    // Calculate trust score: (0.6 * average_user_rating) + (0.4 * average_teaching_rating)
    // Normalize to 0-1 scale (ratings are 1-5, so divide by 5)
    const trustScore = (0.6 * avgUserRating + 0.4 * avgTeachingRating) / 5;

    // Update user's trust score
    const User = (mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users')) as any;
    await User.findByIdAndUpdate(userId, {
      trustScore: Math.max(0, Math.min(1, trustScore)), // Clamp to 0-1
    });

    console.log('✅ Trust score updated:', {
      userId: String(userId),
      trustScore: Math.max(0, Math.min(1, trustScore)),
      avgUserRating,
      avgTeachingRating,
      reviewCount: reviews.length,
    });
  } catch (error: any) {
    console.error('Error updating trust score:', error);
  }
}



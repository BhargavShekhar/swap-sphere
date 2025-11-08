/**
 * Exchange API routes
 * Handles learning exchange sessions, confirmations, and reviews
 */

import { Router, type Router as ExpressRouter } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import Exchange from '../models/Exchange.model.js';
import User from '../models/User.model.js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { serializeUser } from '../utils/user.serializer.js';

const router: ExpressRouter = Router();

/**
 * POST /api/exchange/create
 * Create a new exchange from a match
 */
router.post('/create', authenticate, async (req, res) => {
  try {
    const userId = String((req as any).user.id);
    const { matchedUserId, skillA, skillB } = req.body;

    console.log('Creating exchange:', { userId, matchedUserId, skillA, skillB });

    if (!matchedUserId || !skillA || !skillB) {
      res.status(400).json({ error: 'matchedUserId, skillA, and skillB are required' });
      return;
    }

    // Convert to ObjectId
    let userAId: mongoose.Types.ObjectId;
    let userBId: mongoose.Types.ObjectId;

    try {
      userAId = new mongoose.Types.ObjectId(userId);
      userBId = new mongoose.Types.ObjectId(matchedUserId);
    } catch (idError: any) {
      console.error('Invalid ObjectId:', idError);
      res.status(400).json({ error: 'Invalid user ID format', message: idError.message });
      return;
    }

    // Verify both users exist
    const userA = await User.findById(userAId);
    const userB = await User.findById(userBId);

    if (!userA || !userB) {
      console.error('Users not found:', { userA: !!userA, userB: !!userB });
      res.status(404).json({ error: 'One or both users not found' });
      return;
    }

    // Check if exchange already exists
    const existingExchange = await Exchange.findOne({
      $or: [
        { userA: userAId, userB: userBId, status: { $in: ['pending', 'accepted', 'in_progress'] } },
        { userA: userBId, userB: userAId, status: { $in: ['pending', 'accepted', 'in_progress'] } },
      ],
    });

    if (existingExchange) {
      res.status(400).json({ error: 'An active exchange already exists between these users' });
      return;
    }

    // Create exchange
    const roomId = `room-${uuidv4()}`;
    const exchange = new Exchange({
      userA: userAId,
      userB: userBId,
      skillA: skillA.trim(),
      skillB: skillB.trim(),
      status: 'pending',
      roomId,
    });

    await exchange.save();
    await exchange.populate('userA userB', 'name email isAnonymous anonymousName anonymousAvatar');

    console.log('Exchange created successfully:', exchange._id);
    
    // Serialize users in exchange
    const serializedExchange = {
      ...exchange.toObject(),
      userA: serializeUser(exchange.userA, false),
      userB: serializeUser(exchange.userB, false),
    };
    
    res.status(201).json({ exchange: serializedExchange });
  } catch (error: any) {
    console.error('Error creating exchange:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create exchange', message: error.message });
  }
});

/**
 * POST /api/exchange/:exchangeId/accept
 * Accept a pending exchange
 */
router.post('/:exchangeId/accept', authenticate, async (req, res) => {
  try {
    const userId = String((req as any).user.id);
    const { exchangeId } = req.params;

    const exchange = await Exchange.findById(exchangeId);

    if (!exchange) {
      res.status(404).json({ error: 'Exchange not found' });
      return;
    }

    // Verify user is part of the exchange
    if (String(exchange.userA) !== userId && String(exchange.userB) !== userId) {
      res.status(403).json({ error: 'You are not part of this exchange' });
      return;
    }

    if (exchange.status !== 'pending') {
      res.status(400).json({ error: 'Exchange is not pending' });
      return;
    }

    exchange.status = 'accepted';
    exchange.startedAt = new Date();
    await exchange.save();
    await exchange.populate('userA userB', 'name email isAnonymous anonymousName anonymousAvatar');

    // Serialize users in exchange
    const serializedExchange = {
      ...exchange.toObject(),
      userA: serializeUser(exchange.userA, false),
      userB: serializeUser(exchange.userB, false),
    };

    res.json({ exchange: serializedExchange });
  } catch (error: any) {
    console.error('Error accepting exchange:', error);
    res.status(500).json({ error: 'Failed to accept exchange', message: error.message });
  }
});

/**
 * POST /api/exchange/:exchangeId/start
 * Start an accepted exchange (begin the session)
 */
router.post('/:exchangeId/start', authenticate, async (req, res) => {
  try {
    const userId = String((req as any).user.id);
    const { exchangeId } = req.params;

    const exchange = await Exchange.findById(exchangeId);

    if (!exchange) {
      res.status(404).json({ error: 'Exchange not found' });
      return;
    }

    if (String(exchange.userA) !== userId && String(exchange.userB) !== userId) {
      res.status(403).json({ error: 'You are not part of this exchange' });
      return;
    }

    if (exchange.status !== 'accepted') {
      res.status(400).json({ error: 'Exchange must be accepted before starting' });
      return;
    }

    exchange.status = 'in_progress';
    if (!exchange.startedAt) {
      exchange.startedAt = new Date();
    }
    await exchange.save();
    await exchange.populate('userA userB', 'name email isAnonymous anonymousName anonymousAvatar');

    // Serialize users in exchange
    const serializedExchange = {
      ...exchange.toObject(),
      userA: serializeUser(exchange.userA, false),
      userB: serializeUser(exchange.userB, false),
    };

    res.json({ exchange: serializedExchange });
  } catch (error: any) {
    console.error('Error starting exchange:', error);
    res.status(500).json({ error: 'Failed to start exchange', message: error.message });
  }
});

/**
 * POST /api/exchange/:exchangeId/confirm
 * User confirms completion of their side of the exchange
 */
router.post('/:exchangeId/confirm', authenticate, async (req, res) => {
  try {
    const userId = String((req as any).user.id);
    const { exchangeId } = req.params;

    const exchange = await Exchange.findById(exchangeId);

    if (!exchange) {
      res.status(404).json({ error: 'Exchange not found' });
      return;
    }

    const isUserA = String(exchange.userA) === userId;
    const isUserB = String(exchange.userB) === userId;

    if (!isUserA && !isUserB) {
      res.status(403).json({ error: 'You are not part of this exchange' });
      return;
    }

    if (exchange.status !== 'in_progress') {
      res.status(400).json({ error: 'Exchange must be in progress to confirm' });
      return;
    }

    // Mark confirmation
    if (isUserA) {
      exchange.userAConfirmed = true;
    } else {
      exchange.userBConfirmed = true;
    }

    // If both confirmed, mark as completed
    if (exchange.userAConfirmed && exchange.userBConfirmed) {
      exchange.status = 'completed';
      exchange.completedAt = new Date();
    }

    await exchange.save();
    await exchange.populate('userA userB', 'name email isAnonymous anonymousName anonymousAvatar');

    // Serialize users in exchange
    const serializedExchange = {
      ...exchange.toObject(),
      userA: serializeUser(exchange.userA, false),
      userB: serializeUser(exchange.userB, false),
    };

    res.json({ 
      exchange: serializedExchange,
      bothConfirmed: exchange.userAConfirmed && exchange.userBConfirmed,
    });
  } catch (error: any) {
    console.error('Error confirming exchange:', error);
    res.status(500).json({ error: 'Failed to confirm exchange', message: error.message });
  }
});

/**
 * POST /api/exchange/:exchangeId/review
 * Submit a review for the exchange
 */
router.post('/:exchangeId/review', authenticate, async (req, res) => {
  try {
    const userId = String((req as any).user.id);
    const { exchangeId } = req.params;
    const { rating, review, skillTaught } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5' });
      return;
    }

    if (!review || review.trim().length === 0) {
      res.status(400).json({ error: 'Review text is required' });
      return;
    }

    if (!skillTaught) {
      res.status(400).json({ error: 'skillTaught is required' });
      return;
    }

    const exchange = await Exchange.findById(exchangeId);

    if (!exchange) {
      res.status(404).json({ error: 'Exchange not found' });
      return;
    }

    if (exchange.status !== 'completed') {
      res.status(400).json({ error: 'Exchange must be completed to submit a review' });
      return;
    }

    const isUserA = String(exchange.userA) === userId;
    const isUserB = String(exchange.userB) === userId;

    if (!isUserA && !isUserB) {
      res.status(403).json({ error: 'You are not part of this exchange' });
      return;
    }

    // Update review
    if (isUserA) {
      exchange.userAReview = { rating, review: review.trim(), skillTaught };
    } else {
      exchange.userBReview = { rating, review: review.trim(), skillTaught };
    }

    await exchange.save();

    // Update trust scores based on reviews
    await updateTrustScores(exchange);

    await exchange.populate('userA userB', 'name email isAnonymous anonymousName anonymousAvatar');
    
    // Serialize users in exchange
    const serializedExchange = {
      ...exchange.toObject(),
      userA: serializeUser(exchange.userA, false),
      userB: serializeUser(exchange.userB, false),
    };
    
    res.json({ exchange: serializedExchange });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Failed to submit review', message: error.message });
  }
});

/**
 * Helper function to update trust scores based on reviews
 */
async function updateTrustScores(exchange: any) {
  if (!exchange.userAReview || !exchange.userBReview) {
    return; // Wait for both reviews
  }

  const userA = await User.findById(exchange.userA);
  const userB = await User.findById(exchange.userB);

  if (!userA || !userB) return;

  // Calculate new trust scores based on ratings
  // Simple algorithm: average of all ratings, weighted by recency
  const ratingA = exchange.userAReview.rating / 5; // Normalize to 0-1
  const ratingB = exchange.userBReview.rating / 5;

  // Update trust scores (weighted average with existing score)
  const weight = 0.3; // 30% weight for new rating, 70% for existing
  userA.trustScore = userA.trustScore * (1 - weight) + ratingB * weight;
  userB.trustScore = userB.trustScore * (1 - weight) + ratingA * weight;

  // Clamp to 0-1
  userA.trustScore = Math.max(0, Math.min(1, userA.trustScore));
  userB.trustScore = Math.max(0, Math.min(1, userB.trustScore));

  await userA.save();
  await userB.save();
}

/**
 * GET /api/exchange
 * Get all exchanges for the current user
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = String((req as any).user.id);

    const exchanges = await Exchange.find({
      $or: [{ userA: userId }, { userB: userId }],
    })
      .populate('userA userB', 'name email isAnonymous anonymousName anonymousAvatar')
      .sort({ createdAt: -1 });

    // Serialize users in all exchanges
    const serializedExchanges = exchanges.map(exchange => ({
      ...exchange.toObject(),
      userA: serializeUser(exchange.userA, false),
      userB: serializeUser(exchange.userB, false),
    }));

    res.json({ exchanges: serializedExchanges });
  } catch (error: any) {
    console.error('Error fetching exchanges:', error);
    res.status(500).json({ error: 'Failed to fetch exchanges', message: error.message });
  }
});

/**
 * GET /api/exchange/:exchangeId
 * Get a specific exchange
 */
router.get('/:exchangeId', authenticate, async (req, res) => {
  try {
    const userId = String((req as any).user.id);
    const { exchangeId } = req.params;

    const exchange = await Exchange.findById(exchangeId).populate('userA userB', 'name email isAnonymous anonymousName anonymousAvatar');

    if (!exchange) {
      res.status(404).json({ error: 'Exchange not found' });
      return;
    }

    if (String(exchange.userA) !== userId && String(exchange.userB) !== userId) {
      res.status(403).json({ error: 'You are not part of this exchange' });
      return;
    }

    // Serialize users in exchange
    const serializedExchange = {
      ...exchange.toObject(),
      userA: serializeUser(exchange.userA, false),
      userB: serializeUser(exchange.userB, false),
    };

    res.json({ exchange: serializedExchange });
  } catch (error: any) {
    console.error('Error fetching exchange:', error);
    res.status(500).json({ error: 'Failed to fetch exchange', message: error.message });
  }
});

export default router;


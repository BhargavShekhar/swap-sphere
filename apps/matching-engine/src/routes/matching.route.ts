/**
 * Matching API routes
 */

import { Router, type Router as ExpressRouter } from 'express';
import { matchingEngine } from '../core/matching.engine.js';
import type { MatchingRequest, MatchingResponse, MatchingConfig } from '../types/matching.types.js';
import { DEFAULT_WEIGHTS, type UserProfile } from '../types/user.types.js';
import User from '../models/User.model.js';

const router: ExpressRouter = Router();

/**
 * POST /api/matching/find
 * Find matches for a user
 */
router.post('/find', async (req, res) => {
  try {
    const { userId, config }: MatchingRequest = req.body;

    if (!userId) {
      res.status(400).json({ 
        error: 'userId is required',
        message: 'Please provide a userId in the request body'
      });
      return;
    }

    // Get user from MongoDB
    const dbUser = await User.findById(userId).select('-password');
    if (!dbUser) {
      res.status(404).json({ 
        error: 'User not found',
        message: `User with id ${userId} does not exist`
      });
      return;
    }

    // Convert MongoDB user to UserProfile format
    const user: UserProfile = convertUserToProfile(dbUser);

    // Get all candidates from MongoDB
    const dbCandidates = await User.find({ _id: { $ne: userId } })
      .select('-password');
    
    const candidates: UserProfile[] = dbCandidates.map(convertUserToProfile);

    if (candidates.length === 0) {
      res.json({
        matches: [],
        totalCandidates: 0,
        processingTime: 0,
        message: 'No candidates available for matching'
      } as MatchingResponse);
      return;
    }

    // Build matching config
    const matchingConfig: MatchingConfig = {
      weights: config?.weights ?? DEFAULT_WEIGHTS,
      minMatchScore: config?.minMatchScore ?? 0.3,
      maxResults: config?.maxResults ?? 50,
      enableBidirectionalMatching: config?.enableBidirectionalMatching ?? true,
    };

    // Find matches
    const startTime = Date.now();
    const matches = await matchingEngine.findMatches(user, candidates, matchingConfig);
    const processingTime = Date.now() - startTime;

    const response: MatchingResponse = {
      matches,
      totalCandidates: candidates.length,
      processingTime,
    };

    res.json(response);
  } catch (error) {
    console.error('Error finding matches:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to find matches. Please try again later.'
    });
  }
});

/**
 * POST /api/matching/score
 * Calculate match score between two specific users
 */
router.post('/score', async (req, res) => {
  try {
    const { userIdA, userIdB, weights } = req.body;

    if (!userIdA || !userIdB) {
      res.status(400).json({ 
        error: 'Both userIdA and userIdB are required'
      });
      return;
    }

    // Get users from MongoDB
    const dbUserA = await User.findById(userIdA).select('-password');
    const dbUserB = await User.findById(userIdB).select('-password');

    if (!dbUserA) {
      res.status(404).json({ error: `User ${userIdA} not found` });
      return;
    }

    if (!dbUserB) {
      res.status(404).json({ error: `User ${userIdB} not found` });
      return;
    }

    const userA = convertUserToProfile(dbUserA);
    const userB = convertUserToProfile(dbUserB);

    const matchWeights = weights ?? DEFAULT_WEIGHTS;
    const matchScore = await matchingEngine.calculateMatchScore(
      userA,
      userB,
      matchWeights
    );

    res.json({
      userA: { id: userA.id, username: userA.username },
      userB: { id: userB.id, username: userB.username },
      matchScore,
    });
  } catch (error) {
    console.error('Error calculating match score:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to calculate match score'
    });
  }
});

/**
 * GET /api/matching/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'matching-engine',
    timestamp: new Date().toISOString()
  });
});

/**
 * Convert MongoDB User document to UserProfile format
 */
function convertUserToProfile(dbUser: any): UserProfile {
  // Convert single offer/want to arrays for matching engine
  const offers = dbUser.offer_skill ? [{
    id: 'offer-1',
    name: dbUser.offer_skill,
    level: (dbUser.skill_level ? getSkillLevel(dbUser.skill_level) : 'intermediate') as 'beginner' | 'intermediate' | 'advanced' | 'expert',
  }] : [];

  const wants = dbUser.want_skill ? [{
    id: 'want-1',
    name: dbUser.want_skill,
    level: 'beginner' as const, // Default for want
  }] : [];

  // Extract location if available
  const location = dbUser.location ? {
    city: dbUser.location.city,
    country: dbUser.location.country,
    latitude: dbUser.location.latitude,
    longitude: dbUser.location.longitude,
    timezone: dbUser.location.timezone,
  } : undefined;

  const profile: UserProfile = {
    id: String(dbUser._id),
    username: dbUser.name,
    email: dbUser.email,
    languages: dbUser.languages || ['en'], // Use user's languages or default to English
    offers,
    wants,
    trustScore: dbUser.trustScore || 0.5,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
  };

  // Add location only if it exists
  if (location) {
    profile.location = location;
  }

  return profile;
}

/**
 * Convert numeric skill level (1-10) to skill level category
 */
function getSkillLevel(level: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  if (level <= 3) return 'beginner';
  if (level <= 6) return 'intermediate';
  if (level <= 8) return 'advanced';
  return 'expert';
}

export default router;


/**
 * Matching API routes
 */

import { Router, type Router as ExpressRouter } from 'express';
import { matchingEngine } from '../core/matching.engine.js';
import type { MatchingRequest, MatchingResponse, MatchingConfig } from '../types/matching.types.js';
import { DEFAULT_WEIGHTS, type UserProfile, type MatchResult } from '../types/user.types.js';
import User from '../models/User.model.js';
import { serializeUser } from '../utils/user.serializer.js';

const router: ExpressRouter = Router();

/**
 * POST /api/matching/find
 * Find matches for a user - BULLETPROOF VERSION
 */
router.post('/find', async (req, res) => {
  const startTime = Date.now();
  let totalUsers = 0;
  let candidateCount = 0;
  
  try {
    console.log('\n========== [MATCHING] NEW REQUEST ==========');
    console.log('[MATCHING] Request body:', JSON.stringify(req.body, null, 2));
    
    const { userId, config } = req.body || {};
    
    if (!userId) {
      console.log('[MATCHING] ❌ No userId provided');
      return res.status(200).json({ matches: [], totalCandidates: 0, processingTime: Date.now() - startTime });
    }

    console.log('[MATCHING] ✅ userId:', userId);

    // STEP 1: Check database connection FIRST
    const mongoose = await import('mongoose');
    const connectionState = mongoose.default.connection.readyState;
    console.log('[MATCHING] MongoDB connection state:', connectionState === 1 ? '✅ Connected' : '❌ Not Connected');
    
    if (connectionState !== 1) {
      console.error('[MATCHING] ❌ Database not connected!');
      return res.status(200).json({ matches: [], totalCandidates: 0, processingTime: Date.now() - startTime });
    }

    const db = mongoose.default.connection.db;
    if (!db) {
      console.error('[MATCHING] ❌ Database object not available');
      return res.status(200).json({ matches: [], totalCandidates: 0, processingTime: Date.now() - startTime });
    }

    console.log('[MATCHING] ✅ Database name:', db.databaseName);

    // STEP 2: Get ALL users FIRST (before anything else)
    console.log('[MATCHING] Fetching ALL users from database...');
    const allUsers = await db.collection('users').find({}).toArray();
    totalUsers = allUsers.length;
    console.log('[MATCHING] ✅ Found', totalUsers, 'total users in database');

    if (totalUsers === 0) {
      console.log('[MATCHING] ⚠️ No users in database!');
      return res.status(200).json({ matches: [], totalCandidates: 0, processingTime: Date.now() - startTime });
    }

    // STEP 3: Filter out current user
    const dbCandidates = allUsers.filter((u: any) => {
      const candidateId = String(u._id);
      const currentId = String(userId);
      return candidateId !== currentId;
    });
    candidateCount = dbCandidates.length;
    console.log('[MATCHING] ✅ After filtering current user:', candidateCount, 'candidates');

    if (candidateCount === 0) {
      console.log('[MATCHING] ⚠️ No candidates (only 1 user in database)');
      return res.status(200).json({ matches: [], totalCandidates: 0, processingTime: Date.now() - startTime });
    }

    // STEP 4: Get current user
    console.log('[MATCHING] Fetching current user...');
    // Note: password is already excluded by default (select: false in schema)
    // isAnonymous, anonymousName, anonymousAvatar don't have select: false, so they're included by default
    const dbUser = await User.findById(userId).lean();
    if (!dbUser) {
      console.log('[MATCHING] ❌ User not found');
      return res.status(200).json({ matches: [], totalCandidates: candidateCount, processingTime: Date.now() - startTime });
    }
    console.log('[MATCHING] ✅ User found:', (dbUser as any).name || (dbUser as any).username || 'Unknown');

    // STEP 5: Convert user
    console.log('[MATCHING] Converting user profile...');
    console.log('[MATCHING] Raw user data from DB:', {
      _id: String(dbUser._id),
      name: dbUser.name,
      email: dbUser.email,
      offer_skill: dbUser.offer_skill,
      want_skill: dbUser.want_skill,
      skill_level: dbUser.skill_level,
      offer_skill_type: typeof dbUser.offer_skill,
      want_skill_type: typeof dbUser.want_skill,
    });
    const user = convertUserToProfile(dbUser);
    if (!user) {
      console.log('[MATCHING] ❌ User conversion failed');
      return res.status(200).json({ matches: [], totalCandidates: candidateCount, processingTime: Date.now() - startTime });
    }
    console.log('[MATCHING] ✅ User converted:', user.username);
    console.log('[MATCHING] ✅ User offers:', user.offers?.map(o => o.name) || []);
    console.log('[MATCHING] ✅ User wants:', user.wants?.map(w => w.name) || []);
    console.log('[MATCHING] ✅ User offers count:', user.offers?.length || 0);
    console.log('[MATCHING] ✅ User wants count:', user.wants?.length || 0);

    // STEP 6: Convert candidates
    console.log('[MATCHING] Converting', candidateCount, 'candidates...');
    const candidates: UserProfile[] = [];
    let converted = 0;
    let failed = 0;
    
    for (let i = 0; i < dbCandidates.length; i++) {
      const dbCandidate = dbCandidates[i];
      if (!dbCandidate) {
        continue;
      }
      
      try {
        // Log raw candidate data for first 5 candidates
        if (i < 5) {
          console.log(`[MATCHING] Candidate ${i + 1} raw data:`, {
            _id: String(dbCandidate._id),
            name: dbCandidate.name,
            offer_skill: dbCandidate.offer_skill,
            want_skill: dbCandidate.want_skill,
            skill_level: dbCandidate.skill_level,
          });
        }
        
        const candidate = convertUserToProfile(dbCandidate);
        if (candidate) {
          // Log converted candidate for first 5
          if (i < 5) {
            console.log(`[MATCHING] Candidate ${i + 1} converted:`, {
              id: candidate.id,
              username: candidate.username,
              offers: candidate.offers?.map(o => o.name) || [],
              wants: candidate.wants?.map(w => w.name) || [],
            });
          }
          candidates.push(candidate);
          converted++;
        } else {
          failed++;
          if (i < 5) {
            console.warn(`[MATCHING] Candidate ${i + 1} conversion returned null`);
          }
        }
      } catch (e: any) {
        failed++;
        console.error(`[MATCHING] Conversion error for candidate ${i + 1}:`, e?.message);
      }
    }

    console.log('[MATCHING] ✅ Converted:', converted, '| Failed:', failed);
    console.log('[MATCHING] ✅ Final candidates array:', candidates.length);

    // STEP 7: Find matches (only if we have candidates)
    let matches: any[] = [];
    if (candidates.length > 0) {
      console.log('[MATCHING] Finding matches...');
      const matchingConfig: MatchingConfig = {
        weights: config?.weights || DEFAULT_WEIGHTS,
        minMatchScore: 0,
        maxResults: config?.maxResults || 50,
        enableBidirectionalMatching: config?.enableBidirectionalMatching !== false,
      };

      try {
        const rawMatches = await matchingEngine.findMatches(user, candidates, matchingConfig);
        console.log('[MATCHING] ✅ Engine returned', rawMatches.length, 'matches');

        // Serialize matches - ensure offers and wants arrays are always present
        matches = rawMatches.map((match, index) => {
          // Ensure offers and wants arrays exist and are not empty
          const userA = {
            ...match.userA,
            offers: match.userA?.offers || [],
            wants: match.userA?.wants || [],
            createdAt: match.userA?.createdAt instanceof Date ? match.userA.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: match.userA?.updatedAt instanceof Date ? match.userA.updatedAt.toISOString() : new Date().toISOString(),
          };
          
          const userB = {
            ...match.userB,
            offers: match.userB?.offers || [],
            wants: match.userB?.wants || [],
            createdAt: match.userB?.createdAt instanceof Date ? match.userB.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: match.userB?.updatedAt instanceof Date ? match.userB.updatedAt.toISOString() : new Date().toISOString(),
          };
          
          // Log match details for debugging (first 3 matches only)
          if (index < 3) {
            console.log(`[MATCHING] Serialized match ${index + 1}:`, {
              userA: {
                id: userA.id,
                username: userA.username,
                offers: userA.offers.map(o => o.name),
                wants: userA.wants.map(w => w.name),
              },
              userB: {
                id: userB.id,
                username: userB.username,
                offers: userB.offers.map(o => o.name),
                wants: userB.wants.map(w => w.name),
              },
              score: match.matchScore?.totalScore,
            });
          }
          
          return {
            userA,
            userB,
            matchScore: match.matchScore || {},
            matchedAt: match.matchedAt instanceof Date ? match.matchedAt.toISOString() : new Date().toISOString(),
          };
        });
      } catch (e: any) {
        console.error('[MATCHING] ❌ Match engine error:', e?.message);
      }
    }

    const processingTime = Date.now() - startTime;
    const finalCandidateCount = candidates.length > 0 ? candidates.length : candidateCount;
    
    console.log('[MATCHING] ========== FINAL RESPONSE ==========');
    console.log('[MATCHING] Matches:', matches.length);
    console.log('[MATCHING] Total candidates:', finalCandidateCount);
    console.log('[MATCHING] Processing time:', processingTime, 'ms');
    console.log('[MATCHING] ======================================\n');

    return res.status(200).json({
      matches,
      totalCandidates: finalCandidateCount,
      processingTime,
    });

  } catch (error: any) {
    console.error('\n[MATCHING] ❌❌❌ CRITICAL ERROR ❌❌❌');
    console.error('[MATCHING] Error message:', error?.message);
    console.error('[MATCHING] Error stack:', error?.stack?.substring(0, 500));
    console.error('[MATCHING] ======================================\n');
    
    // Return with whatever count we managed to get
    return res.status(200).json({
      matches: [],
      totalCandidates: candidateCount || totalUsers || 0,
      processingTime: Date.now() - startTime,
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

    // Note: password is already excluded by default (select: false in schema)
    // isAnonymous, anonymousName, anonymousAvatar are included by default
    const dbUserA = await User.findById(userIdA);
    const dbUserB = await User.findById(userIdB);

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
    
    if (!userA || !userB) {
      res.status(400).json({ error: 'Failed to convert user profiles' });
      return;
    }

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
 * GET /api/matching/test-db
 * Test database connection and query
 */
router.get('/test-db', async (req, res) => {
  try {
    const mongoose = await import('mongoose');
    const connectionState = mongoose.default.connection.readyState;
    const dbName = mongoose.default.connection.db?.databaseName;
    
    // Test Mongoose query
    const mongooseCount = await User.find({}).countDocuments();
    const mongooseUsers = await User.find({}).limit(3).select('name email offer_skill want_skill').lean();
    
    // Test native driver
    let nativeCount = 0;
    let nativeUsers: any[] = [];
    if (mongoose.default.connection.db) {
      nativeCount = await mongoose.default.connection.db.collection('users').countDocuments({});
      nativeUsers = await mongoose.default.connection.db.collection('users').find({}).limit(3).toArray();
    }
    
    res.json({
      connection: {
        state: connectionState === 1 ? 'Connected' : 'Not Connected',
        database: dbName,
      },
      mongoose: {
        count: mongooseCount,
        sample: mongooseUsers.map(u => ({
          _id: String(u._id),
          name: u.name,
          email: u.email,
          offer_skill: u.offer_skill,
          want_skill: u.want_skill,
        })),
      },
      native: {
        count: nativeCount,
        sample: nativeUsers.map(u => ({
          _id: String(u._id),
          name: u.name || 'NO NAME',
          email: u.email || 'NO EMAIL',
          offer_skill: u.offer_skill || 'NO OFFER',
          want_skill: u.want_skill || 'NO WANT',
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Database test failed',
      message: error?.message,
      stack: error?.stack,
    });
  }
});

/**
 * POST /api/matching/simple-test
 * SIMPLE TEST - Just return candidates directly, no complex logic
 */
router.post('/simple-test', async (req, res) => {
  try {
    const { userId } = req.body;
    console.log('[SIMPLE TEST] User ID:', userId);
    
    const mongoose = await import('mongoose');
    const db = mongoose.default.connection.db;
    
    if (!db) {
      return res.json({ error: 'No database', candidates: [] });
    }
    
    // Get ALL users
    const allUsers = await db.collection('users').find({}).toArray();
    console.log('[SIMPLE TEST] Found', allUsers.length, 'users');
    
    // Filter out current user
    const candidates = allUsers.filter((u: any) => String(u._id) !== String(userId));
    console.log('[SIMPLE TEST] After filter:', candidates.length, 'candidates');
    
    // Convert to simple format
    const simpleCandidates = candidates.map((u: any) => ({
      _id: String(u._id),
      name: u.name || 'NO NAME',
      email: u.email || 'NO EMAIL',
      offer_skill: u.offer_skill || 'NO OFFER',
      want_skill: u.want_skill || 'NO WANT',
      skill_level: u.skill_level || 'NO LEVEL',
    }));
    
    res.json({
      success: true,
      totalUsers: allUsers.length,
      candidates: simpleCandidates,
      candidatesCount: candidates.length,
    });
  } catch (error: any) {
    console.error('[SIMPLE TEST] Error:', error);
    res.status(500).json({
      error: 'Test failed',
      message: error?.message,
    });
  }
});

/**
 * GET /api/matching/debug/user/:userId
 * Debug endpoint to see raw user data from MongoDB
 */
router.get('/debug/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[DEBUG] Fetching user:', userId);
    
    const mongoose = await import('mongoose');
    const db = mongoose.default.connection.db;
    
    if (!db) {
      return res.json({ error: 'No database' });
    }
    
    // Get user with native driver (raw data)
    const rawUser = await db.collection('users').findOne({ _id: new mongoose.default.Types.ObjectId(userId) });
    
    if (!rawUser) {
      return res.json({ error: 'User not found' });
    }
    
    // Also get with Mongoose
    const mongooseUser = await User.findById(userId).lean();
    
    // Convert to profile
    const convertedProfile = convertUserToProfile(rawUser);
    
    res.json({
      raw: {
        _id: String(rawUser._id),
        name: rawUser.name,
        email: rawUser.email,
        offer_skill: rawUser.offer_skill,
        want_skill: rawUser.want_skill,
        skill_level: rawUser.skill_level,
        offer_skill_type: typeof rawUser.offer_skill,
        want_skill_type: typeof rawUser.want_skill,
      },
      mongoose: mongooseUser ? {
        _id: String(mongooseUser._id),
        name: mongooseUser.name,
        email: mongooseUser.email,
        offer_skill: mongooseUser.offer_skill,
        want_skill: mongooseUser.want_skill,
        skill_level: mongooseUser.skill_level,
        offer_skill_type: typeof mongooseUser.offer_skill,
        want_skill_type: typeof mongooseUser.want_skill,
      } : null,
      converted: convertedProfile ? {
        id: convertedProfile.id,
        username: convertedProfile.username,
        offers: convertedProfile.offers?.map(o => o.name) || [],
        wants: convertedProfile.wants?.map(w => w.name) || [],
        offersCount: convertedProfile.offers?.length || 0,
        wantsCount: convertedProfile.wants?.length || 0,
      } : null,
    });
  } catch (error: any) {
    console.error('[DEBUG] Error:', error);
    res.status(500).json({
      error: 'Debug failed',
      message: error?.message,
    });
  }
});

function convertUserToProfile(dbUser: any): UserProfile | null {
  try {
    // Basic validation
    if (!dbUser) {
      console.warn('[CONVERT] User is null/undefined');
      return null;
    }

    // Get ID - handle both _id and id
    const userId = dbUser._id ? String(dbUser._id) : (dbUser.id ? String(dbUser.id) : null);
    if (!userId) {
      console.warn('[CONVERT] User has no ID:', dbUser);
      return null;
    }

    // Get name - be very lenient
    const userName = dbUser.name || dbUser.username || dbUser.email?.split('@')[0] || `User_${userId.substring(0, 8)}`;
    
    // Always allow conversion even if name is empty (we'll use a fallback)
    const finalName = userName.trim() || `User_${userId.substring(0, 8)}`;

    // Serialize user (handles anonymous mode)
    let serialized;
    try {
      serialized = serializeUser(dbUser, false);
    } catch (e: any) {
      console.warn('[CONVERT] Serialization failed, using raw data:', e?.message);
      serialized = { name: finalName, email: dbUser.email || '' };
    }
    
    // Handle offers - be lenient but log everything
    const offers = [];
    console.log(`[CONVERT] User ${userId} - Raw offer_skill from DB:`, dbUser.offer_skill, 'Type:', typeof dbUser.offer_skill);
    if (dbUser.offer_skill) {
      const offerSkill = String(dbUser.offer_skill).trim();
      console.log(`[CONVERT] User ${userId} - Trimmed offer_skill:`, offerSkill);
      if (offerSkill && offerSkill !== 'undefined' && offerSkill !== 'null') {
        offers.push({
          id: 'offer-1',
          name: offerSkill,
          level: (dbUser.skill_level ? getSkillLevel(Number(dbUser.skill_level)) : 'intermediate') as 'beginner' | 'intermediate' | 'advanced' | 'expert',
        });
        console.log(`[CONVERT] User ${userId} - Added offer skill:`, offerSkill);
      } else {
        console.warn(`[CONVERT] User ${userId} - offer_skill is empty or invalid:`, offerSkill);
      }
    } else {
      console.warn(`[CONVERT] User ${userId} - No offer_skill field in database`);
    }

    // Handle wants - be lenient but log everything
    const wants = [];
    console.log(`[CONVERT] User ${userId} - Raw want_skill from DB:`, dbUser.want_skill, 'Type:', typeof dbUser.want_skill);
    if (dbUser.want_skill) {
      const wantSkill = String(dbUser.want_skill).trim();
      console.log(`[CONVERT] User ${userId} - Trimmed want_skill:`, wantSkill);
      if (wantSkill && wantSkill !== 'undefined' && wantSkill !== 'null') {
        wants.push({
          id: 'want-1',
          name: wantSkill,
          level: 'beginner' as const,
        });
        console.log(`[CONVERT] User ${userId} - Added want skill:`, wantSkill);
      } else {
        console.warn(`[CONVERT] User ${userId} - want_skill is empty or invalid:`, wantSkill);
      }
    } else {
      console.warn(`[CONVERT] User ${userId} - No want_skill field in database`);
    }
    
    console.log(`[CONVERT] User ${userId} - Final offers array:`, offers.map(o => o.name));
    console.log(`[CONVERT] User ${userId} - Final wants array:`, wants.map(w => w.name));

    // Handle location - optional
    const location = dbUser.location ? {
      city: dbUser.location.city || '',
      country: dbUser.location.country || '',
      latitude: typeof dbUser.location.latitude === 'number' ? dbUser.location.latitude : undefined,
      longitude: typeof dbUser.location.longitude === 'number' ? dbUser.location.longitude : undefined,
      timezone: dbUser.location.timezone || '',
    } : undefined;

    // Handle languages - default to English
    let languages = ['en'];
    if (Array.isArray(dbUser.languages) && dbUser.languages.length > 0) {
      languages = dbUser.languages.filter((lang: any) => lang && String(lang).trim()).map((l: any) => String(l).trim());
    }
    if (languages.length === 0) {
      languages = ['en']; // Fallback to English
    }

    // Handle dates - be flexible
    let createdAt: Date;
    let updatedAt: Date;
    
    try {
      if (dbUser.createdAt instanceof Date) {
        createdAt = dbUser.createdAt;
      } else if (dbUser.createdAt) {
        createdAt = new Date(dbUser.createdAt);
        if (isNaN(createdAt.getTime())) {
          createdAt = new Date();
        }
      } else {
        createdAt = new Date();
      }
    } catch (e) {
      createdAt = new Date();
    }

    try {
      if (dbUser.updatedAt instanceof Date) {
        updatedAt = dbUser.updatedAt;
      } else if (dbUser.updatedAt) {
        updatedAt = new Date(dbUser.updatedAt);
        if (isNaN(updatedAt.getTime())) {
          updatedAt = createdAt;
        }
      } else {
        updatedAt = createdAt;
      }
    } catch (e) {
      updatedAt = createdAt;
    }

    // Build profile - always create it, even without skills
    const profile: UserProfile = {
      id: userId,
      username: serialized.name || finalName,
      email: serialized.email || dbUser.email || '',
      languages,
      offers,
      wants,
      trustScore: typeof dbUser.trustScore === 'number' && !isNaN(dbUser.trustScore) 
        ? Math.max(0, Math.min(1, dbUser.trustScore)) 
        : 0.5,
      createdAt,
      updatedAt,
    };

    // Add location if available
    if (location && (location.city || location.country)) {
      profile.location = location;
    }

    return profile;
  } catch (error: any) {
    console.error('[CONVERT] convertUserToProfile error:', error?.message);
    console.error('[CONVERT] Error stack:', error?.stack?.substring(0, 200));
    console.error('[CONVERT] User data:', dbUser ? { _id: dbUser._id, name: dbUser.name } : 'null');
    return null;
  }
}

function getSkillLevel(level: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  if (level <= 3) return 'beginner';
  if (level <= 6) return 'intermediate';
  if (level <= 8) return 'advanced';
  return 'expert';
}

export default router;

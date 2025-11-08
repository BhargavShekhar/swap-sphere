/**
 * Profile Routes
 * Create/update Offer & Want profile (requires authentication)
 */

import { Router, type Router as ExpressRouter, type Response } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth.middleware.js';
import User from '../models/User.model.js';
import { serializeUser } from '../utils/user.serializer.js';

const router: ExpressRouter = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/profile
 * Create or update Offer & Want profile
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { offer_skill, want_skill, skill_level } = req.body;
    const userId = req.user!.id;

    console.log('Profile update request:', {
      userId,
      offer_skill,
      want_skill,
      skill_level,
    });

    // Validation
    if (!offer_skill || !want_skill) {
      res.status(400).json({ error: 'offer_skill and want_skill are required' });
      return;
    }

    if (skill_level !== undefined && (skill_level < 1 || skill_level > 10)) {
      res.status(400).json({ error: 'skill_level must be between 1 and 10' });
      return;
    }

    // Update user profile
    console.log('Attempting to update user in MongoDB...');
    // Don't use .select('-password') with findByIdAndUpdate when using inclusion projection elsewhere
    // Password is already excluded by schema (select: false), so just query normally
    const user = await User.findByIdAndUpdate(
      userId,
      {
        offer_skill: offer_skill.trim(),
        want_skill: want_skill.trim(),
        skill_level: skill_level || undefined,
      },
      { 
        new: true, 
        runValidators: true,
        upsert: false, // Don't create if doesn't exist
      }
    );
    
    // Force connection check
    const mongoose = await import('mongoose');
    if (mongoose.default.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not active');
    }

    if (!user) {
      console.log('❌ User not found for ID:', userId);
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('✅ Profile updated successfully:', {
      id: String(user._id),
      email: user.email,
      offer_skill: user.offer_skill,
      want_skill: user.want_skill,
      skill_level: user.skill_level,
    });

    // For own user, include email (includePII = true)
    res.json({
      user: serializeUser(user, true),
    });
  } catch (error: any) {
    console.error('❌ Profile update error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
    });
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map((err: any) => err.message);
      res.status(400).json({ error: validationErrors.join(', ') });
      return;
    }
    
    res.status(500).json({ 
      error: 'Failed to update profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/profile
 * Get current user's profile
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    // Password is already excluded by schema (select: false), so just query normally
    const user = await User.findById(req.user!.id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // For own user, include email (includePII = true)
    res.json({
      user: serializeUser(user, true),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;


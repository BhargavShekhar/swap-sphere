/**
 * Privacy Routes
 * Handles anonymous mode toggle and state
 */

import { Router, type Router as ExpressRouter, type Response } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth.middleware.js';
import User from '../models/User.model.js';
import { generatePseudonym } from '../utils/pseudonym.generator.js';

const router: ExpressRouter = Router();

// All routes require authentication
router.use(authenticate);

/**
 * PATCH /api/privacy/toggle
 * Toggle anonymous mode on/off
 */
router.patch('/toggle', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Toggle anonymous mode
    const newAnonymousState = !user.isAnonymous;

    // If enabling anonymous mode and no pseudonym exists, generate one
    if (newAnonymousState && !user.anonymousName) {
      user.anonymousName = generatePseudonym();
      // Set default anonymous avatar if not already set
      if (!user.anonymousAvatar) {
        user.anonymousAvatar = '/default-avatar.png';
      }
    }

    user.isAnonymous = newAnonymousState;
    await user.save();

    // Verify the save worked
    // Use lean() to get plain object, password is already excluded by schema (select: false)
    const savedUser = await User.findById(userId).select('_id isAnonymous anonymousName anonymousAvatar').lean();
    console.log(`[Privacy] User ${userId} anonymous mode ${newAnonymousState ? 'enabled' : 'disabled'}. Saved value: ${savedUser?.isAnonymous}`);

    res.json({
      success: true,
      isAnonymous: savedUser?.isAnonymous || false,
      anonymousName: savedUser?.anonymousName || null,
      anonymousAvatar: savedUser?.anonymousAvatar || '/default-avatar.png',
      message: `Anonymous mode ${newAnonymousState ? 'enabled' : 'disabled'}`,
    });
  } catch (error: any) {
    console.error('Error toggling anonymous mode:', error);
    res.status(500).json({ 
      error: 'Failed to toggle anonymous mode',
      message: error.message 
    });
  }
});

/**
 * GET /api/privacy/state
 * Get current privacy/anonymous state
 */
router.get('/state', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    // Use lean() to get plain object, explicitly include _id and privacy fields
    // Password is already excluded by schema (select: false)
    const user = await User.findById(userId).select('_id isAnonymous anonymousName anonymousAvatar').lean();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      isAnonymous: user.isAnonymous || false,
      anonymousName: user.anonymousName || null,
      anonymousAvatar: user.anonymousAvatar || '/default-avatar.png',
    });
  } catch (error: any) {
    console.error('Error getting privacy state:', error);
    res.status(500).json({ 
      error: 'Failed to get privacy state',
      message: error.message 
    });
  }
});

export default router;


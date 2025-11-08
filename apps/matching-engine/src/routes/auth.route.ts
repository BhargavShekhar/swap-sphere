/**
 * Authentication Routes
 * Sign up and login endpoints
 */

import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { JWT_SECRET } from '../middleware/auth.middleware.js';
import { serializeUser } from '../utils/user.serializer.js';

const router: ExpressRouter = Router();

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    console.log('Signup attempt:', { name: req.body?.name, email: req.body?.email, hasPassword: !!req.body?.password });
    
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      console.log('Signup validation failed: missing required fields');
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    // Create user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
    });

    console.log('Attempting to save user to MongoDB...');
    console.log('User data before save:', {
      name: user.name,
      email: user.email,
      hasPassword: !!user.password,
    });
    
    // Save user - mongoose will use connection write concern
    const savedUser = await user.save();
    console.log('User save() completed, ID:', String(savedUser._id));
    
    // Force a connection check
    const mongoose = await import('mongoose');
    if (mongoose.default.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not active');
    }
    
    // Verify the save by querying the database immediately
    const db = mongoose.default.connection.db;
    const collectionName = 'users';
    
    if (db) {
      const userCount = await db.collection(collectionName).countDocuments({ _id: savedUser._id as any });
      console.log('Verification: User count in collection:', userCount);
    }
    
    const verifiedUser = await User.findById(savedUser._id);
    if (!verifiedUser) {
      console.error('❌ CRITICAL: User was saved but could not be retrieved from database');
      throw new Error('User was saved but could not be retrieved from database');
    }
    
    console.log('✅ User saved and verified in MongoDB:', {
      id: String(savedUser._id),
      email: savedUser.email,
      name: savedUser.name,
      verified: !!verifiedUser,
      database: db?.databaseName,
      collection: collectionName,
    });

    // Generate JWT token
    const token = jwt.sign({ userId: String(savedUser._id) }, JWT_SECRET, {
      expiresIn: '7d',
    });

    // Return user data (without password) and token
    // For own user, include email (includePII = true)
    res.status(201).json({
      token,
      user: serializeUser(savedUser, true),
    });
  } catch (error: any) {
    console.error('❌ Signup error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
      stack: error.stack,
    });
    
    if (error.code === 11000 || error.message?.includes('duplicate')) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map((err: any) => err.message);
      res.status(400).json({ error: validationErrors.join(', ') });
      return;
    }
    
    res.status(500).json({ 
      error: 'Failed to create user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    console.log('Login attempt:', { email: req.body?.email, hasPassword: !!req.body?.password });
    
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      console.log('Login validation failed: missing email or password');
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      console.log('Login failed: user not found for email:', email.toLowerCase());
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log('Login failed: invalid password for user:', user.email);
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    console.log('Login successful for user:', user.email);

    // Generate JWT token
    const token = jwt.sign({ userId: String(user._id) }, JWT_SECRET, {
      expiresIn: '7d',
    });

    // Return user data (without password) and token
    // For own user, include email (includePII = true)
    res.json({
      token,
      user: serializeUser(user, true),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

/**
 * GET /api/auth/me
 * Get current user (requires authentication)
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('GET /me - Auth header:', authHeader ? 'Present' : 'Missing');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('GET /me - No valid token provided');
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    let decoded: { userId: string };
    
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch (error) {
      console.log('GET /me - Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Password is already excluded by schema (select: false), so just query normally
    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log('GET /me - User not found for ID:', decoded.userId);
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('GET /me - Success for user:', user.email);

    // For own user, include email (includePII = true)
    res.json({
      user: serializeUser(user, true),
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;


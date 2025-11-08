/**
 * Matching Engine Microservice
 * Perfect Match Engine - Intelligent skill-matching service
 */

import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/database.js';
import authRouter from './routes/auth.route.js';
import profileRouter from './routes/profile.route.js';
import matchingRouter from './routes/matching.route.js';
import exchangeRouter from './routes/exchange.route.js';
import messageRouter from './routes/message.route.js';
import { semanticService } from './services/semantic.service.js';

const port = process.env.MATCHING_ENGINE_PORT || 8081;

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle .well-known and other browser noise BEFORE other routes
app.use((req, res, next) => {
  // Handle .well-known paths (Chrome DevTools, etc.)
  if (req.path.startsWith('/.well-known/')) {
    res.status(204).end();
    return;
  }
  // Handle favicon
  if (req.path === '/favicon.ico' || req.path.includes('favicon')) {
    res.status(204).end();
    return;
  }
  // Handle robots.txt
  if (req.path === '/robots.txt') {
    res.status(204).end();
    return;
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'matching-engine',
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint
app.get('/api/test/db', async (req, res) => {
  try {
    const mongoose = await import('mongoose');
    const connectionState = mongoose.default.connection.readyState;
    const db = mongoose.default.connection.db;
    
    if (!db) {
      res.status(500).json({
        error: 'Database not available',
        connectionState: connectionState === 1 ? 'Connected' : 'Not Connected',
        readyState: connectionState,
      });
      return;
    }
    
    const dbName = db.databaseName;
    const collections = await db.listCollections().toArray();
    const userCount = await db.collection('users').countDocuments();
    
    // Get connection URI (masked for security)
    const uri = process.env.MONGODB_URI || '';
    const maskedUri = uri.replace(/:([^:@]+)@/, ':****@'); // Mask password
    
    res.json({
      connected: connectionState === 1,
      connectionState: connectionState === 1 ? 'Connected' : 'Not Connected',
      readyState: connectionState,
      database: dbName,
      collections: collections.map(c => c.name),
      userCount: userCount,
      connectionString: maskedUri,
      compassConnectionString: uri, // Full connection string for Compass (same as .env)
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Database test failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/matching', matchingRouter);
app.use('/api/exchange', exchangeRouter);
app.use('/api/message', messageRouter);

// 404 handler for undefined routes (must be last)
app.use((req, res) => {
  // This should never be reached for .well-known, favicon, etc. due to middleware above
  // But just in case, handle them silently
  if (req.path.startsWith('/.well-known/') || 
      req.path === '/favicon.ico' || 
      req.path.includes('favicon') || 
      req.path === '/robots.txt') {
    res.status(204).end();
    return;
  }
  
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: [
      'GET /health',
      'GET /api/test/db',
      'POST /api/auth/signup',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/profile',
      'GET /api/profile',
      'POST /api/matching/find',
      'POST /api/matching/score',
      'GET /api/matching/health',
      'POST /api/exchange/create',
      'POST /api/exchange/:exchangeId/accept',
      'POST /api/exchange/:exchangeId/start',
      'POST /api/exchange/:exchangeId/confirm',
      'POST /api/exchange/:exchangeId/review',
      'GET /api/exchange',
      'GET /api/exchange/:exchangeId',
      'POST /api/message',
      'GET /api/message/:exchangeId',
    ],
  });
});

// Initialize services on startup
async function initialize() {
  try {
    console.log('Initializing Matching Engine...');
    
    // Connect to MongoDB
    await connectDB();
    
    // Initialize semantic service
    await semanticService.initialize();
    
    console.log('Matching Engine initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Matching Engine:', error);
    process.exit(1);
  }
}

// Start server
async function start() {
  await initialize();
  
  app.listen(port, () => {
    console.log(`----- Matching Engine Running on port ${port} -----`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`API endpoints:`);
    console.log(`  POST /api/matching/find - Find matches for a user`);
    console.log(`  POST /api/matching/score - Calculate match score between two users`);
    console.log(`  POST /api/users - Create/update user profile`);
    console.log(`  GET /api/users/:id - Get user by ID`);
    console.log(`  GET /api/users - Get all users`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});


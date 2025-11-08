import express from "express";
import cors from "cors";
import "dotenv/config"
import mongoose from "mongoose";
import tokenRouter from "./routes/token.route.js";
import reviewRouter from "./routes/review.route.js";

const port = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('✅ Backend connected to MongoDB');
    })
    .catch((error: any) => {
      console.error('❌ MongoDB connection error:', error);
    });
} else {
  console.warn('⚠️ MONGO_URI not set - review features may not work');
}

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Register routes
app.use("/api/token", tokenRouter);
app.use("/api/review", reviewRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'backend',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: [
      'GET /health',
      'POST /api/token',
      'POST /api/review/confirm',
      'POST /api/review/submit',
      'GET /api/review/status/:id',
    ],
  });
});

app.listen(port, () => {
    console.log(`----- Backend Running on port ${port} -----`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`API endpoints:`);
    console.log(`  POST /api/token - Generate LiveKit token`);
    console.log(`  POST /api/review/confirm - Confirm collaboration completion`);
    console.log(`  POST /api/review/submit - Submit review`);
    console.log(`  GET /api/review/status/:id - Get review status`);
})
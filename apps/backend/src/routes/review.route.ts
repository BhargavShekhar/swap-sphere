/**
 * Review API routes
 * Handles review confirmations, submissions, and status checks
 */

import express, { type Router } from "express";
import { submitReview, confirmCompletion, getReviewStatus } from '../controllers/review.controller.js';

const router: Router = express.Router();

/**
 * POST /api/review/confirm
 * Confirm completion of collaboration session
 */
router.post("/confirm", confirmCompletion);

/**
 * POST /api/review/submit
 * Submit a review for a completed collaboration
 */
router.post("/submit", submitReview);

/**
 * GET /api/review/status/:id
 * Get review status for a session
 */
router.get("/status/:id", getReviewStatus);

export default router;



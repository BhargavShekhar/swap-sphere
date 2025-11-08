/**
 * Core matching engine
 * Implements the hybrid formula-based matching algorithm
 * 
 * Final Match Score = (w1 × SA→B) + (w2 × SB→A) + (w3 × Llocation) + (w4 × Llanguage) + (w5 × Ttrust)
 * 
 * Where:
 * - SA→B: Semantic similarity of A's offer → B's want
 * - SB→A: Semantic similarity of B's offer → A's want
 * - Llocation: Location similarity (geographic proximity)
 * - Llanguage: Language similarity (communication compatibility)
 * - Ttrust: Trust score (reliability)
 */

import type { UserProfile, MatchResult, MatchScore, MatchingWeights } from '../types/user.types.js';
import { DEFAULT_WEIGHTS } from '../types/user.types.js';
import type { MatchingConfig, LanguageSimilarityResult, LocationSimilarityResult, TrustScoreResult } from '../types/matching.types.js';
import { semanticService } from '../services/semantic.service.js';
import { languageService } from '../services/language.service.js';
import { locationService } from '../services/location.service.js';
import { trustService } from '../services/trust.service.js';

class MatchingEngine {
  /**
   * Find matches for a given user
   */
  async findMatches(
    user: UserProfile,
    candidates: UserProfile[],
    config: MatchingConfig = { weights: DEFAULT_WEIGHTS }
  ): Promise<MatchResult[]> {
    const startTime = Date.now();
    const weights = config.weights;
    const minScore = config.minMatchScore ?? 0.3;
    const maxResults = config.maxResults ?? 50;

    // Ensure semantic service is initialized
    await semanticService.initialize();

    const matches: MatchResult[] = [];

    for (const candidate of candidates) {
      // Skip self
      if (user.id === candidate.id) {
        continue;
      }

      // Calculate match score
      const matchScore = await this.calculateMatchScore(user, candidate, weights);

      // Only include matches above threshold
      if (matchScore.totalScore >= minScore) {
        matches.push({
          userA: user,
          userB: candidate,
          matchScore,
          matchedAt: new Date(),
        });
      }
    }

    // Sort by total score (descending)
    matches.sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore);

    // Limit results
    const limitedMatches = matches.slice(0, maxResults);

    const processingTime = Date.now() - startTime;
    console.log(`Found ${limitedMatches.length} matches in ${processingTime}ms`);

    return limitedMatches;
  }

  /**
   * Calculate match score between two users using the hybrid formula
   * Final Match Score = (w1 × SA→B) + (w2 × SB→A) + (w3 × Llocation) + (w4 × Llanguage) + (w5 × Ttrust)
   */
  async calculateMatchScore(
    userA: UserProfile,
    userB: UserProfile,
    weights: MatchingWeights = DEFAULT_WEIGHTS
  ): Promise<MatchScore> {
    // 1. SA→B: Semantic similarity A's offer → B's want
    const semanticScoreAtoB = await this.calculateSemanticScoreAtoB(
      userA,
      userB
    );

    // 2. SB→A: Semantic similarity B's offer → A's want
    const semanticScoreBtoA = await this.calculateSemanticScoreBtoA(
      userA,
      userB
    );

    // 3. Llocation: Location similarity
    const locationResult = locationService.calculateLocationSimilarity(
      userA,
      userB
    );

    // 4. Llanguage: Language similarity
    const languageResult = languageService.calculateLanguageSimilarity(
      userA,
      userB
    );

    // 5. Ttrust: Trust score
    const trustResult = trustService.calculateTrustScore(userA, userB);

    // Calculate weighted total score according to formula
    const totalScore =
      weights.w1 * semanticScoreAtoB +      // w1 × SA→B
      weights.w2 * semanticScoreBtoA +      // w2 × SB→A
      weights.w3 * locationResult.score +   // w3 × Llocation
      weights.w4 * languageResult.score +   // w4 × Llanguage
      weights.w5 * trustResult.score;       // w5 × Ttrust

    return {
      totalScore: Math.max(0, Math.min(1, totalScore)), // Clamp to 0-1
      semanticScoreAtoB,
      semanticScoreBtoA,
      locationScore: locationResult.score,
      languageScore: languageResult.score,
      trustScore: trustResult.score,
      breakdown: {
        w1: weights.w1,
        w2: weights.w2,
        w3: weights.w3,
        w4: weights.w4,
        w5: weights.w5,
      },
    };
  }

  /**
   * Calculate semantic similarity: A's offers → B's wants
   * Finds the best matching pair and returns the similarity score
   */
  private async calculateSemanticScoreAtoB(
    userA: UserProfile,
    userB: UserProfile
  ): Promise<number> {
    if (userA.offers.length === 0 || userB.wants.length === 0) {
      return 0;
    }

    // Find best matches for each of A's offers
    const scores: number[] = [];

    for (const offer of userA.offers) {
      const bestMatch = await semanticService.findBestMatch(
        offer,
        userB.wants
      );

      if (bestMatch) {
        // Weight by skill level (higher level = more valuable)
        const levelWeight = this.getLevelWeight(offer.level);
        scores.push(bestMatch.similarity * levelWeight);
      }
    }

    // Return average of best matches, or max if we want to prioritize strong matches
    if (scores.length === 0) {
      return 0;
    }

    // Use average for more balanced scoring
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Also consider the best match
    const max = Math.max(...scores);
    
    // Weighted combination: 70% average, 30% max
    return average * 0.7 + max * 0.3;
  }

  /**
   * Calculate semantic similarity: B's offers → A's wants
   * Finds the best matching pair and returns the similarity score
   */
  private async calculateSemanticScoreBtoA(
    userA: UserProfile,
    userB: UserProfile
  ): Promise<number> {
    // This is the reverse direction, so swap users
    return this.calculateSemanticScoreAtoB(userB, userA);
  }

  /**
   * Get weight multiplier based on skill level
   */
  private getLevelWeight(
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  ): number {
    const weights: Record<string, number> = {
      beginner: 0.5,
      intermediate: 0.75,
      advanced: 0.9,
      expert: 1.0,
    };

    return weights[level] ?? 0.5;
  }

  /**
   * Validate that a match is bidirectional (both directions work)
   */
  async validateBidirectionalMatch(
    userA: UserProfile,
    userB: UserProfile,
    minScore: number = 0.3
  ): Promise<boolean> {
    const scoreAtoB = await this.calculateSemanticScoreAtoB(userA, userB);
    const scoreBtoA = await this.calculateSemanticScoreBtoA(userA, userB);

    // Both directions should have reasonable scores
    return scoreAtoB >= minScore && scoreBtoA >= minScore;
  }
}

// Singleton instance
export const matchingEngine = new MatchingEngine();


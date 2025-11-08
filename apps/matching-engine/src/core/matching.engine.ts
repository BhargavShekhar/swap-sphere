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
    const minScore = config.minMatchScore ?? 0; // Default to 0 to show all matches
    const maxResults = config.maxResults ?? 50;

    console.log('[MATCHING ENGINE] Starting match calculation');
    console.log('[MATCHING ENGINE] User:', {
      id: user.id,
      username: user.username,
      offers: user.offers?.map(o => o.name) || [],
      wants: user.wants?.map(w => w.name) || [],
    });
    console.log('[MATCHING ENGINE] Candidates:', candidates.length);
    console.log('[MATCHING ENGINE] Min score threshold:', minScore);

    // Ensure semantic service is initialized (non-blocking)
    try {
      await semanticService.initialize();
    } catch (error: any) {
      console.warn('Semantic service initialization failed, using fallback:', error?.message);
      // Continue with fallback similarity matching
    }

    const matches: MatchResult[] = [];
    let processedCount = 0;
    let skippedNoSkills = 0;

    for (const candidate of candidates) {
      processedCount++;
      // Skip self
      if (user.id === candidate.id) {
        console.log(`[MATCHING ENGINE] Skipping self: ${candidate.id}`);
        continue;
      }

      // Check if candidate has skills
      const candidateHasOffers = candidate.offers && candidate.offers.length > 0;
      const candidateHasWants = candidate.wants && candidate.wants.length > 0;
      const userHasOffers = user.offers && user.offers.length > 0;
      const userHasWants = user.wants && user.wants.length > 0;
      
      // Log candidate info
      if (processedCount <= 10) {
        console.log(`[MATCHING ENGINE] Candidate ${processedCount}: ${candidate.username} (${candidate.id})`);
        console.log(`[MATCHING ENGINE]   - Candidate offers: [${candidate.offers?.map(o => o.name).join(', ') || 'NONE'}]`);
        console.log(`[MATCHING ENGINE]   - Candidate wants: [${candidate.wants?.map(w => w.name).join(', ') || 'NONE'}]`);
        console.log(`[MATCHING ENGINE]   - User offers: [${user.offers?.map(o => o.name).join(', ') || 'NONE'}]`);
        console.log(`[MATCHING ENGINE]   - User wants: [${user.wants?.map(w => w.name).join(', ') || 'NONE'}]`);
      }
      
      // Check for potential matches early (exact skill matching)
      if (userHasOffers && candidateHasWants) {
        const userOffers = user.offers.map(o => o.name.trim().toLowerCase());
        const candidateWants = candidate.wants.map(w => w.name.trim().toLowerCase());
        const exactMatchesAtoB = userOffers.filter(offer => candidateWants.includes(offer));
        if (exactMatchesAtoB.length > 0 && processedCount <= 10) {
          console.log(`[MATCHING ENGINE] ✅ Found exact offer→want matches: [${exactMatchesAtoB.join(', ')}]`);
        }
      }
      
      if (candidateHasOffers && userHasWants) {
        const candidateOffers = candidate.offers.map(o => o.name.trim().toLowerCase());
        const userWants = user.wants.map(w => w.name.trim().toLowerCase());
        const exactMatchesBtoA = candidateOffers.filter(offer => userWants.includes(offer));
        if (exactMatchesBtoA.length > 0 && processedCount <= 10) {
          console.log(`[MATCHING ENGINE] ✅ Found exact want→offer matches: [${exactMatchesBtoA.join(', ')}]`);
        }
      }
      
      // Log if no skills, but still process (might match on location/language/trust)
      if (!candidateHasOffers && !candidateHasWants) {
        skippedNoSkills++;
        if (processedCount <= 5) {
          console.log(`[MATCHING ENGINE] Candidate ${candidate.id} (${candidate.username}) has no skills, but will still process for location/language/trust matching`);
        }
        // DON'T skip - continue to process (might still match on other factors)
      }

      try {
        // Calculate match score
        const matchScore = await this.calculateMatchScore(user, candidate, weights);

        // Log score for debugging (first 10 candidates or all matches)
        if (matchScore && typeof matchScore.totalScore === 'number') {
          if (processedCount <= 10 || matchScore.totalScore >= minScore) {
            console.log(`[MATCHING ENGINE] Candidate ${candidate.id} (${candidate.username}): score=${matchScore.totalScore.toFixed(3)}, min=${minScore}, match=${matchScore.totalScore >= minScore}`);
            console.log(`[MATCHING ENGINE]   - Candidate offers: ${candidate.offers?.map(o => o.name).join(', ') || 'NONE'}`);
            console.log(`[MATCHING ENGINE]   - Candidate wants: ${candidate.wants?.map(w => w.name).join(', ') || 'NONE'}`);
            console.log(`[MATCHING ENGINE]   - Score breakdown:`, {
              semanticAtoB: matchScore.semanticScoreAtoB?.toFixed(3),
              semanticBtoA: matchScore.semanticScoreBtoA?.toFixed(3),
              location: matchScore.locationScore?.toFixed(3),
              language: matchScore.languageScore?.toFixed(3),
              trust: matchScore.trustScore?.toFixed(3),
            });
          }
        }

        // Only include matches above threshold
        if (matchScore && typeof matchScore.totalScore === 'number' && matchScore.totalScore >= minScore) {
          matches.push({
            userA: user,
            userB: candidate,
            matchScore,
            matchedAt: new Date(),
          });
        }
      } catch (err: any) {
        console.error(`[MATCHING ENGINE] Error calculating match score for candidate ${candidate.id}:`, err?.message || err);
        console.error('[MATCHING ENGINE] Error stack:', err?.stack?.substring(0, 200));
        // Skip this candidate and continue
        continue;
      }
    }
    
    console.log(`[MATCHING ENGINE] Processed ${processedCount} candidates, skipped ${skippedNoSkills} with no skills`);

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
    try {
      // 1. SA→B: Semantic similarity A's offer → B's want
      let semanticScoreAtoB = 0;
      try {
        semanticScoreAtoB = await this.calculateSemanticScoreAtoB(userA, userB);
      } catch (err: any) {
        console.warn('Error calculating semanticScoreAtoB:', err?.message);
        semanticScoreAtoB = 0;
      }

      // 2. SB→A: Semantic similarity B's offer → A's want
      let semanticScoreBtoA = 0;
      try {
        semanticScoreBtoA = await this.calculateSemanticScoreBtoA(userA, userB);
      } catch (err: any) {
        console.warn('Error calculating semanticScoreBtoA:', err?.message);
        semanticScoreBtoA = 0;
      }

      // 3. Llocation: Location similarity
      let locationScore = 0.5; // Default neutral score
      try {
        const locationResult = locationService.calculateLocationSimilarity(userA, userB);
        locationScore = locationResult?.score ?? 0.5;
      } catch (err: any) {
        console.warn('Error calculating location similarity:', err?.message);
      }

      // 4. Llanguage: Language similarity
      let languageScore = 0.5; // Default neutral score
      try {
        const languageResult = languageService.calculateLanguageSimilarity(userA, userB);
        languageScore = languageResult?.score ?? 0.5;
      } catch (err: any) {
        console.warn('Error calculating language similarity:', err?.message);
      }

      // 5. Ttrust: Trust score
      let trustScore = 0.5; // Default neutral score
      try {
        const trustResult = trustService.calculateTrustScore(userA, userB);
        trustScore = trustResult?.score ?? 0.5;
      } catch (err: any) {
        console.warn('Error calculating trust score:', err?.message);
      }

      // Calculate weighted total score according to formula
      // BUT: Boost scores for ANY semantic match (even one direction)
      const hasPerfectSemanticMatch = (semanticScoreAtoB >= 0.95 && semanticScoreBtoA >= 0.95);
      const hasStrongSemanticMatch = (semanticScoreAtoB >= 0.8 && semanticScoreBtoA >= 0.8);
      const hasAnyPerfectMatch = (semanticScoreAtoB >= 0.95 || semanticScoreBtoA >= 0.95);
      const hasAnyStrongMatch = (semanticScoreAtoB >= 0.8 || semanticScoreBtoA >= 0.8);
      const hasAnyMatch = (semanticScoreAtoB > 0 || semanticScoreBtoA > 0);
      
      let totalScore =
        (weights.w1 || 0) * semanticScoreAtoB +      // w1 × SA→B
        (weights.w2 || 0) * semanticScoreBtoA +      // w2 × SB→A
        (weights.w3 || 0) * locationScore +           // w3 × Llocation
        (weights.w4 || 0) * languageScore +           // w4 × Llanguage
        (weights.w5 || 0) * trustScore;               // w5 × Ttrust
      
      // Boost score for perfect or strong semantic matches (both directions)
      if (hasPerfectSemanticMatch) {
        // Perfect bidirectional match: ensure score is at least 0.8
        totalScore = Math.max(totalScore, 0.8);
        console.log(`[MATCH SCORE] Perfect bidirectional semantic match - boosting score to ${totalScore.toFixed(3)}`);
      } else if (hasStrongSemanticMatch) {
        // Strong bidirectional match: ensure score is at least 0.7
        totalScore = Math.max(totalScore, 0.7);
        console.log(`[MATCH SCORE] Strong bidirectional semantic match - boosting score to ${totalScore.toFixed(3)}`);
      } else if (hasAnyPerfectMatch) {
        // Perfect one-direction match: ensure score is at least 0.6
        totalScore = Math.max(totalScore, 0.6);
        console.log(`[MATCH SCORE] Perfect one-direction semantic match - boosting score to ${totalScore.toFixed(3)}`);
      } else if (hasAnyStrongMatch) {
        // Strong one-direction match: ensure score is at least 0.5
        totalScore = Math.max(totalScore, 0.5);
        console.log(`[MATCH SCORE] Strong one-direction semantic match - boosting score to ${totalScore.toFixed(3)}`);
      } else if (hasAnyMatch) {
        // Any match: ensure score is at least 0.3 (so it shows up)
        totalScore = Math.max(totalScore, 0.3);
        console.log(`[MATCH SCORE] Any semantic match detected - boosting score to ${totalScore.toFixed(3)}`);
      }

      const clampedScore = Math.max(0, Math.min(1, totalScore));
      
      console.log(`[MATCH SCORE] Final total: ${clampedScore.toFixed(3)} = (${(weights.w1 || 0).toFixed(2)}×${semanticScoreAtoB.toFixed(3)}) + (${(weights.w2 || 0).toFixed(2)}×${semanticScoreBtoA.toFixed(3)}) + (${(weights.w3 || 0).toFixed(2)}×${locationScore.toFixed(3)}) + (${(weights.w4 || 0).toFixed(2)}×${languageScore.toFixed(3)}) + (${(weights.w5 || 0).toFixed(2)}×${trustScore.toFixed(3)})`);

      return {
        totalScore: clampedScore,
        semanticScoreAtoB: Math.max(0, Math.min(1, semanticScoreAtoB)),
        semanticScoreBtoA: Math.max(0, Math.min(1, semanticScoreBtoA)),
        locationScore: Math.max(0, Math.min(1, locationScore)),
        languageScore: Math.max(0, Math.min(1, languageScore)),
        trustScore: Math.max(0, Math.min(1, trustScore)),
        breakdown: {
          w1: weights.w1 || 0,
          w2: weights.w2 || 0,
          w3: weights.w3 || 0,
          w4: weights.w4 || 0,
          w5: weights.w5 || 0,
        },
      };
    } catch (error: any) {
      console.error('Critical error in calculateMatchScore:', error);
      // Return a minimal valid MatchScore
      return {
        totalScore: 0,
        semanticScoreAtoB: 0,
        semanticScoreBtoA: 0,
        locationScore: 0.5,
        languageScore: 0.5,
        trustScore: 0.5,
        breakdown: {
          w1: weights.w1 || 0,
          w2: weights.w2 || 0,
          w3: weights.w3 || 0,
          w4: weights.w4 || 0,
          w5: weights.w5 || 0,
        },
      };
    }
  }

  /**
   * Calculate semantic similarity: A's offers → B's wants
   * Finds the best matching pair and returns the similarity score
   * IMPROVED: Prioritizes exact matches and logs detailed information
   */
  private async calculateSemanticScoreAtoB(
    userA: UserProfile,
    userB: UserProfile
  ): Promise<number> {
    if (userA.offers.length === 0 || userB.wants.length === 0) {
      console.log(`[SEMANTIC A→B] No match: UserA has ${userA.offers.length} offers, UserB has ${userB.wants.length} wants`);
      return 0;
    }

    console.log(`[SEMANTIC A→B] Checking: UserA offers [${userA.offers.map(o => o.name).join(', ')}] → UserB wants [${userB.wants.map(w => w.name).join(', ')}]`);

    // Find best matches for each of A's offers
    const scores: number[] = [];
    const matchDetails: Array<{ offer: string; want: string; score: number }> = [];

    for (const offer of userA.offers) {
      const bestMatch = await semanticService.findBestMatch(
        offer,
        userB.wants
      );

      if (bestMatch) {
        // Weight by skill level (higher level = more valuable)
        const levelWeight = this.getLevelWeight(offer.level);
        const weightedScore = bestMatch.similarity * levelWeight;
        scores.push(weightedScore);
        matchDetails.push({
          offer: offer.name,
          want: bestMatch.skill.name,
          score: bestMatch.similarity,
        });
        
        console.log(`[SEMANTIC A→B] Match: "${offer.name}" → "${bestMatch.skill.name}" = ${bestMatch.similarity.toFixed(3)} (weighted: ${weightedScore.toFixed(3)}, level: ${offer.level})`);
      } else {
        console.log(`[SEMANTIC A→B] No match found for offer: "${offer.name}"`);
      }
    }

    // Return average of best matches, or max if we want to prioritize strong matches
    if (scores.length === 0) {
      console.log(`[SEMANTIC A→B] No scores calculated - returning 0`);
      return 0;
    }

    // Use average for more balanced scoring
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Also consider the best match
    const max = Math.max(...scores);
    
    // Weighted combination: 70% average, 30% max
    // But if we have an exact match (score = 1.0), prioritize it more
    const hasExactMatch = scores.some(s => s >= 0.99);
    const finalScore = hasExactMatch 
      ? max * 0.8 + average * 0.2  // Prioritize exact matches
      : average * 0.7 + max * 0.3;  // Balanced approach
    
    console.log(`[SEMANTIC A→B] Final score: ${finalScore.toFixed(3)} (avg: ${average.toFixed(3)}, max: ${max.toFixed(3)}, exact: ${hasExactMatch})`);
    
    return finalScore;
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


/**
 * Matching algorithm types and interfaces
 */

import type { UserProfile, MatchResult, MatchingWeights } from './user.types.js';

export interface MatchingConfig {
  weights: MatchingWeights;
  minMatchScore?: number; // Minimum score to consider a match (0-1)
  maxResults?: number; // Maximum number of matches to return
  enableBidirectionalMatching?: boolean; // Ensure both directions match
}

export interface SemanticSimilarityResult {
  score: number; // 0-1
  explanation?: string;
}

export interface LanguageSimilarityResult {
  score: number; // 0-1
  commonLanguages: string[];
  totalLanguages: number;
}

export interface LocationSimilarityResult {
  score: number; // 0-1
  distance: number | null; // Distance in kilometers
  sameCity: boolean;
  sameCountry: boolean;
}

export interface TrustScoreResult {
  score: number; // 0-1
  factors: {
    userATrust: number;
    userBTrust: number;
    averageTrust: number;
  };
}

export interface MatchingRequest {
  userId: string;
  config?: Partial<MatchingConfig>;
}

export interface MatchingResponse {
  matches: MatchResult[];
  totalCandidates: number;
  processingTime: number; // milliseconds
}


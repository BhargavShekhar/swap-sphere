/**
 * Matching Engine API Service
 * Handles all API communication with the matching-engine microservice
 */

import axios from 'axios';

const MATCHING_ENGINE_URL = import.meta.env.VITE_MATCHING_ENGINE_URL || 'http://localhost:8081';

const api = axios.create({
  baseURL: MATCHING_ENGINE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Skill {
  id: string;
  name: string;
  description?: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category?: string;
}

export interface Location {
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  languages: string[];
  location?: Location;
  offers: Skill[];
  wants: Skill[];
  trustScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface MatchScore {
  totalScore: number;
  semanticScoreAtoB: number; // SA→B
  semanticScoreBtoA: number; // SB→A
  locationScore: number; // Llocation
  languageScore: number; // Llanguage
  trustScore: number; // Ttrust
  breakdown: {
    w1: number; // weight for SA→B
    w2: number; // weight for SB→A
    w3: number; // weight for Llocation
    w4: number; // weight for Llanguage
    w5: number; // weight for Ttrust
  };
}

export interface MatchResult {
  userA: UserProfile;
  userB: UserProfile;
  matchScore: MatchScore;
  matchedAt: string;
}

export interface MatchingWeights {
  w1: number; // SA→B: Semantic similarity A's offer → B's want
  w2: number; // SB→A: Semantic similarity B's offer → A's want
  w3: number; // Llocation: Location similarity
  w4: number; // Llanguage: Language similarity
  w5: number; // Ttrust: Trust score
}

export interface MatchingConfig {
  weights?: MatchingWeights;
  minMatchScore?: number;
  maxResults?: number;
  enableBidirectionalMatching?: boolean;
}

export interface MatchingRequest {
  userId: string;
  config?: MatchingConfig;
}

export interface MatchingResponse {
  matches: MatchResult[];
  totalCandidates: number;
  processingTime: number;
}

/**
 * Matching API
 */
export const matchingApi = {
  /**
   * Find matches for a user
   */
  async findMatches(
    userId: string,
    config?: MatchingConfig
  ): Promise<MatchingResponse> {
    const response = await api.post<MatchingResponse>('/api/matching/find', {
      userId,
      config,
    });
    return response.data;
  },

  /**
   * Calculate match score between two users
   */
  async calculateScore(
    userIdA: string,
    userIdB: string,
    weights?: MatchingWeights
  ): Promise<{
    userA: { id: string; username: string };
    userB: { id: string; username: string };
    matchScore: MatchScore;
  }> {
    const response = await api.post('/api/matching/score', {
      userIdA,
      userIdB,
      weights,
    });
    return response.data;
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; service: string }> {
    const response = await api.get('/api/matching/health');
    return response.data;
  },
};


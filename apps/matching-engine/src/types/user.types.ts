/**
 * User profile types for the matching engine
 */

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
  languages: string[]; // e.g., ['en', 'es', 'fr']
  location?: Location; // User's location
  offers: Skill[]; // Skills the user can teach
  wants: Skill[]; // Skills the user wants to learn
  trustScore: number; // 0-1 scale
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchScore {
  totalScore: number;
  semanticScoreAtoB: number; // SA→B: A's offer → B's want
  semanticScoreBtoA: number; // SB→A: B's offer → A's want
  locationScore: number; // Llocation: Geographic proximity
  languageScore: number; // Llanguage: Language compatibility
  trustScore: number; // Ttrust: Trust score
  breakdown: {
    w1: number; // weight for semanticScoreAtoB (SA→B)
    w2: number; // weight for semanticScoreBtoA (SB→A)
    w3: number; // weight for locationScore (Llocation)
    w4: number; // weight for languageScore (Llanguage)
    w5: number; // weight for trustScore (Ttrust)
  };
}

export interface MatchResult {
  userA: UserProfile;
  userB: UserProfile;
  matchScore: MatchScore;
  matchedAt: Date;
}

export interface MatchingWeights {
  w1: number; // SA→B: Semantic similarity A's offer → B's want
  w2: number; // SB→A: Semantic similarity B's offer → A's want
  w3: number; // Llocation: Location similarity
  w4: number; // Llanguage: Language similarity
  w5: number; // Ttrust: Trust score
}

export const DEFAULT_WEIGHTS: MatchingWeights = {
  w1: 0.30, // Semantic A→B (primary match direction)
  w2: 0.30, // Semantic B→A (reverse match direction)
  w3: 0.15, // Location proximity
  w4: 0.15, // Language compatibility
  w5: 0.10, // Trust/reliability
};


/**
 * Semantic similarity service using embeddings
 * Uses @xenova/transformers for local embeddings (no API needed)
 */

import { pipeline } from '@xenova/transformers';
import type { SemanticSimilarityResult } from '../types/matching.types.js';
import type { Skill } from '../types/user.types.js';

class SemanticService {
  private embeddingPipeline: any = null;
  private modelName = 'Xenova/all-MiniLM-L6-v2'; // Lightweight, fast embedding model
  private initialized = false;

  /**
   * Initialize the embedding pipeline
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.embeddingPipeline) {
      return;
    }

    try {
      console.log('Initializing semantic embedding model...');
      this.embeddingPipeline = await pipeline(
        'feature-extraction',
        this.modelName
      );
      this.initialized = true;
      console.log('Semantic embedding model initialized');
    } catch (error) {
      console.error('Failed to initialize semantic service:', error);
      throw new Error('Semantic service initialization failed');
    }
  }

  /**
   * Generate embedding vector for a text
   */
  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.embeddingPipeline) {
      try {
        await this.initialize();
      } catch (initError) {
        // If initialization fails, throw to trigger fallback
        throw new Error('Embedding pipeline not available');
      }
    }

    if (!this.embeddingPipeline) {
      throw new Error('Embedding pipeline not available');
    }

    try {
      const output = await this.embeddingPipeline(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert tensor to array
      return Array.from(output.data);
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i]! * vecB[i]!;
      normA += vecA[i]! * vecA[i]!;
      normB += vecB[i]! * vecB[i]!;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * Calculate semantic similarity between two skills
   * PRIORITIZES EXACT MATCHES for performance and accuracy
   */
  async calculateSkillSimilarity(
    skillA: Skill,
    skillB: Skill
  ): Promise<SemanticSimilarityResult> {
    // FIRST: Check for exact match (case-insensitive, trimmed)
    // This is MUCH faster and more accurate for identical skills
    const nameA = skillA.name.trim().toLowerCase();
    const nameB = skillB.name.trim().toLowerCase();
    
    if (nameA === nameB) {
      console.log(`[SEMANTIC] Exact match found: "${skillA.name}" === "${skillB.name}"`);
      return {
        score: 1.0,
        explanation: `Exact match between "${skillA.name}" and "${skillB.name}"`,
      };
    }
    
    // SECOND: Check if one contains the other (partial match)
    if (nameA.includes(nameB) || nameB.includes(nameA)) {
      const score = Math.min(nameA.length, nameB.length) / Math.max(nameA.length, nameB.length);
      if (score > 0.8) { // Very close match
        console.log(`[SEMANTIC] Near-exact match found: "${skillA.name}" ≈ "${skillB.name}" (${score.toFixed(2)})`);
        return {
          score: Math.min(0.95, score),
          explanation: `Near-exact match between "${skillA.name}" and "${skillB.name}"`,
        };
      }
    }
    
    // THIRD: Try semantic similarity using embeddings
    try {
      // Create text representations of skills
      const textA = this.skillToText(skillA);
      const textB = this.skillToText(skillB);

      // Get embeddings
      const embeddingA = await this.getEmbedding(textA);
      const embeddingB = await this.getEmbedding(textB);

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(embeddingA, embeddingB);

      // Cosine similarity is already in -1 to 1 range, but typically 0-1 for embeddings
      // Normalize to ensure 0-1 range
      const normalizedScore = Math.max(0, Math.min(1, similarity));
      
      console.log(`[SEMANTIC] Semantic similarity: "${skillA.name}" vs "${skillB.name}" = ${normalizedScore.toFixed(3)}`);

      return {
        score: normalizedScore,
        explanation: `Semantic similarity between "${skillA.name}" and "${skillB.name}"`,
      };
    } catch (error) {
      console.error('Error calculating skill similarity with embeddings, using fallback:', error);
      // Fallback to simple name matching
      return this.fallbackSimilarity(skillA, skillB);
    }
  }

  /**
   * Calculate best semantic match between a skill and a list of skills
   */
  async findBestMatch(
    targetSkill: Skill,
    candidateSkills: Skill[]
  ): Promise<{ skill: Skill; similarity: number } | null> {
    if (candidateSkills.length === 0) {
      return null;
    }

    let bestMatch: { skill: Skill; similarity: number } | null = null;
    let bestScore = -1;

    for (const candidate of candidateSkills) {
      const result = await this.calculateSkillSimilarity(targetSkill, candidate);
      if (result.score > bestScore) {
        bestScore = result.score;
        bestMatch = { skill: candidate, similarity: result.score };
      }
    }

    return bestMatch;
  }

  /**
   * Convert skill to text representation for embedding
   */
  private skillToText(skill: Skill): string {
    const parts: string[] = [skill.name];
    
    if (skill.description) {
      parts.push(skill.description);
    }
    
    if (skill.category) {
      parts.push(skill.category);
    }
    
    parts.push(skill.level);

    return parts.join(' ').toLowerCase();
  }

  /**
   * Fallback similarity calculation using simple text matching
   * IMPROVED: Better handling of exact and near-exact matches
   */
  private fallbackSimilarity(
    skillA: Skill,
    skillB: Skill
  ): SemanticSimilarityResult {
    const nameA = skillA.name.trim().toLowerCase();
    const nameB = skillB.name.trim().toLowerCase();

    // Exact match (shouldn't happen here since we check above, but safety check)
    if (nameA === nameB) {
      console.log(`[SEMANTIC FALLBACK] Exact match: "${skillA.name}" === "${skillB.name}"`);
      return { score: 1.0, explanation: `Exact match: ${skillA.name}` };
    }

    // Check if one contains the other (case-insensitive)
    if (nameA.includes(nameB) || nameB.includes(nameA)) {
      // Calculate how much of the shorter string is contained in the longer
      const shorter = nameA.length < nameB.length ? nameA : nameB;
      const longer = nameA.length >= nameB.length ? nameA : nameB;
      const containmentScore = shorter.length / longer.length;
      
      // If >80% contained, consider it a strong match
      if (containmentScore > 0.8) {
        console.log(`[SEMANTIC FALLBACK] Strong containment match: "${skillA.name}" contains "${skillB.name}" (${containmentScore.toFixed(2)})`);
        return { score: 0.9, explanation: `Strong containment: ${skillA.name} ≈ ${skillB.name}` };
      }
      // Otherwise, moderate match
      console.log(`[SEMANTIC FALLBACK] Moderate containment match: "${skillA.name}" contains "${skillB.name}" (${containmentScore.toFixed(2)})`);
      return { score: 0.7, explanation: `Moderate containment: ${skillA.name} ≈ ${skillB.name}` };
    }

    // Check for common words (split by spaces, hyphens, slashes)
    const wordsA = nameA.split(/[\s\-_\/]+/).filter(w => w.length > 0);
    const wordsB = nameB.split(/[\s\-_\/]+/).filter(w => w.length > 0);
    const commonWords = wordsA.filter((word) => wordsB.includes(word));

    if (commonWords.length > 0) {
      // Calculate Jaccard similarity (intersection over union)
      const union = new Set([...wordsA, ...wordsB]);
      const intersection = commonWords.length;
      const similarity = intersection / union.size;
      
      if (similarity > 0.5) {
        console.log(`[SEMANTIC FALLBACK] Good word overlap: "${skillA.name}" vs "${skillB.name}" (${similarity.toFixed(2)})`);
        return { score: similarity * 0.8, explanation: `Word overlap: ${commonWords.join(', ')}` };
      }
      
      console.log(`[SEMANTIC FALLBACK] Weak word overlap: "${skillA.name}" vs "${skillB.name}" (${similarity.toFixed(2)})`);
      return { score: similarity * 0.5, explanation: `Weak word overlap: ${commonWords.join(', ')}` };
    }

    console.log(`[SEMANTIC FALLBACK] No match: "${skillA.name}" vs "${skillB.name}"`);
    return { score: 0.0, explanation: `No similarity found` };
  }
}

// Singleton instance
export const semanticService = new SemanticService();


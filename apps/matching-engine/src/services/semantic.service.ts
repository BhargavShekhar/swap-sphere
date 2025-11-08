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
      await this.initialize();
    }

    if (!this.embeddingPipeline) {
      throw new Error('Embedding pipeline not available');
    }

    const output = await this.embeddingPipeline(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert tensor to array
    return Array.from(output.data);
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
   */
  async calculateSkillSimilarity(
    skillA: Skill,
    skillB: Skill
  ): Promise<SemanticSimilarityResult> {
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

      return {
        score: normalizedScore,
        explanation: `Semantic similarity between "${skillA.name}" and "${skillB.name}"`,
      };
    } catch (error) {
      console.error('Error calculating skill similarity:', error);
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
   */
  private fallbackSimilarity(
    skillA: Skill,
    skillB: Skill
  ): SemanticSimilarityResult {
    const nameA = skillA.name.toLowerCase();
    const nameB = skillB.name.toLowerCase();

    // Exact match
    if (nameA === nameB) {
      return { score: 1.0 };
    }

    // Check if one contains the other
    if (nameA.includes(nameB) || nameB.includes(nameA)) {
      return { score: 0.7 };
    }

    // Check for common words
    const wordsA = nameA.split(/\s+/);
    const wordsB = nameB.split(/\s+/);
    const commonWords = wordsA.filter((word) => wordsB.includes(word));

    if (commonWords.length > 0) {
      const similarity = commonWords.length / Math.max(wordsA.length, wordsB.length);
      return { score: similarity * 0.5 }; // Lower weight for fallback
    }

    return { score: 0.0 };
  }
}

// Singleton instance
export const semanticService = new SemanticService();


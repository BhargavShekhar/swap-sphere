/**
 * Location similarity service
 * Calculates geographic proximity between two users
 */

import type { LocationSimilarityResult } from '../types/matching.types.js';
import type { UserProfile } from '../types/user.types.js';

class LocationService {
  /**
   * Calculate location similarity between two users
   * Returns a score from 0-1 based on geographic proximity
   */
  calculateLocationSimilarity(
    userA: UserProfile,
    userB: UserProfile
  ): LocationSimilarityResult {
    // If no location data, return neutral score
    if (!userA.location || !userB.location) {
      return {
        score: 0.5, // Neutral score when location unknown
        distance: null,
        sameCity: false,
        sameCountry: false,
      };
    }

    const locA = userA.location;
    const locB = userB.location;

    // Check if same city
    const sameCity = 
      locA.city?.toLowerCase().trim() === locB.city?.toLowerCase().trim() &&
      locA.country?.toLowerCase().trim() === locB.country?.toLowerCase().trim();

    // Check if same country
    const sameCountry = 
      locA.country?.toLowerCase().trim() === locB.country?.toLowerCase().trim() &&
      !sameCity;

    // Calculate distance if coordinates available
    let distance: number | null = null;
    if (locA.latitude && locA.longitude && locB.latitude && locB.longitude) {
      distance = this.calculateDistance(
        locA.latitude,
        locA.longitude,
        locB.latitude,
        locB.longitude
      );
    }

    // Calculate similarity score
    let score = 0;

    if (sameCity) {
      score = 1.0; // Perfect match - same city
    } else if (sameCountry) {
      score = 0.7; // Good match - same country
    } else if (distance !== null) {
      // Score based on distance (in kilometers)
      if (distance < 100) {
        score = 0.9; // Very close
      } else if (distance < 500) {
        score = 0.7; // Close
      } else if (distance < 2000) {
        score = 0.5; // Moderate
      } else if (distance < 5000) {
        score = 0.3; // Far
      } else {
        score = 0.1; // Very far
      }
    } else {
      // Different countries, no coordinates
      score = 0.2;
    }

    return {
      score: Math.max(0, Math.min(1, score)), // Clamp to 0-1
      distance,
      sameCity,
      sameCountry,
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}

// Singleton instance
export const locationService = new LocationService();


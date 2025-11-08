/**
 * MatchResults Component
 * Displays a list of match results with filtering and sorting
 */

import { useState } from 'react';
import { MatchCard } from './MatchCard';
import type { MatchResult } from '../../services/matching.api';

interface MatchResultsProps {
  matches: MatchResult[];
  currentUserId: string;
  totalCandidates?: number;
  processingTime?: number;
  onStartCollaboration?: (match: MatchResult) => void;
  onLeaveReview?: (match: MatchResult) => void;
}

export function MatchResults({
  matches,
  currentUserId,
  totalCandidates,
  processingTime,
  onStartCollaboration,
  onLeaveReview,
}: MatchResultsProps) {
  const [sortBy, setSortBy] = useState<'score' | 'time'>('score');
  const [filterMin, setFilterMin] = useState(0);

  const sortedMatches = [...matches].sort((a, b) => {
    if (sortBy === 'score') {
      return b.matchScore.totalScore - a.matchScore.totalScore;
    } else {
      return new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime();
    }
  });

  const filteredMatches = sortedMatches.filter(
    (match) => match.matchScore.totalScore >= filterMin / 100
  );

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Found {filteredMatches.length} {filteredMatches.length === 1 ? 'Match' : 'Matches'}
          </h2>
          {processingTime !== undefined && (
            <span className="text-sm text-gray-600">
              Processed in {processingTime}ms
            </span>
          )}
        </div>

        {totalCandidates !== undefined && (
          <p className="text-sm text-gray-600 mb-4">
            Searched through {totalCandidates} candidates
          </p>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'score' | 'time')}
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="score">Match Score</option>
              <option value="time">Match Time</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Min Score:</label>
            <input
              type="range"
              min="0"
              max="100"
              value={filterMin}
              onChange={(e) => setFilterMin(parseInt(e.target.value))}
              className="w-32"
            />
            <span className="text-sm text-gray-600 w-12">{filterMin}%</span>
          </div>
        </div>
      </div>

      {/* Match Cards */}
      {filteredMatches.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-600 text-lg">
            No matches found {filterMin > 0 ? `above ${filterMin}%` : ''}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Try adjusting the minimum score filter or create more user profiles
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((match, index) => (
            <MatchCard
              key={`${match.userA.id}-${match.userB.id}-${index}`}
              match={match}
              currentUserId={currentUserId}
              onStartCollaboration={onStartCollaboration}
              onLeaveReview={onLeaveReview}
            />
          ))}
        </div>
      )}
    </div>
  );
}


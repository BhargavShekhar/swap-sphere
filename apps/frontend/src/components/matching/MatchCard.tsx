/**
 * MatchCard Component
 * Displays a single match result with detailed score breakdown
 */

import type { MatchResult } from '../../services/matching.api';

interface MatchCardProps {
  match: MatchResult;
  currentUserId: string;
  onViewDetails?: (match: MatchResult) => void;
  onStartCollaboration?: (match: MatchResult) => void;
}

export function MatchCard({ match, currentUserId, onViewDetails, onStartCollaboration }: MatchCardProps) {
  const matchedUser = match.userA.id === currentUserId ? match.userB : match.userA;
  const score = match.matchScore.totalScore;

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-blue-500';
    if (score >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent Match';
    if (score >= 0.6) return 'Good Match';
    if (score >= 0.4) return 'Fair Match';
    return 'Weak Match';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900">{matchedUser.username}</h3>
          <p className="text-sm text-gray-600">{matchedUser.email}</p>
        </div>
        <div className="text-right">
          <div className={`inline-block px-4 py-2 rounded-full text-white font-bold ${getScoreColor(score)}`}>
            {(score * 100).toFixed(0)}%
          </div>
          <p className="text-xs text-gray-600 mt-1">{getScoreLabel(score)}</p>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Semantic Match (A→B):</span>
          <span className="font-medium">
            {(match.matchScore.semanticScoreAtoB * 100).toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Semantic Match (B→A):</span>
          <span className="font-medium">
            {(match.matchScore.semanticScoreBtoA * 100).toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Language Compatibility:</span>
          <span className="font-medium">
            {(match.matchScore.languageScore * 100).toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Trust Score:</span>
          <span className="font-medium">
            {(match.matchScore.trustScore * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Skills Match - MVP: One Offer, One Want */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-green-50 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-green-800 mb-2">They Offer:</h4>
          {matchedUser.offers.length > 0 ? (
            <div>
              <p className="font-bold text-gray-900">{matchedUser.offers[0]!.name}</p>
              <p className="text-xs text-gray-600 mt-1">
                {matchedUser.offers[0]!.level} level
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No skill offered</p>
          )}
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-purple-800 mb-2">They Want:</h4>
          {matchedUser.wants.length > 0 ? (
            <div>
              <p className="font-bold text-gray-900">{matchedUser.wants[0]!.name}</p>
              <p className="text-xs text-gray-600 mt-1">
                {matchedUser.wants[0]!.level} level
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No skill wanted</p>
          )}
        </div>
      </div>

      {/* Languages */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Languages:</h4>
        <div className="flex flex-wrap gap-1">
          {matchedUser.languages.map((lang) => (
            <span
              key={lang}
              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
            >
              {lang.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {onViewDetails && (
          <button
            onClick={() => onViewDetails(match)}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            View Details
          </button>
        )}
        <button
          onClick={() => {
            if (onStartCollaboration) {
              onStartCollaboration(match);
            }
          }}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-semibold"
        >
          Start Collaboration
        </button>
      </div>
    </div>
  );
}


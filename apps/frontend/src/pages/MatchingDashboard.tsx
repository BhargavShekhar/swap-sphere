/**
 * MatchingDashboard Page
 * MVP-focused matching dashboard with Offer & Want profile
 */

import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { OfferWantProfile } from '../components/matching/OfferWantProfile';
import { MatchResults } from '../components/matching/MatchResults';
import { useAuth } from '../contexts/AuthContext';
import { matchingApi, type MatchResult } from '../services/matching.api';

export function MatchingDashboard() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [processingTime, setProcessingTime] = useState<number | undefined>();
  const [totalCandidates, setTotalCandidates] = useState<number | undefined>();
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);

  // Check if user needs to complete profile
  useEffect(() => {
    if (user && !user.offer_skill && !user.want_skill) {
      setShowProfileForm(true);
    }
  }, [user]);

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleFindMatches = async () => {
    if (!user || !user.offer_skill || !user.want_skill) {
      setError('Please complete your profile first');
      setShowProfileForm(true);
      return;
    }

    setLoading(true);
    setError(null);
    setMatches([]);

    try {
      // Note: We'll need to adapt the matching API to work with the new user structure
      // For now, this is a placeholder
      const response = await matchingApi.findMatches(user.id, {
        minMatchScore: 0.3,
        maxResults: 50,
      });

      setMatches(response.matches);
      setProcessingTime(response.processingTime);
      setTotalCandidates(response.totalCandidates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find matches');
      console.error('Error finding matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (_match: MatchResult) => {
    // This will need to be adapted to the new user structure
    alert('Match details feature coming soon');
  };

  const handleStartCollaboration = (match: MatchResult) => {
    if (!user) return;
    
    // Show collaboration options modal
    setSelectedMatch(match);
    setShowCollaborationModal(true);
  };

  const handleVideoCall = () => {
    // Open video call in new tab
    window.open('https://meet.bhargavshekhar.shop/', '_blank');
    setShowCollaborationModal(false);
  };

  const handleWhiteboard = () => {
    if (selectedMatch && user) {
      const matchedUser = selectedMatch.userA.id === user.id ? selectedMatch.userB : selectedMatch.userA;
      // Navigate to whiteboard with match info
      navigate(`/white-board?userA=${user.id}&userB=${matchedUser.id}`);
      setShowCollaborationModal(false);
    }
  };

  const handleLiveChat = async () => {
    if (!selectedMatch || !user) return;

    const matchedUser = selectedMatch.userA.id === user.id ? selectedMatch.userB : selectedMatch.userA;
    
    // Extract skills from the match
    const userOfferSkill = user.offer_skill || 'Unknown';
    const userWantSkill = user.want_skill || 'Unknown';
    
    // Navigate to chat with match info
    // The chat component will create/get the exchange
    navigate(`/chat?matchedUserId=${matchedUser.id}&skillA=${encodeURIComponent(userOfferSkill)}&skillB=${encodeURIComponent(userWantSkill)}`);
    setShowCollaborationModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-5xl font-bold text-gray-900">Swap Sphere</h1>
            <button
              onClick={logout}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
            >
              Logout
            </button>
          </div>
          <p className="text-xl text-gray-700 mb-2">
            Peer-to-Peer Skill Exchange Platform
          </p>
          <p className="text-gray-600">
            Share what you master. Learn what you need. No fees. No complexity.
          </p>
        </div>

        {/* Profile Form */}
        {showProfileForm && (
          <div className="mb-8">
            <OfferWantProfile />
          </div>
        )}

        {/* Collaboration Options Modal */}
        {showCollaborationModal && selectedMatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Choose Collaboration Option
              </h2>
              
              <div className="space-y-4">
                {/* Video Call Option */}
                <button
                  onClick={handleVideoCall}
                  className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-3 font-semibold"
                >
                  <span className="text-2xl">📹</span>
                  <span>Video Call</span>
                </button>

                {/* Whiteboard Option */}
                <button
                  onClick={handleWhiteboard}
                  className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-3 font-semibold"
                >
                  <span className="text-2xl">🖊️</span>
                  <span>Live Whiteboard</span>
                </button>

                {/* Live Chat Option */}
                <button
                  onClick={handleLiveChat}
                  className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-3 font-semibold"
                >
                  <span className="text-2xl">💬</span>
                  <span>Live Chat</span>
                </button>
              </div>

              <button
                onClick={() => setShowCollaborationModal(false)}
                className="mt-6 w-full px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!showProfileForm && user && (
          <>
            {/* User Profile Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                  <p className="text-gray-600">{user.email}</p>
                </div>
                <button
                  onClick={() => setShowProfileForm(true)}
                  className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 font-medium"
                >
                  Edit Profile
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* What I Offer */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-800 mb-2 uppercase tracking-wide">
                    What I Offer
                  </h3>
                  {user.offer_skill ? (
                    <div>
                      <p className="text-lg font-bold text-gray-900">{user.offer_skill}</p>
                      {user.skill_level && (
                        <p className="text-sm text-gray-600 mt-1">
                          Skill Level: {user.skill_level}/10
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">No skill offered</p>
                  )}
                </div>

                {/* What I Want */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-purple-800 mb-2 uppercase tracking-wide">
                    What I Want
                  </h3>
                  {user.want_skill ? (
                    <div>
                      <p className="text-lg font-bold text-gray-900">{user.want_skill}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500">No skill wanted</p>
                  )}
                </div>
              </div>
            </div>

            {/* Find Matches Section */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Find Your Perfect Match
                  </h3>
                  <p className="text-gray-600">
                    Our intelligent algorithm will find users who want what you offer and offer what you want.
                  </p>
                </div>
                <button
                  onClick={handleFindMatches}
                  disabled={loading || !user.offer_skill || !user.want_skill}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold text-lg shadow-md"
                >
                  {loading ? 'Finding Matches...' : 'Find Matches'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* Match Results */}
            {matches.length > 0 && (
              <MatchResults
                matches={matches}
                currentUserId={user.id}
                totalCandidates={totalCandidates}
                processingTime={processingTime}
                onViewDetails={handleViewDetails}
                onStartCollaboration={handleStartCollaboration}
              />
            )}

            {/* Empty State */}
            {matches.length === 0 && !loading && (
              <div className="bg-white p-12 rounded-xl shadow-lg text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-xl text-gray-700 mb-2">Ready to find your perfect match?</p>
                <p className="text-gray-600 mb-6">
                  Click "Find Matches" to discover users who want what you offer and offer what you want.
                </p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="bg-white p-12 rounded-xl shadow-lg text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
                <p className="text-xl text-gray-700">Finding your perfect match...</p>
                <p className="text-sm text-gray-500 mt-2">
                  Our algorithm is analyzing compatibility
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

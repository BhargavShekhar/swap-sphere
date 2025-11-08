/**
 * MatchingDashboard Page
 * MVP-focused matching dashboard with Offer & Want profile
 * Enhanced with Framer Motion animations and improved UI/UX
 */

import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { OfferWantProfile } from '../components/matching/OfferWantProfile';
import { MatchResults } from '../components/matching/MatchResults';
import { ReviewModal } from '../components/ReviewModal';
import { useAuth } from '../contexts/AuthContext';
import { matchingApi, type MatchResult } from '../services/matching.api';
import { DisplayName } from '../components/DisplayName';
import { UserAvatar } from '../components/UserAvatar';

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
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewMatch, setReviewMatch] = useState<MatchResult | null>(null);

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="inline-block rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </motion.div>
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
      console.log('[FRONTEND] ========== FIND MATCHES REQUEST ==========');
      console.log('[FRONTEND] User ID:', user.id);
      console.log('[FRONTEND] User skills:', {
        offer: user.offer_skill,
        want: user.want_skill,
        level: user.skill_level,
      });
      console.log('[FRONTEND] API URL:', import.meta.env.VITE_MATCHING_ENGINE_URL || 'http://localhost:8081');
      
      const requestPayload = {
        userId: user.id,
        config: {
          maxResults: 50,
        },
      };
      console.log('[FRONTEND] Request payload:', JSON.stringify(requestPayload, null, 2));
      
      const response = await matchingApi.findMatches(user.id, {
        // Don't send minMatchScore - let backend use default 0 to show all matches
        maxResults: 50,
      });

      console.log('[FRONTEND] ========== MATCHING RESPONSE ==========');
      console.log('[FRONTEND] Full response:', JSON.stringify(response, null, 2));
      console.log('[FRONTEND] Response summary:', {
        matchesCount: response.matches?.length || 0,
        totalCandidates: response.totalCandidates,
        processingTime: response.processingTime,
        firstMatch: response.matches?.[0] ? {
          userAId: response.matches[0].userA?.id,
          userBId: response.matches[0].userB?.id,
          userAOffers: response.matches[0].userA?.offers?.map(o => o.name) || [],
          userAWants: response.matches[0].userA?.wants?.map(w => w.name) || [],
          userBOffers: response.matches[0].userB?.offers?.map(o => o.name) || [],
          userBWants: response.matches[0].userB?.wants?.map(w => w.name) || [],
          score: response.matches[0].matchScore?.totalScore,
          semanticAtoB: response.matches[0].matchScore?.semanticScoreAtoB,
          semanticBtoA: response.matches[0].matchScore?.semanticScoreBtoA,
        } : null,
      });
      
      // Log all matches with their skills
      if (response.matches && response.matches.length > 0) {
        console.log('[FRONTEND] All matches details:');
        response.matches.forEach((match, index) => {
          console.log(`[FRONTEND] Match ${index + 1}:`, {
            userA: {
              id: match.userA?.id,
              offers: match.userA?.offers?.map(o => o.name) || [],
              wants: match.userA?.wants?.map(w => w.name) || [],
            },
            userB: {
              id: match.userB?.id,
              offers: match.userB?.offers?.map(o => o.name) || [],
              wants: match.userB?.wants?.map(w => w.name) || [],
            },
            score: match.matchScore?.totalScore,
          });
        });
      }

      setMatches(response.matches || []);
      setProcessingTime(response.processingTime);
      setTotalCandidates(response.totalCandidates);
      
      if (response.matches && response.matches.length === 0) {
        console.warn('[FRONTEND] ⚠️ No matches found');
        console.warn('[FRONTEND] Total candidates:', response.totalCandidates);
        if (response.totalCandidates === 0) {
          console.warn('[FRONTEND] ⚠️ NO CANDIDATES FOUND - This means no other users exist in database');
        } else {
          console.warn('[FRONTEND] ⚠️ Candidates exist but no matches found');
        }
      }
    } catch (err) {
      console.error('[FRONTEND] ❌ ERROR FINDING MATCHES:', err);
      if (err instanceof Error) {
        console.error('[FRONTEND] Error message:', err.message);
        console.error('[FRONTEND] Error stack:', err.stack);
      }
      setError(err instanceof Error ? err.message : 'Failed to find matches');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveReview = (match: MatchResult) => {
    setReviewMatch(match);
    setShowReviewModal(true);
  };

  const handleStartCollaboration = (match: MatchResult) => {
    if (!user) return;
    
    setSelectedMatch(match);
    setShowCollaborationModal(true);
  };

  const handleVideoCall = () => {
    window.open('https://meet.bhargavshekhar.shop/', '_blank');
    setShowCollaborationModal(false);
  };

  const handleWhiteboard = () => {
    if (selectedMatch && user) {
      const matchedUser = selectedMatch.userA.id === user.id ? selectedMatch.userB : selectedMatch.userA;
      navigate(`/white-board?userA=${user.id}&userB=${matchedUser.id}`);
      setShowCollaborationModal(false);
    }
  };

  const handleLiveChat = async () => {
    if (!selectedMatch || !user) return;

    const matchedUser = selectedMatch.userA.id === user.id ? selectedMatch.userB : selectedMatch.userA;
    
    const userOfferSkill = user.offer_skill || 'Unknown';
    const userWantSkill = user.want_skill || 'Unknown';
    
    navigate(`/chat?matchedUserId=${matchedUser.id}&skillA=${encodeURIComponent(userOfferSkill)}&skillB=${encodeURIComponent(userWantSkill)}`);
    setShowCollaborationModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-center mb-6">
            <motion.h1 
              className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Swap Sphere
            </motion.h1>
            <motion.button
              onClick={logout}
              className="px-5 py-2.5 text-gray-600 hover:text-gray-900 font-medium rounded-lg hover:bg-white/50 transition-all duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Logout
            </motion.button>
          </div>
          <motion.p 
            className="text-2xl font-semibold text-gray-800 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Peer-to-Peer Skill Exchange Platform
          </motion.p>
          <motion.p 
            className="text-gray-600 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Share what you master. Learn what you need. No fees. No complexity.
          </motion.p>
        </motion.div>

        {/* Profile Form */}
        <AnimatePresence>
          {showProfileForm && (
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <OfferWantProfile />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collaboration Options Modal */}
        <AnimatePresence>
          {showCollaborationModal && selectedMatch && (
            <motion.div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCollaborationModal(false)}
            >
              <motion.div 
                className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", duration: 0.5 }}
                onClick={(e) => e.stopPropagation()}
              >
                <motion.h2 
                  className="text-3xl font-bold text-gray-900 mb-8 text-center"
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  Choose Collaboration
                </motion.h2>
                
                <div className="space-y-4">
                  {/* Video Call Option */}
                  <motion.button
                    onClick={handleVideoCall}
                    className="w-full px-6 py-5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-3 font-semibold shadow-lg hover:shadow-xl"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <span className="text-3xl">📹</span>
                    <span className="text-lg">Video Call</span>
                  </motion.button>

                  {/* Whiteboard Option */}
                  <motion.button
                    onClick={handleWhiteboard}
                    className="w-full px-6 py-5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-3 font-semibold shadow-lg hover:shadow-xl"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className="text-3xl">🖊️</span>
                    <span className="text-lg">Live Whiteboard</span>
                  </motion.button>

                  {/* Live Chat Option */}
                  <motion.button
                    onClick={handleLiveChat}
                    className="w-full px-6 py-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-3 font-semibold shadow-lg hover:shadow-xl"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <span className="text-3xl">💬</span>
                    <span className="text-lg">Live Chat</span>
                  </motion.button>
                </div>

                <motion.button
                  onClick={() => setShowCollaborationModal(false)}
                  className="mt-6 w-full px-4 py-3 text-gray-600 hover:text-gray-900 font-medium rounded-xl hover:bg-gray-100 transition-colors duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Cancel
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        {!showProfileForm && user && (
          <>
            {/* User Profile Card */}
            <motion.div 
              className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-6">
                <motion.div
                  className="flex items-center gap-4"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <UserAvatar user={user} size="lg" />
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">
                      <DisplayName user={user} />
                    </h2>
                    {user.email && (
                      <p className="text-gray-600 mt-1">{user.email}</p>
                    )}
                  </div>
                </motion.div>
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => navigate('/profile')}
                    className="px-6 py-3 text-blue-600 border-2 border-blue-600 rounded-xl hover:bg-blue-50 font-semibold transition-all duration-200"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    Privacy Settings
                  </motion.button>
                  <motion.button
                    onClick={() => setShowProfileForm(true)}
                    className="px-6 py-3 text-blue-600 border-2 border-blue-600 rounded-xl hover:bg-blue-50 font-semibold transition-all duration-200"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    Edit Profile
                  </motion.button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* What I Offer */}
                <motion.div 
                  className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 shadow-sm"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02, boxShadow: "0 10px 30px rgba(34, 197, 94, 0.15)" }}
                >
                  <h3 className="text-sm font-bold text-green-800 mb-3 uppercase tracking-wide flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    What I Offer
                  </h3>
                  {user.offer_skill ? (
                    <div>
                      <p className="text-2xl font-bold text-gray-900 mb-2">{user.offer_skill}</p>
                      {user.skill_level && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-green-200 rounded-full h-2 overflow-hidden">
                            <motion.div 
                              className="bg-green-600 h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${user.skill_level * 10}%` }}
                              transition={{ duration: 0.8, delay: 0.5 }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{user.skill_level}/10</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">No skill offered</p>
                  )}
                </motion.div>

                {/* What I Want */}
                <motion.div 
                  className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100 shadow-sm"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.02, boxShadow: "0 10px 30px rgba(168, 85, 247, 0.15)" }}
                >
                  <h3 className="text-sm font-bold text-purple-800 mb-3 uppercase tracking-wide flex items-center gap-2">
                    <span className="text-lg">🎓</span>
                    What I Want
                  </h3>
                  {user.want_skill ? (
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{user.want_skill}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500">No skill wanted</p>
                  )}
                </motion.div>
              </div>
            </motion.div>

            {/* Find Matches Section */}
            <motion.div 
              className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="text-3xl">🔍</span>
                    Find Your Perfect Match
                  </h3>
                  <p className="text-gray-600">
                    Our intelligent algorithm will find users who want what you offer and offer what you want.
                  </p>
                  {totalCandidates !== undefined && (
                    <p className="text-sm text-gray-500 mt-2">
                      Last search: {totalCandidates} candidates found
                    </p>
                  )}
                </motion.div>
                <div className="flex gap-3">
                  <motion.button
                    onClick={async () => {
                      try {
                        const url = `${import.meta.env.VITE_MATCHING_ENGINE_URL || 'http://localhost:8081'}/api/matching/debug/user/${user.id}`;
                        console.log('[FRONTEND] Debugging user:', url);
                        const response = await fetch(url);
                        const data = await response.json();
                        console.log('[FRONTEND] User Debug Result:', data);
                        alert(`User Debug:\n\nRAW FROM DB:\nOffer: ${data.raw?.offer_skill || 'NONE'}\nWant: ${data.raw?.want_skill || 'NONE'}\n\nCONVERTED:\nOffers: ${data.converted?.offers?.join(', ') || 'NONE'}\nWants: ${data.converted?.wants?.join(', ') || 'NONE'}\n\nCheck console for full details.`);
                      } catch (err) {
                        console.error('[FRONTEND] Debug error:', err);
                        alert('Failed to debug. Check console.');
                      }
                    }}
                    className="px-6 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold text-sm shadow-lg transition-all duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Debug User
                  </motion.button>
                  <motion.button
                    onClick={async () => {
                      try {
                        const url = `${import.meta.env.VITE_MATCHING_ENGINE_URL || 'http://localhost:8081'}/api/matching/simple-test`;
                        console.log('[FRONTEND] Testing simple endpoint:', url);
                        const response = await fetch(url, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: user.id }),
                        });
                        const data = await response.json();
                        console.log('[FRONTEND] Simple Test Result:', data);
                        const skillsList = data.candidates?.map((c: any) => `${c.name}: Offer="${c.offer_skill}", Want="${c.want_skill}"`).join('\n') || 'None';
                        alert(`Simple Test:\nTotal Users: ${data.totalUsers}\nCandidates: ${data.candidatesCount}\n\nSkills:\n${skillsList}\n\nCheck console for full details.`);
                      } catch (err) {
                        console.error('[FRONTEND] Simple test error:', err);
                        alert('Failed to test. Check console.');
                      }
                    }}
                    className="px-6 py-4 bg-gray-600 text-white rounded-xl hover:bg-gray-700 font-semibold text-sm shadow-lg transition-all duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Test DB
                  </motion.button>
                  <motion.button
                    onClick={handleFindMatches}
                    disabled={loading || !user.offer_skill || !user.want_skill}
                    className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          ⚡
                        </motion.span>
                        Finding...
                      </span>
                    ) : (
                      'Find Matches'
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8 flex items-center gap-3 shadow-sm"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="text-2xl">⚠️</span>
                  <span className="font-medium">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Match Results */}
            <AnimatePresence>
              {matches.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5 }}
                >
                  <MatchResults
                    matches={matches}
                    currentUserId={user.id}
                    totalCandidates={totalCandidates}
                    processingTime={processingTime}
                    onStartCollaboration={handleStartCollaboration}
                    onLeaveReview={handleLeaveReview}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty State */}
            {matches.length === 0 && !loading && (
              <motion.div 
                className="bg-white p-16 rounded-2xl shadow-xl text-center border border-gray-100"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div 
                  className="text-8xl mb-6"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                >
                  🔍
                </motion.div>
                <motion.p 
                  className="text-2xl font-bold text-gray-900 mb-3"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {totalCandidates === 0 
                    ? 'No Other Users Found' 
                    : totalCandidates !== undefined
                    ? 'No Matches Found'
                    : 'Ready to find your perfect match?'}
                </motion.p>
                <motion.p 
                  className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {totalCandidates === 0 
                    ? 'There are no other users in the system yet. Ask a friend to sign up to start matching!'
                    : totalCandidates !== undefined
                    ? `Searched through ${totalCandidates} candidates but no matches met the criteria. Try adjusting your skills or wait for more users to join.`
                    : 'Click "Find Matches" to discover users who want what you offer and offer what you want.'}
                </motion.p>
              </motion.div>
            )}

            {/* Loading State */}
            {loading && (
              <motion.div 
                className="bg-white p-16 rounded-2xl shadow-xl text-center border border-gray-100"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div 
                  className="inline-block rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mb-6"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <motion.p 
                  className="text-2xl font-bold text-gray-900 mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Finding your perfect match...
                </motion.p>
                <motion.p 
                  className="text-gray-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Our algorithm is analyzing compatibility
                </motion.p>
                <motion.div 
                  className="mt-6 flex justify-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-3 h-3 bg-blue-600 rounded-full"
                      animate={{ y: [0, -10, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            )}
          </>
        )}

        {/* Review Modal */}
        {showReviewModal && reviewMatch && user && (
          <ReviewModal
            isOpen={showReviewModal}
            onClose={() => {
              setShowReviewModal(false);
              setReviewMatch(null);
            }}
            match={reviewMatch}
            currentUserId={user.id}
          />
        )}
      </div>
    </div>
  );
}
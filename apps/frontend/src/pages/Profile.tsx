/**
 * Profile Page
 * User profile management with privacy/anonymous mode toggle
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DisplayName } from '../components/DisplayName';
import { UserAvatar } from '../components/UserAvatar';
import { privacyApi } from '../services/privacy.api';

export function Profile() {
  const { user, loading: authLoading, isAuthenticated, toggleAnonymous } = useAuth();
  const navigate = useNavigate();
  const [toggling, setToggling] = useState(false);
  const [privacyState, setPrivacyState] = useState<{
    isAnonymous: boolean;
    anonymousName: string | null;
    anonymousAvatar: string;
  } | null>(null);
  const [loadingPrivacy, setLoadingPrivacy] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user) {
      loadPrivacyState();
    }
  }, [user, authLoading, isAuthenticated, navigate]);

  const loadPrivacyState = async () => {
    try {
      setLoadingPrivacy(true);
      const state = await privacyApi.getPrivacyState();
      setPrivacyState(state);
    } catch (error) {
      console.error('Error loading privacy state:', error);
    } finally {
      setLoadingPrivacy(false);
    }
  };

  const handleToggleAnonymous = async () => {
    try {
      setToggling(true);
      await toggleAnonymous();
      // Reload privacy state
      await loadPrivacyState();
    } catch (error: any) {
      console.error('Error toggling anonymous mode:', error);
      alert(error.response?.data?.error || 'Failed to toggle anonymous mode');
    } finally {
      setToggling(false);
    }
  };

  if (authLoading || loadingPrivacy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/matching')}
            className="text-blue-600 hover:text-blue-800 font-medium mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-6 mb-6">
            <UserAvatar user={user} size="xl" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                <DisplayName user={user} />
              </h2>
              {user.email && (
                <p className="text-gray-600 mt-1">{user.email}</p>
              )}
            </div>
          </div>

          {/* Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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

            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-800 mb-2 uppercase tracking-wide">
                What I Want
              </h3>
              {user.want_skill ? (
                <p className="text-lg font-bold text-gray-900">{user.want_skill}</p>
              ) : (
                <p className="text-gray-500">No skill wanted</p>
              )}
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Privacy Settings</h2>
          
          <div className="space-y-4">
            {/* Anonymous Mode Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Anonymous Mode</h3>
                <p className="text-sm text-gray-600">
                  {privacyState?.isAnonymous
                    ? `Your identity is masked. You appear as "${privacyState.anonymousName || 'Anonymous'}" to other users.`
                    : 'Your real name and identity are visible to other users.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  privacyState?.isAnonymous
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {privacyState?.isAnonymous ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>

            {/* Toggle Button */}
            <button
              onClick={handleToggleAnonymous}
              disabled={toggling}
              className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${
                privacyState?.isAnonymous
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } disabled:bg-gray-400 disabled:cursor-not-allowed`}
            >
              {toggling
                ? 'Updating...'
                : privacyState?.isAnonymous
                ? 'Disable Anonymous Mode'
                : 'Enable Anonymous Mode'}
            </button>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">What happens when Anonymous Mode is ON:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Your real name is replaced with a pseudonym (e.g., "{privacyState?.anonymousName || 'SwiftOwl92'}")</li>
                <li>Your avatar is replaced with a default anonymous avatar</li>
                <li>Your email and other PII are hidden from public API responses</li>
                <li>Internal operations (matching, IDs, database references) remain unchanged</li>
                <li>This applies to reviews, exchanges, chat messages, and user listings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


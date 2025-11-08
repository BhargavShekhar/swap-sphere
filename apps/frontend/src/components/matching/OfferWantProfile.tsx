/**
 * OfferWantProfile Component
 * MVP-focused profile creation: One skill to Offer, One skill to Want, Skill Level 1-10
 */

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function OfferWantProfile() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [offer_skill, setOfferSkill] = useState('');
  const [want_skill, setWantSkill] = useState('');
  const [skill_level, setSkillLevel] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateProfile, user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!offer_skill.trim()) {
      setError('Please specify a skill you can teach');
      return;
    }

    if (!want_skill.trim()) {
      setError('Please specify a skill you want to learn');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateProfile({
        offer_skill: offer_skill.trim(),
        want_skill: want_skill.trim(),
        skill_level,
      });
      // Profile will be updated in context, navigate will happen automatically
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Swap Sphere</h2>
        <p className="text-gray-600 mb-6">
          Complete your profile to start finding perfect skill exchange partners.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Hi {user?.name}!</strong> Let's set up your Offer & Want profile.
        </p>
      </div>

      <button
        onClick={() => setStep(2)}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
      >
        Get Started →
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What Can You Teach?</h2>
        <p className="text-gray-600 mb-6">
          List <strong>one skill</strong> you master and can teach to others.
          <br />
          <span className="text-sm text-gray-500">
            Example: "Advanced Excel Modeling" or "Spanish Conversation"
          </span>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Skill Name *
        </label>
        <input
          type="text"
          value={offer_skill}
          onChange={(e) => setOfferSkill(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Advanced Excel Modeling"
          required
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setStep(1)}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          Back
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={!offer_skill.trim()}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          Next: What Do You Want to Learn?
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What Do You Want to Learn?</h2>
        <p className="text-gray-600 mb-6">
          List <strong>one skill</strong> you want to learn from others.
          <br />
          <span className="text-sm text-gray-500">
            Example: "Beginner Python for Data" or "French Conversation"
          </span>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Skill Name *
        </label>
        <input
          type="text"
          value={want_skill}
          onChange={(e) => setWantSkill(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Beginner Python for Data"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Skill Level: {skill_level}/10
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={skill_level}
          onChange={(e) => setSkillLevel(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Beginner (1)</span>
          <span>Expert (10)</span>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          This represents your overall skill level for matching purposes.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => setStep(2)}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={!want_skill.trim() || isSubmitting}
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {isSubmitting ? 'Saving Profile...' : 'Complete Profile'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex-1 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`h-2 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <p className="text-xs mt-2 text-center">Welcome</p>
          </div>
          <div className={`flex-1 mx-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`h-2 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <p className="text-xs mt-2 text-center">What You Offer</p>
          </div>
          <div className={`flex-1 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`h-2 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <p className="text-xs mt-2 text-center">What You Want</p>
          </div>
        </div>
      </div>

      {/* Step Content */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
}

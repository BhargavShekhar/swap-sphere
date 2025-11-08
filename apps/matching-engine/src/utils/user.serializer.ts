/**
 * User Serializer
 * Centralized serializer for user data in public API responses
 * Masks identity when user has anonymous mode enabled
 */

import type { IUser } from '../models/User.model.js';

export interface SerializedUser {
  id: string;
  name: string;
  email?: string; // Only included if not anonymous
  avatar?: string; // Avatar URL
  isAnonymous?: boolean; // Whether this user is anonymous
  anonymousName?: string; // Pseudonym if anonymous
  anonymousAvatar?: string; // Anonymous avatar if anonymous
  offer_skill?: string;
  want_skill?: string;
  skill_level?: number;
  trustScore?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Serialize user for public API responses
 * If user is anonymous, masks name and avatar, removes PII
 * If not anonymous, returns normal identity
 */
export function serializeUser(user: IUser | any, includePII: boolean = false): SerializedUser {
  // Handle populated user objects (from Mongoose populate)
  const userId = user._id ? String(user._id) : String(user.id || user);
  
  // Explicitly check for true - handle undefined, null, false correctly
  // Only mask if explicitly set to true
  // Check both direct property and potential nested access
  const isAnonymousValue = user.isAnonymous !== undefined 
    ? user.isAnonymous 
    : (user.get ? user.get('isAnonymous') : false);
  const isAnonymous = Boolean(isAnonymousValue === true);
  
  const anonymousName = user.anonymousName || (user.get ? user.get('anonymousName') : undefined);
  const anonymousAvatar = user.anonymousAvatar || (user.get ? user.get('anonymousAvatar') : undefined) || '/default-avatar.png';

  // Get the real name - handle both populated and direct access
  const realName = user.name || (user.username ? user.username : 'Unknown User');
  
  // Debug logging (can be removed in production)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Serializer] User ${userId}: isAnonymous=${isAnonymousValue}, name=${realName}, willShow=${isAnonymous ? anonymousName : realName}`);
  }
  
  const serialized: SerializedUser = {
    id: userId,
    name: isAnonymous ? (anonymousName || 'Anonymous') : realName,
    avatar: isAnonymous ? anonymousAvatar : (user.avatar || '/default-avatar.png'),
    isAnonymous: isAnonymous, // Explicitly set to boolean
  };

  // Only include email if not anonymous AND includePII is true
  // For most public endpoints, includePII should be false
  if (!isAnonymous && includePII) {
    serialized.email = user.email;
  }

  // Include profile fields (these are not PII)
  if (user.offer_skill !== undefined) {
    serialized.offer_skill = user.offer_skill;
  }
  if (user.want_skill !== undefined) {
    serialized.want_skill = user.want_skill;
  }
  if (user.skill_level !== undefined) {
    serialized.skill_level = user.skill_level;
  }
  if (user.trustScore !== undefined) {
    serialized.trustScore = user.trustScore;
  }

  // Include timestamps if available
  if (user.createdAt) {
    serialized.createdAt = user.createdAt;
  }
  if (user.updatedAt) {
    serialized.updatedAt = user.updatedAt;
  }

  // Include anonymous fields for reference
  if (isAnonymous) {
    serialized.anonymousName = anonymousName;
    serialized.anonymousAvatar = anonymousAvatar;
  }

  return serialized;
}

/**
 * Serialize multiple users
 */
export function serializeUsers(users: (IUser | any)[], includePII: boolean = false): SerializedUser[] {
  return users.map(user => serializeUser(user, includePII));
}


/**
 * UserAvatar Component
 * Universal component for displaying user avatars
 * Automatically uses anonymous avatar when user is anonymous
 */

import type { User } from '../services/auth.api';

interface UserAvatarProps {
  user: User | { avatar?: string; isAnonymous?: boolean; anonymousAvatar?: string; anonymousName?: string; name?: string } | null | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

export function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  const sizeClass = sizeClasses[size];
  
  if (!user) {
    return (
      <div className={`${sizeClass} rounded-full bg-gray-300 flex items-center justify-center text-gray-600 ${className}`}>
        ?
      </div>
    );
  }

  // Use anonymous avatar if user is anonymous, otherwise use real avatar or default
  const avatarUrl = user.isAnonymous && user.anonymousAvatar
    ? user.anonymousAvatar
    : user.avatar || '/default-avatar.png';

  // Get initials for fallback
  const displayName = user.isAnonymous && user.anonymousName
    ? user.anonymousName
    : user.name || 'U';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold overflow-hidden ${className}`}>
      {avatarUrl && avatarUrl !== '/default-avatar.png' ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = initials;
            }
          }}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}


/**
 * DisplayName Component
 * Universal component for displaying user names
 * Automatically uses pseudonym when user is anonymous
 */

import type { User } from '../services/auth.api';

interface DisplayNameProps {
  user: User | { name?: string; isAnonymous?: boolean; anonymousName?: string } | null | undefined;
  className?: string;
}

export function DisplayName({ user, className }: DisplayNameProps) {
  if (!user) {
    return <span className={className}>Unknown User</span>;
  }

  // Use anonymous name if user is anonymous, otherwise use real name
  const displayName = user.isAnonymous && user.anonymousName
    ? user.anonymousName
    : user.name || 'Unknown User';

  return <span className={className}>{displayName}</span>;
}


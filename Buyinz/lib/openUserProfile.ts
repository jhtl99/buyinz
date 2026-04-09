import type { Router } from 'expo-router';

/** Opens another user's profile, or the Profile tab when target is the current user. */
export function openUserProfile(
  router: Router,
  targetUserId: string,
  currentUserId?: string | null,
): void {
  if (currentUserId && targetUserId === currentUserId) {
    router.push('/(tabs)/profile');
    return;
  }
  router.push(`/user/${targetUserId}`);
}

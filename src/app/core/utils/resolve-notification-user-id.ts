import { ApiService } from '../../services/api.service';

/**
 * Inbox notifications are tied to the logged-in account, not a stale profile id.
 * Prefer auth user from session; fall back to profile_user_id only when session user is missing.
 */
export function resolveNotificationUserId(api: ApiService): string | null {
  const user = api.getUser();
  const authId = user?.id ?? user?.userId ?? user?._id;
  if (authId != null && String(authId).trim() !== '') {
    return String(authId);
  }

  const profileUserId = localStorage.getItem('profile_user_id');
  return profileUserId?.trim() ? profileUserId : null;
}

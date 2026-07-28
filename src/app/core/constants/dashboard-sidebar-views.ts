import { ViewState } from '../../types';

/** Views opened from the dashboard sidebar — back navigation returns to dashboard. */
export const DASHBOARD_SIDEBAR_VIEWS: ReadonlySet<ViewState> = new Set<ViewState>([
  'edit-profile',
  'partner-preferences',
  'photo-gallery',
  'marriage-profile-pdf',
  'biodata-maker',
  'shortlisted',
  'my-connections',
  'favorites',
  'messages',
  'notifications',
  'premium',
  'settings',
  'community',
  'community-events',
  'event-detail',
  'teachings',
  'teaching-article'
]);

export function isDashboardSidebarView(view: string): view is ViewState {
  return DASHBOARD_SIDEBAR_VIEWS.has(view as ViewState);
}

export function backToDashboardView(): ViewState {
  return 'dashboard';
}

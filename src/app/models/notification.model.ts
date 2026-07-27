export type AppNotificationSource = 'inbox' | 'list' | 'admin' | 'pending_photo';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  /** Where this row came from (for mark-read / navigation). */
  source?: AppNotificationSource;
  photoId?: string;
  submitterUserId?: string;
}

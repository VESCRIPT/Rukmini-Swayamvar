import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AppNotification } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private api: ApiService) {}

  getUnreadCount(userId: string): Observable<number> {
    const sources: Observable<number>[] = [
      this.api.getNotificationsUnreadCount(userId).pipe(
        map((response) => this.extractUnreadCount(response)),
        catchError(() => of(0))
      ),
      this.fetchStandardNotifications(userId, 1, 50, false).pipe(
        map((items) => items.filter((n) => !n.isRead).length),
        catchError(() => of(0))
      )
    ];

    return forkJoin(sources).pipe(map((counts) => Math.max(0, ...counts)));
  }

  listLatest(userId: string, limit = 10, unreadOnly = false): Observable<AppNotification[]> {
    return this.fetchMergedNotifications(userId, 1, limit, unreadOnly);
  }

  listAll(userId: string, page = 1, limit = 50, unreadOnly = false): Observable<AppNotification[]> {
    return this.fetchMergedNotifications(userId, page, limit, unreadOnly);
  }

  listUnread(userId: string, page = 1, limit = 50): Observable<AppNotification[]> {
    return this.fetchMergedNotifications(userId, page, limit, true);
  }

  markOneRead(userId: string, notificationId: string): Observable<void> {
    if (notificationId.startsWith('pending-photo-')) {
      return of(undefined);
    }
    return this.api.markOneNotificationRead(userId, notificationId).pipe(map(() => undefined));
  }

  markMultipleRead(userId: string, notificationIds: string[]): Observable<void> {
    const ids = notificationIds.filter((id) => !id.startsWith('pending-photo-'));
    if (!ids.length) {
      return of(undefined);
    }
    return this.api.markMultipleNotificationsRead(userId, ids).pipe(map(() => undefined));
  }

  markAllRead(userId: string): Observable<void> {
    return this.api.markAllNotificationsRead(userId).pipe(map(() => undefined));
  }

  pushTest(userId: string, title?: string, message?: string): Observable<void> {
    return this.api.pushNotificationTest({ userId, title, message }).pipe(map(() => undefined));
  }

  extractUnreadCount(response: unknown): number {
    if (response == null || typeof response !== 'object') return 0;
    const r = response as Record<string, unknown>;
    const data = (r['data'] as Record<string, unknown>) ?? r;
    const raw =
      data['unreadCount'] ??
      data['unread_count'] ??
      data['count'] ??
      r['unreadCount'] ??
      r['unread_count'] ??
      r['count'];
    return Math.max(0, Number(raw) || 0);
  }

  extractNotifications(response: unknown): AppNotification[] {
    const list = this.extractList(response);
    return list
      .map((item) => this.mapNotification(item))
      .filter((n): n is AppNotification => n != null);
  }

  private fetchMergedNotifications(
    userId: string,
    page: number,
    limit: number,
    unreadOnly: boolean
  ): Observable<AppNotification[]> {
    return forkJoin({
      standard: this.fetchStandardNotifications(userId, page, limit, unreadOnly)
    }).pipe(
      map(({ standard }) => {
        let merged = this.mergeNotifications([...standard]);
        if (unreadOnly) {
          merged = merged.filter((n) => !n.isRead);
        }
        return merged.slice(0, limit);
      })
    );
  }

  private fetchStandardNotifications(
    userId: string,
    page: number,
    limit: number,
    unreadOnly: boolean
  ): Observable<AppNotification[]> {
    const request = unreadOnly
      ? this.api.listNotificationsUnreadOnly(userId, page, limit)
      : this.api.listNotifications(userId, page, limit);
    return this.safeExtract(request, 'list');
  }

  private fetchInboxNotifications(
    userId: string,
    page: number,
    limit: number,
    unreadOnly: boolean
  ): Observable<AppNotification[]> {
    const request = this.api.listNotificationsInbox(userId, page, limit);
    return this.safeExtract(request, 'inbox').pipe(
      map((items) => (unreadOnly ? items.filter((n) => !n.isRead) : items))
    );
  }

  private fetchPendingPhotoNotifications(
    userId: string,
    page: number,
    limit: number
  ): Observable<AppNotification[]> {
    return this.api.listPendingProfilePhotos(userId, page, limit).pipe(
      map((response) => this.mapPendingPhotosToNotifications(response)),
      catchError(() => of([]))
    );
  }

  private safeExtract(
    request: Observable<unknown>,
    source: AppNotification['source']
  ): Observable<AppNotification[]> {
    return request.pipe(
      map((response) =>
        this.extractNotifications(response).map((n) => ({ ...n, source: n.source ?? source }))
      ),
      catchError(() => of([]))
    );
  }

  private mergeNotifications(items: AppNotification[]): AppNotification[] {
    const byKey = new Map<string, AppNotification>();
    for (const item of items) {
      const key = `${item.source ?? 'list'}:${item.id}`;
      const existing = byKey.get(key);
      if (!existing || new Date(item.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        byKey.set(key, item);
      }
    }
    return Array.from(byKey.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  private mapPendingPhotosToNotifications(response: unknown): AppNotification[] {
    const list = this.extractPendingPhotoList(response);
    return list
      .map((item, index) => this.mapPendingPhotoItem(item, index))
      .filter((n): n is AppNotification => n != null);
  }

  private extractPendingPhotoList(response: unknown): unknown[] {
    if (!response || typeof response !== 'object') return [];
    if (Array.isArray(response)) return response;

    const r = response as Record<string, unknown>;
    const data = (r['data'] ?? r['result']) as unknown;
    if (Array.isArray(data)) return data;

    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      for (const key of ['photos', 'pendingPhotos', 'pending_photos', 'list', 'items', 'results']) {
        if (Array.isArray(d[key])) return d[key] as unknown[];
      }
    }

    for (const key of ['photos', 'pendingPhotos', 'pending_photos', 'list', 'items', 'results']) {
      if (Array.isArray(r[key])) return r[key] as unknown[];
    }
    return [];
  }

  private mapPendingPhotoItem(item: unknown, index: number): AppNotification | null {
    if (!item || typeof item !== 'object') return null;
    const raw = item as Record<string, unknown>;
    const user = (raw['user'] ?? raw['profile'] ?? raw['submitter']) as Record<string, unknown> | undefined;

    const photoId = raw['id'] ?? raw['_id'] ?? raw['photoId'] ?? raw['photo_id'];
    const submitterUserId =
      raw['userId'] ??
      raw['user_id'] ??
      user?.['id'] ??
      user?.['userId'] ??
      user?.['_id'];
    const submitterName =
      raw['userName'] ??
      raw['user_name'] ??
      raw['submitterName'] ??
      raw['name'] ??
      user?.['name'] ??
      user?.['fullName'] ??
      [user?.['firstName'], user?.['lastName']].filter(Boolean).join(' ').trim();

    const name = submitterName && String(submitterName).trim() ? String(submitterName).trim() : 'A user';
    const id = photoId != null ? `pending-photo-${photoId}` : `pending-photo-${index}`;

    return {
      id: String(id),
      title: 'Photo approval needed',
      message: `${name} submitted a profile photo for approval`,
      createdAt: String(
        raw['createdAt'] ??
          raw['created_at'] ??
          raw['uploadedAt'] ??
          raw['uploaded_at'] ??
          raw['submittedAt'] ??
          new Date().toISOString()
      ),
      isRead: false,
      source: 'pending_photo',
      photoId: photoId != null ? String(photoId) : undefined,
      submitterUserId: submitterUserId != null ? String(submitterUserId) : undefined
    };
  }

  private extractList(response: unknown): unknown[] {
    if (!response || typeof response !== 'object') return [];
    if (Array.isArray(response)) return response;

    const r = response as Record<string, unknown>;
    const data = (r['data'] ?? r['result'] ?? r['payload']) as unknown;

    if (Array.isArray(data)) return data;

    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      for (const key of [
        'notifications',
        'notificationList',
        'list',
        'items',
        'results',
        'rows',
        'records',
        'data'
      ]) {
        if (Array.isArray(d[key])) return d[key] as unknown[];
      }
    }

    for (const key of ['notifications', 'notificationList', 'list', 'items', 'results', 'rows', 'records']) {
      if (Array.isArray(r[key])) return r[key] as unknown[];
    }

    return [];
  }

  private mapNotification(item: unknown): AppNotification | null {
    if (!item || typeof item !== 'object') return null;

    const raw = this.unwrapNotificationRecord(item as Record<string, unknown>);
    const id =
      raw['id'] ??
      raw['_id'] ??
      raw['notificationId'] ??
      raw['notification_id'] ??
      raw['notificationID'];
    if (id == null || String(id).trim() === '') return null;

    const type = String(raw['type'] ?? raw['notificationType'] ?? raw['category'] ?? '').toLowerCase();
    const defaultTitle =
      type.includes('photo') && type.includes('approv') ? 'Photo approval needed' : 'Notification';

    const title = String(
      raw['title'] ??
        raw['subject'] ??
        raw['heading'] ??
        raw['notificationTitle'] ??
        raw['notification_title'] ??
        raw['pushTitle'] ??
        defaultTitle
    );
    const message = String(
      raw['message'] ??
        raw['body'] ??
        raw['content'] ??
        raw['text'] ??
        raw['description'] ??
        raw['notificationMessage'] ??
        raw['notification_message'] ??
        raw['notificationBody'] ??
        raw['notification_body'] ??
        raw['pushBody'] ??
        ''
    );
    const createdAt = String(
      raw['createdAt'] ??
        raw['created_at'] ??
        raw['timestamp'] ??
        raw['sentAt'] ??
        raw['sent_at'] ??
        raw['date'] ??
        new Date().toISOString()
    );

    const status = String(raw['status'] ?? raw['readStatus'] ?? raw['read_status'] ?? '').toLowerCase();
    const isRead =
      status === 'read' ||
      raw['isRead'] === true ||
      raw['is_read'] === true ||
      raw['read'] === true ||
      raw['read'] === 1 ||
      raw['read'] === '1' ||
      (raw['readAt'] != null && raw['readAt'] !== '') ||
      (raw['read_at'] != null && raw['read_at'] !== '');

    return {
      id: String(id),
      title,
      message,
      createdAt,
      isRead: status === 'unread' ? false : isRead,
      source: 'inbox'
    };
  }

  private unwrapNotificationRecord(raw: Record<string, unknown>): Record<string, unknown> {
    const nested = raw['notification'] ?? raw['payload'] ?? raw['data'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return { ...(nested as Record<string, unknown>), ...raw };
    }
    return raw;
  }
}

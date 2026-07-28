import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewState } from '../types';
import { NotificationService } from '../services/notification.service';
import { AppNotification } from '../models/notification.model';
import { formatTimeAgo } from '../core/utils/time-ago';
import { ApiService } from '../services/api.service';
import { resolveNotificationUserId } from '../core/utils/resolve-notification-user-id';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent implements OnInit {
  @Input() previousView: ViewState = 'dashboard';
  @Output() viewChange = new EventEmitter<ViewState>();

  private readonly notificationService = inject(NotificationService);
  private readonly apiService = inject(ApiService);

  notifications: AppNotification[] = [];
  loading = false;
  markingAll = false;
  markingSelected = false;
  unreadCount = 0;
  filter: 'all' | 'unread' = 'all';
  selectionMode = false;
  selectedIds = new Set<string>();

  ngOnInit(): void {
    this.loadNotifications();
    this.loadUnreadCount();
  }

  get hasUnread(): boolean {
    return this.unreadCount > 0;
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  goBack() {
    this.viewChange.emit(this.previousView || 'dashboard');
  }

  timeAgo(value: string): string {
    return formatTimeAgo(value);
  }

  setFilter(filter: 'all' | 'unread'): void {
    if (this.filter === filter) return;
    this.filter = filter;
    this.clearSelection();
    this.loadNotifications();
  }

  toggleSelectionMode(): void {
    this.selectionMode = !this.selectionMode;
    if (!this.selectionMode) {
      this.selectedIds.clear();
    }
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  toggleSelect(notification: AppNotification, event: Event): void {
    event.stopPropagation();
    if (notification.isRead) return;
    this.toggleSelectId(notification.id);
  }

  private toggleSelectId(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.selectedIds = new Set(this.selectedIds);
  }

  onNotificationClick(notification: AppNotification): void {
    if (this.selectionMode) {
      if (!notification.isRead) {
        this.toggleSelectId(notification.id);
      }
      return;
    }

    if (notification.isRead) return;

    const userId = this.resolveUserId();
    if (!userId) return;

    this.notificationService.markOneRead(userId, notification.id).subscribe({
      next: () => {
        notification.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        if (this.filter === 'unread') {
          this.notifications = this.notifications.filter((n) => n.id !== notification.id);
        }
      },
      error: () => {}
    });
  }

  markSelectedAsRead(): void {
    if (!this.selectedCount || this.markingSelected) return;

    const userId = this.resolveUserId();
    if (!userId) return;

    const ids = Array.from(this.selectedIds);
    this.markingSelected = true;
    this.notificationService.markMultipleRead(userId, ids).subscribe({
      next: () => {
        const idSet = new Set(ids);
        this.notifications = this.notifications
          .map((n) => (idSet.has(n.id) ? { ...n, isRead: true } : n))
          .filter((n) => this.filter !== 'unread' || !n.isRead);
        this.unreadCount = Math.max(0, this.unreadCount - ids.length);
        this.clearSelection();
        this.markingSelected = false;
        this.loadUnreadCount();
      },
      error: () => {
        this.markingSelected = false;
      }
    });
  }

  markAllAsRead(): void {
    if (!this.hasUnread || this.markingAll) return;

    const userId = this.resolveUserId();
    if (!userId) return;

    this.markingAll = true;
    this.notificationService.markAllRead(userId).subscribe({
      next: () => {
        if (this.filter === 'unread') {
          this.notifications = [];
        } else {
          this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
        }
        this.unreadCount = 0;
        this.clearSelection();
        this.markingAll = false;
      },
      error: () => {
        this.markingAll = false;
      }
    });
  }

  private clearSelection(): void {
    this.selectedIds.clear();
    this.selectedIds = new Set();
    this.selectionMode = false;
  }

  private loadNotifications(): void {
    const userId = this.resolveUserId();
    if (!userId) return;

    this.loading = true;
    this.notificationService.listAll(userId, 1, 50, this.filter === 'unread').subscribe({
      next: (items) => {
        this.notifications = items;
        this.loading = false;
      },
      error: () => {
        this.notifications = [];
        this.loading = false;
      }
    });
  }

  private loadUnreadCount(): void {
    const userId = this.resolveUserId();
    if (!userId) return;

    this.notificationService.getUnreadCount(userId).subscribe({
      next: (count) => {
        this.unreadCount = count;
      },
      error: () => {}
    });
  }

  private resolveUserId(): string | null {
    return resolveNotificationUserId(this.apiService);
  }
}

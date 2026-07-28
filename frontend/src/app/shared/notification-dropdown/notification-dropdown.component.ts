import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  OnInit,
  Output,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { AppNotification } from '../../models/notification.model';
import { formatTimeAgo } from '../../core/utils/time-ago';
import { ApiService } from '../../services/api.service';
import { resolveNotificationUserId } from '../../core/utils/resolve-notification-user-id';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-dropdown.component.html',
  styleUrl: './notification-dropdown.component.css'
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  @Output() viewAll = new EventEmitter<void>();

  private readonly notificationService = inject(NotificationService);
  private readonly apiService = inject(ApiService);
  private readonly elementRef = inject(ElementRef);

  isOpen = false;
  unreadCount = 0;
  notifications: AppNotification[] = [];
  loading = false;
  markingAll = false;
  filter: 'all' | 'unread' = 'all';

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.refreshUnreadCount();
    this.refreshTimer = setInterval(() => this.refreshUnreadCount(), 45000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer != null) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  get badgeLabel(): string {
    if (this.unreadCount > 99) return '99+';
    return String(this.unreadCount);
  }

  get hasUnread(): boolean {
    return this.unreadCount > 0;
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.refreshUnreadCount();
      this.loadNotifications();
    }
  }

  setFilter(filter: 'all' | 'unread', event: MouseEvent): void {
    event.stopPropagation();
    if (this.filter === filter) return;
    this.filter = filter;
    if (this.isOpen) {
      this.loadNotifications();
    }
  }

  close(): void {
    this.isOpen = false;
  }

  timeAgo(value: string): string {
    return formatTimeAgo(value);
  }

  onNotificationClick(notification: AppNotification, event: MouseEvent): void {
    event.stopPropagation();
    if (notification.isRead) return;

    const userId = this.resolveUserId();
    if (!userId) return;

    this.notificationService.markOneRead(userId, notification.id).subscribe({
      next: () => {
        notification.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      },
      error: () => {}
    });
  }

  markAllAsRead(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.hasUnread || this.markingAll) return;

    const userId = this.resolveUserId();
    if (!userId) return;

    this.markingAll = true;
    this.notificationService.markAllRead(userId).subscribe({
      next: () => {
        this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
        this.unreadCount = 0;
        this.markingAll = false;
      },
      error: () => {
        this.markingAll = false;
      }
    });
  }

  onViewAll(event: MouseEvent): void {
    event.stopPropagation();
    this.close();
    this.viewAll.emit();
  }

  refreshUnreadCount(): void {
    const userId = this.resolveUserId();
    if (!userId) return;

    this.notificationService.getUnreadCount(userId).subscribe({
      next: (count) => {
        this.unreadCount = count;
      },
      error: () => {}
    });
  }

  private loadNotifications(): void {
    const userId = this.resolveUserId();
    if (!userId) return;

    this.loading = true;
    this.notificationService.listLatest(userId, 10, this.filter === 'unread').subscribe({
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

  private resolveUserId(): string | null {
    return resolveNotificationUserId(this.apiService);
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.refreshUnreadCount();
    if (this.isOpen) {
      this.loadNotifications();
    }
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.refreshUnreadCount();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen) return;
    const target = event.target as Node | null;
    if (target && this.elementRef.nativeElement.contains(target)) return;
    const anchor = this.elementRef.nativeElement.closest('.notification-bell-anchor');
    if (anchor && target && anchor.contains(target)) return;
    this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}

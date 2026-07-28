import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewState } from '../types';
import { environment } from '../../environments/environment';
import { NotificationService } from '../services/notification.service';
import { ApiService } from '../services/api.service';
import { resolveNotificationUserId } from '../core/utils/resolve-notification-user-id';

@Component({
  selector: 'app-notification-settings',
  imports: [CommonModule],
  templateUrl: './notification-settings.component.html',
  styleUrl: './notification-settings.component.css'
})
export class NotificationSettingsComponent {
  @Output() viewChange = new EventEmitter<ViewState>();

  private readonly notificationService = inject(NotificationService);
  private readonly apiService = inject(ApiService);

  readonly showPushTest = !environment.production;
  pushTestLoading = false;
  pushTestMessage = '';

  // Notification Channels
  pushNotifications: boolean = true;
  emailNotifications: boolean = true;
  smsNotifications: boolean = false;

  // In-app Notifications
  newMatches: boolean = true;
  newMessages: boolean = true;
  profileViews: boolean = true;
  likes: boolean = false;

  togglePushNotifications() {
    this.pushNotifications = !this.pushNotifications;
  }

  toggleEmailNotifications() {
    this.emailNotifications = !this.emailNotifications;
  }

  toggleSmsNotifications() {
    this.smsNotifications = !this.smsNotifications;
  }

  toggleNewMatches() {
    this.newMatches = !this.newMatches;
  }

  toggleNewMessages() {
    this.newMessages = !this.newMessages;
  }

  toggleProfileViews() {
    this.profileViews = !this.profileViews;
  }

  toggleLikes() {
    this.likes = !this.likes;
  }

  goBack() {
    this.viewChange.emit('settings');
  }

  sendPushTest(): void {
    const userId = this.resolveUserId();
    if (!userId || this.pushTestLoading) return;

    this.pushTestLoading = true;
    this.pushTestMessage = '';
    this.notificationService
      .pushTest(userId, 'Test notification', 'This is a test notification from Rukmini Swayamvar.')
      .subscribe({
        next: () => {
          this.pushTestMessage = 'Test notification sent. Check your bell icon.';
          this.pushTestLoading = false;
        },
        error: () => {
          this.pushTestMessage = 'Could not send test notification. Try again.';
          this.pushTestLoading = false;
        }
      });
  }

  private resolveUserId(): string | null {
    return resolveNotificationUserId(this.apiService);
  }
}

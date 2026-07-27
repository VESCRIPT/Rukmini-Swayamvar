import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewState } from '../types';
import { ApiService } from '../services/api.service';
@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  @Output() viewChange = new EventEmitter<ViewState>();

  deleteNotifications: boolean = true;
  darkMode: boolean = false;
  showDeleteModal: boolean = false;
  deletePassword: string = '';
  showDeletePassword: boolean = false;
  deleteErrorMessage: string = '';
  isDeletingAccount: boolean = false;

  constructor(private apiService: ApiService) {}

  toggleDeleteNotifications() {
    this.deleteNotifications = !this.deleteNotifications;
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    // You can add logic here to apply dark mode to the entire app
  }

  navigateTo(view: ViewState) {
    this.viewChange.emit(view);
  }

  goBack() {
    this.viewChange.emit(this.apiService.isAuthenticated() ? 'dashboard' : 'login');
  }

  openDeleteModal() {
    this.showDeleteModal = true;
    this.deletePassword = '';
    this.showDeletePassword = false;
    this.deleteErrorMessage = '';
    this.isDeletingAccount = false;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.deleteErrorMessage = '';
    this.isDeletingAccount = false;
  }

  toggleDeletePasswordVisibility() {
    this.showDeletePassword = !this.showDeletePassword;
  }

  confirmDeleteAccount() {
    const password = this.deletePassword.trim();
    if (!password || this.isDeletingAccount) {
      return;
    }

    const userId = this.resolveUserId();
    if (!userId) {
      this.deleteErrorMessage = 'User session not found. Please login again.';
      return;
    }

    this.isDeletingAccount = true;
    this.deleteErrorMessage = '';

    this.apiService.deactivateAccount({ userId, password }).subscribe({
      next: (response: any) => {
        this.isDeletingAccount = false;
        const success = response?.success !== false;
        if (!success) {
          this.deleteErrorMessage = response?.message || 'Failed to delete account.';
          return;
        }

        this.apiService.logout();
        this.showDeleteModal = false;
        this.viewChange.emit('login');
      },
      error: (error: any) => {
        this.isDeletingAccount = false;
        this.deleteErrorMessage =
          error?.error?.message ||
          (error?.status === 401 ? 'Session expired. Please login again.' : 'Failed to delete account.');
      }
    });
  }

  private resolveUserId(): string | null {
    const profileUserId = localStorage.getItem('profile_user_id');
    if (profileUserId) return profileUserId;

    const storedUser = localStorage.getItem('user');
    if (!storedUser) return null;

    try {
      const user = JSON.parse(storedUser) as { id?: string | number; userId?: string | number; _id?: string | number };
      const userId = user.id || user.userId || user._id;
      return userId != null ? String(userId) : null;
    } catch {
      return null;
    }
  }

  logout() {
    // Add your logout logic here
    this.viewChange.emit('login');
  }
}

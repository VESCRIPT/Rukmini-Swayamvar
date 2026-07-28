import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewState } from '../types';
import { backToDashboardView } from '../core/constants/dashboard-sidebar-views';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.css']
})
export class EditProfileComponent implements OnInit {
  @Input() previousView: ViewState = 'dashboard';
  @Output() viewChange = new EventEmitter<ViewState>();
  @Output() stepSelected = new EventEmitter<number>();

  myProfileData: any = null;

  constructor(private apiService: ApiService) {}

  profileSteps = [
    { id: 1, label: 'Basic Info' },
    { id: 2, label: 'Contact & Location' },
    { id: 3, label: 'Education & Career' },
    { id: 4, label: 'Personal & Spiritual' },
    { id: 5, label: 'Family Information' },
    { id: 6, label: 'Interest' }
  ];

  activeStep = 0;

  ngOnInit(): void {
    const userId = this.resolveUserId();
    if (userId) {
      this.apiService.getMyProfileDetails(userId).subscribe({
        next: (res: any) => {
          const data =
            res?.data?.profile ||
            res?.data?.user ||
            res?.profile ||
            res?.user ||
            res?.data ||
            null;
          if (data && typeof data === 'object') {
            this.myProfileData = data;
            localStorage.setItem('my_profile_data', JSON.stringify(data));
            const accountId =
              res?.userId ??
              res?.data?.userId ??
              res?.user?.id ??
              data?.id ??
              data?.userId;
            const accountEmail = res?.user?.email ?? data?.email;
            if (accountId != null) {
              localStorage.setItem('profile_user_id', String(accountId));
            }
            if (accountEmail && String(accountEmail).trim()) {
              try {
                const stored = localStorage.getItem('user');
                const user = stored ? JSON.parse(stored) : {};
                user.email = String(accountEmail).trim();
                localStorage.setItem('user', JSON.stringify(user));
              } catch {
                // Non-critical
              }
            }
          }
        },
        error: () => {
          // Silently ignore — UI remains unchanged
        }
      });
    }
  }

  private resolveUserId(): string | null {
    const profileUserId = localStorage.getItem('profile_user_id');
    if (profileUserId) return profileUserId;
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return null;
    try {
      const user = JSON.parse(storedUser) as { id?: string | number; userId?: string | number; _id?: string | number };
      const userId = user.id || user.userId || user._id;
      return userId ? String(userId) : null;
    } catch { return null; }
  }

  onBack() {
    this.viewChange.emit(backToDashboardView());
  }

  selectStep(stepId: number) {
    this.activeStep = stepId;
    this.stepSelected.emit(stepId);
  }

  openPartnerPreferences() {
    this.viewChange.emit('partner-preferences');
  }
}

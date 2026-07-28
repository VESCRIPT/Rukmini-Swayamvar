import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewState } from '../types';
import { ApiService } from '../services/api.service';
import { normalizeProfileImageUrl } from '../core/utils/profile-image-url';

type ReportedBlockedTab = 'reported' | 'blocked' | 'my-account';
type MyAccountReportRow = {
  id: string;
  title: string;
  profileId: string;
  phone: string;
  status: string;
  reason: string;
  date: string;
  updatedAt: string;
};

@Component({
  selector: 'app-reported-blocked-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reported-blocked-users.component.html',
  styleUrl: './reported-blocked-users.component.css'
})
export class ReportedBlockedUsersComponent implements OnInit {
  @Output() viewChange = new EventEmitter<ViewState>();
  @Output() viewProfile = new EventEmitter<number>();
  activeTab: ReportedBlockedTab = 'reported';
  loadingReported = false;
  loadingBlocked = false;
  loadingAccount = false;
  unblockingUserId: string | null = null;

  reportedUsers: { userId: string; name: string; reason: string; date: string; status: string; photo: string; profileId: string; phone: string; updatedAt: string }[] = [];
  blockedUsers: { blockedUserId: string; name: string; reason: string; date: string; photo: string; profileId: string; phone: string; updatedAt: string }[] = [];
  accountWarnings: MyAccountReportRow[] = [];
  reportsAgainstMe: MyAccountReportRow[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadMyReports();
  }

  goBack(): void {
    this.viewChange.emit('settings');
  }

  switchTab(tab: ReportedBlockedTab): void {
    this.activeTab = tab;
    if (tab === 'reported') {
      this.loadMyReports();
    } else if (tab === 'blocked') {
      this.loadBlockedUsers();
    } else if (tab === 'my-account') {
      this.loadMyAccount();
    }
  }

  onViewProfile(userId: string | number): void {
    if (userId) {
      this.viewProfile.emit(Number(userId));
    }
  }

  private loadMyReports(): void {
    const userId = this.resolveCurrentUserId();
    if (!userId) {
      this.reportedUsers = [];
      return;
    }

    this.loadingReported = true;
    this.apiService.listMyReports(userId).subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.reportedUsers = rows.map((item: any) => {
          const u = item?.reportedUser || {};
          return {
            userId: String(u.id || item?.reportedUserId || ''),
            name: String(u.fullName || u.name || `User ${item?.reportedUserId || ''}`).trim(),
            reason: this.formatReason(item?.reason || item?.note),
            date: this.formatDate(item?.createdAt),
            status: this.formatStatus(item?.status),
            photo: this.resolveProfileImage(u),
            profileId: String(u.profileId || item?.reportedUserId || 'N/A'),
            phone: String(u.mobile || u.phone || u.phoneNo || 'N/A'),
            updatedAt: this.formatDate(item?.updatedAt)
          };
        });
        this.fetchRealPhotosForUsers(this.reportedUsers, (id, photo) => {
          const idx = this.reportedUsers.findIndex(u => u.userId === id);
          if (idx !== -1) {
            this.reportedUsers[idx].photo = photo;
          }
        });
        this.loadingReported = false;
      },
      error: () => {
        this.reportedUsers = [];
        this.loadingReported = false;
      }
    });
  }

  private loadBlockedUsers(): void {
    const userId = this.resolveCurrentUserId();
    if (!userId) {
      this.blockedUsers = [];
      return;
    }

    this.loadingBlocked = true;
    this.apiService.listBlockedUsers(userId).subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.blockedUsers = rows.map((item: any) => {
          const u = item?.blockedUser || {};
          const blockedUserId = String(item?.blockedUserId ?? u.id ?? '');
          return {
            blockedUserId,
            name: String(u.fullName || u.name || `User ${blockedUserId}`).trim(),
            reason: this.formatReason(item?.reason || item?.note),
            date: this.formatDate(item?.createdAt),
            photo: this.resolveProfileImage(u),
            profileId: String(u.profileId || blockedUserId || 'N/A'),
            phone: String(u.mobile || u.phone || u.phoneNo || 'N/A'),
            updatedAt: this.formatDate(item?.updatedAt)
          };
        });
        this.fetchRealPhotosForUsers(this.blockedUsers, (id, photo) => {
          const idx = this.blockedUsers.findIndex(u => u.blockedUserId === id);
          if (idx !== -1) {
            this.blockedUsers[idx].photo = photo;
          }
        });
        this.loadingBlocked = false;
      },
      error: () => {
        this.blockedUsers = [];
        this.loadingBlocked = false;
      }
    });
  }

  private loadMyAccount(): void {
    const userId = this.resolveCurrentUserId();
    if (!userId) {
      this.accountWarnings = [];
      this.reportsAgainstMe = [];
      return;
    }

    this.loadingAccount = true;
    this.apiService.listMyAccountReports(userId, 1, 20).subscribe({
      next: (res: any) => {
        const payload = res?.data ?? res ?? {};
        this.accountWarnings = this.mapMyAccountRows(payload?.warnings);
        this.reportsAgainstMe = this.mapMyAccountRows(payload?.reportsAgainstMe);
        this.loadingAccount = false;
      },
      error: () => {
        this.accountWarnings = [];
        this.reportsAgainstMe = [];
        this.loadingAccount = false;
      }
    });
  }

  private mapMyAccountRows(rows: any): MyAccountReportRow[] {
    if (!Array.isArray(rows)) return [];
    return rows.map((item: any, index: number) => {
      const reporter = item?.reporter || item?.reportedBy || item?.fromUser || item?.user || {};
      const rowId = String(item?.id ?? item?._id ?? item?.reportId ?? index + 1);
      const profileId = String(reporter?.profileId ?? item?.reporterId ?? item?.reportedById ?? item?.userId ?? 'N/A');
      return {
        id: rowId,
        title: String(item?.title || item?.type || reporter?.fullName || reporter?.name || `Report ${index + 1}`).trim(),
        profileId,
        phone: String(reporter?.mobile || reporter?.phone || reporter?.phoneNo || 'N/A'),
        status: this.formatStatus(item?.status),
        reason: this.formatReason(item?.reason || item?.note || item?.details || item?.message),
        date: this.formatDate(item?.createdAt),
        updatedAt: this.formatDate(item?.updatedAt)
      };
    });
  }

  private fetchRealPhotosForUsers(users: any[], updateMethod: (id: string, photo: string) => void): void {
    users.forEach((user) => {
      if (!user.photo || !user.photo.startsWith('http')) {
        const lookupId = user.userId || user.blockedUserId || user.profileId;
        if (!lookupId) return;
        
        this.apiService.getProfileDetails(lookupId).subscribe({
          next: (res: any) => {
            const data = res?.data?.profile ?? res?.data?.user ?? res?.profile ?? res?.user ?? res?.data ?? null;
            const photoUrl = this.resolveProfileImage(data);
            if (photoUrl) {
              updateMethod(user.userId || user.blockedUserId, photoUrl);
            }
          },
          error: () => {}
        });
      }
    });
  }

  unblockUser(user: { blockedUserId: string; name: string }): void {
    if (this.unblockingUserId || !user?.blockedUserId) {
      return;
    }

    const userId = this.resolveCurrentUserId();
    if (!userId) {
      window.alert('Please login again to unblock user.');
      return;
    }

    this.unblockingUserId = user.blockedUserId;
    this.apiService.unblockUser({ userId, blockedUserId: user.blockedUserId }).subscribe({
      next: (res: any) => {
        this.unblockingUserId = null;
        this.blockedUsers = this.blockedUsers.filter(u => u.blockedUserId !== user.blockedUserId);
        window.alert(res?.message || `${user.name} unblocked successfully.`);
      },
      error: (err: any) => {
        this.unblockingUserId = null;
        const apiMessage = err?.error?.message || err?.error?.error;
        window.alert(apiMessage || 'Unable to unblock user. Please try again.');
      }
    });
  }

  private resolveCurrentUserId(): string | null {
    const profileUserId = localStorage.getItem('profile_user_id');
    if (profileUserId) return profileUserId;

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const uid = user?.id ?? user?.userId ?? user?._id;
      return uid != null ? String(uid) : null;
    } catch {
      return null;
    }
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private resolveProfileImage(itemOrProfile: any): string {
    const fallback = '';
    const stripProfileSuffix = (u: string) => u.replace(/(\.(?:jpg|jpeg|png|webp))\.profile(\b|$)/i, '$1$2');
    const toAbsolute = (url: string): string => {
      if (!url || typeof url !== 'string') return '';
      let trimmed = String(url).trim();
      if (!trimmed) return '';
      trimmed = stripProfileSuffix(trimmed);
      if (trimmed.startsWith('data:') || trimmed.startsWith('http') || trimmed.startsWith('//')) return normalizeProfileImageUrl(trimmed);
      if (trimmed.startsWith('/')) return normalizeProfileImageUrl('https://vescript.vescript.com' + trimmed);
      return normalizeProfileImageUrl('https://vescript.vescript.com/' + trimmed);
    };
    const isValidUrl = (s: string): boolean => s.length > 0 && (s.startsWith('http') || s.startsWith('data:') || s.startsWith('/'));
    const extractUrl = (val: any): string => {
      if (typeof val === 'string' && val.trim()) {
        const first = val.split(',')[0].trim();
        const out = toAbsolute(first);
        return isValidUrl(out) ? out : '';
      }
      if (val && typeof val === 'object') {
        const raw = val.url || val.path || val.src || val.image || val.uri || val.imageUrl || val.photoUrl || '';
        const out = toAbsolute(raw);
        return isValidUrl(out) ? out : '';
      }
      return '';
    };
    const sources = [itemOrProfile, itemOrProfile?.profile].filter(Boolean);
    const directFields = ['firstPhotoUrl', 'first_photo_url', 'avatar', 'profilePicture', 'profilePhoto', 'photo', 'image', 'picture', 'imageUrl', 'photoUrl', 'profile_image', 'profileImage'];
    for (const src of sources) {
      for (const field of directFields) {
        const url = extractUrl(src?.[field]);
        if (url) return url;
      }
      for (const field of ['profilePhotos', 'profile_photos', 'photos', 'images', 'gallery']) {
        const arr = src?.[field];
        if (Array.isArray(arr) && arr.length > 0) {
          const url = extractUrl(arr[0]);
          if (url) return url;
        }
      }
    }
    return fallback;
  }

  private formatReason(reason: string | null | undefined): string {
    if (!reason) return 'Not specified';
    return reason.replace(/_/g, ' ').toLowerCase();
  }

  private formatStatus(status: string | null | undefined): string {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'pending') return 'Pending review';
    if (!normalized) return 'Unknown';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
}

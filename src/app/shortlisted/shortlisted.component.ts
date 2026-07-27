import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewState } from '../types';
import { ApiService } from '../services/api.service';
import { normalizeProfileImageUrl } from '../core/utils/profile-image-url';

interface ShortlistedProfile {
  id: number;
  photoLookupId?: string;
  name: string;
  age: number;
  religion: string;
  location: string;
  profession: string;
  income: string;
  avatar: string;
  isMutual: boolean;
  matchScore: number;
}

@Component({
  selector: 'app-shortlisted',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shortlisted.component.html',
  styleUrls: ['./shortlisted.component.css']
})
export class ShortlistedComponent implements OnInit {
  @Input() t: any;
  @Output() viewChange = new EventEmitter<ViewState>();
  @Output() viewProfile = new EventEmitter<number>();
  @Output() openChat = new EventEmitter<number>();

  private currentUserId: string | null = null;
  private fallbackAvatarUrl = '';
  private failedAvatarIds: number[] = [];
  private allUsersPhotoMap: Record<string, string> = {};

  shortlistedProfiles: ShortlistedProfile[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.currentUserId = this.resolveUserId();
    if (!this.currentUserId) {
      return;
    }
    this.preloadAllUsersPhotoMap(this.currentUserId);
    this.loadShortlist(this.currentUserId);
  }

  onBack() {
    this.viewChange.emit('dashboard');
  }

  viewProfileDetail(profileId: number) {
    this.viewProfile.emit(profileId);
    this.viewChange.emit('profile-detail');
  }

  messageMember(profileId: number) {
    this.openChat.emit(profileId);
  }

  callMember(profileId: number) {
    console.log('Calling member:', profileId);
  }

  private loadShortlist(userId: string): void {
    this.apiService.listMyShortlist(userId, 1, 50).subscribe({
      next: (response) => {
        const list = this.extractShortlistList(response);
        this.shortlistedProfiles = list.map((item, index) => this.mapShortlistFromApi(item, index));
        this.applyPhotoMapToProfiles(this.shortlistedProfiles);
        this.fetchRealPhotosForProfiles(this.shortlistedProfiles);
      },
      error: (error) => {
        console.error('List shortlist error:', error);
        this.shortlistedProfiles = [];
      }
    });
  }

  private extractShortlistList(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.data?.list)) {
      return response.data.list;
    }
    if (Array.isArray(response?.data?.items)) {
      return response.data.items;
    }
    if (Array.isArray(response?.data?.results)) {
      return response.data.results;
    }
    if (Array.isArray(response?.data?.shortlist)) {
      return response.data.shortlist;
    }
    if (Array.isArray(response?.shortlist)) {
      return response.shortlist;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    return [];
  }

  private mapShortlistFromApi(item: any, index: number): ShortlistedProfile {
    const fallbackId = 2000 + index;
    const rawId = item?.profileId || item?.profile?.id || item?.profile?.userId || item?.profile?._id || item?.userId || item?.id || item?._id;
    const numericId = Number(rawId);
    const lookupId = rawId != null ? String(rawId) : '';
    const profile = item?.profile || item;

    return {
      id: Number.isFinite(numericId) ? numericId : fallbackId,
      photoLookupId: lookupId || String(Number.isFinite(numericId) ? numericId : fallbackId),
      name: profile?.name || profile?.fullName || `Profile ${index + 1}`,
      age: Number(profile?.age) || 0,
      religion: profile?.religion || 'N/A',
      location: profile?.location || profile?.city || profile?.state || 'N/A',
      profession: profile?.profession || profile?.occupation || 'N/A',
      income: profile?.income || profile?.annualIncome || 'N/A',
      avatar: this.resolveAvatar(item),
      isMutual: Boolean(profile?.isMutual || item?.isMutual),
      matchScore: Number(profile?.matchScore || item?.matchScore) || 0
    };
  }

  private resolveAvatar(itemOrProfile: any): string {
    const stripProfileSuffix = (u: string) => u.replace(/(\.(?:jpg|jpeg|png|webp))\.profile(\b|$)/i, '$1$2');
    const toAbsolute = (url: string): string => {
      if (!url || typeof url !== 'string') {
        return '';
      }
      const trimmed = stripProfileSuffix(url.trim());
      if (!trimmed) {
        return '';
      }
      if (trimmed.startsWith('http') || trimmed.startsWith('//') || trimmed.startsWith('data:')) {
        return normalizeProfileImageUrl(trimmed);
      }
      if (trimmed.startsWith('/')) {
        return normalizeProfileImageUrl('https://vescript.vescript.com' + trimmed);
      }
      return normalizeProfileImageUrl('https://vescript.vescript.com/' + trimmed);
    };

    const extractUrl = (val: any): string => {
      if (typeof val === 'string' && val.trim()) {
        return toAbsolute(val.split(',')[0].trim());
      }
      if (val && typeof val === 'object') {
        const raw = val.url || val.path || val.src || val.image || val.uri || val.imageUrl || val.photoUrl || '';
        return toAbsolute(raw);
      }
      return '';
    };

    const sources = [itemOrProfile, itemOrProfile?.profile].filter(Boolean);
    const directFields = [
      'firstPhotoUrl',
      'first_photo_url',
      'avatar',
      'profilePicture',
      'profilePhoto',
      'photo',
      'image',
      'picture',
      'imageUrl',
      'photoUrl',
      'profile_image',
      'profileImage'
    ];

    for (const src of sources) {
      for (const field of directFields) {
        const url = extractUrl(src?.[field]);
        if (url) {
          return url;
        }
      }

      for (const field of ['profilePhotos', 'profile_photos', 'photos', 'images', 'gallery']) {
        const arr = src?.[field];
        if (Array.isArray(arr) && arr.length > 0) {
          const url = extractUrl(arr[0]);
          if (url) {
            return url;
          }
        }
      }
    }

    return this.fallbackAvatarUrl;
  }

  private fetchRealPhotosForProfiles(profiles: ShortlistedProfile[]): void {
    profiles.forEach((profile) => {
      if (!profile.avatar || profile.avatar === this.fallbackAvatarUrl || !profile.avatar.startsWith('http')) {
        this.apiService.getProfileDetails(String(profile.id)).subscribe({
          next: (res: any) => {
            const data = res?.data?.profile ?? res?.data?.user ?? res?.profile ?? res?.user ?? res?.data ?? null;
            const photoUrl = this.extractPhotoUrlFromProfile(data);
            if (photoUrl) {
              this.setProfileAvatar(profile.id, photoUrl);
            }
          },
          error: () => {}
        });
      }
    });
  }

  private extractPhotoUrlFromProfile(data: any): string | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const toAbsolute = (u: string) => {
      if (!u || typeof u !== 'string') {
        return '';
      }
      const t = u.trim();
      if (!t) {
        return '';
      }
      if (t.startsWith('http') || t.startsWith('//') || t.startsWith('data:')) {
        return normalizeProfileImageUrl(t);
      }
      return normalizeProfileImageUrl('https://vescript.vescript.com' + (t.startsWith('/') ? '' : '/') + t);
    };

    const raw = data.firstPhotoUrl ?? data.first_photo_url ?? data.profilePicture ?? data.profile_picture
      ?? data.avatar ?? data.photo ?? data.image ?? data.profilePhoto ?? data.imageUrl ?? data.photoUrl;

    if (typeof raw === 'string' && raw.trim()) {
      return toAbsolute(raw);
    }

    if (Array.isArray(data.profilePhotos) && data.profilePhotos[0]) {
      const u = typeof data.profilePhotos[0] === 'string' ? data.profilePhotos[0] : data.profilePhotos[0]?.url;
      if (u) {
        return toAbsolute(u);
      }
    }

    if (Array.isArray(data.photos) && data.photos[0]) {
      const u = typeof data.photos[0] === 'string' ? data.photos[0] : data.photos[0]?.url;
      if (u) {
        return toAbsolute(u);
      }
    }

    return null;
  }

  private setProfileAvatar(profileId: number, avatarUrl: string): void {
    const index = this.shortlistedProfiles.findIndex((p) => p.id === profileId);
    if (index === -1) {
      return;
    }
    this.shortlistedProfiles = this.shortlistedProfiles.slice(0);
    this.shortlistedProfiles[index] = { ...this.shortlistedProfiles[index], avatar: avatarUrl };
    this.failedAvatarIds = this.failedAvatarIds.filter((id) => id !== profileId);
  }

  private preloadAllUsersPhotoMap(userId: string): void {
    this.apiService.listAllUsers({ userId }).subscribe({
      next: (response) => {
        const users = this.extractUsersList(response);
        if (!users.length) {
          return;
        }

        const nextMap: Record<string, string> = {};
        users.forEach((item: any) => {
          const keyRaw = item?.id ?? item?.userId ?? item?._id ?? item?.profile?.id ?? item?.profile?.userId ?? item?.profile?._id;
          if (keyRaw == null) {
            return;
          }
          const key = String(keyRaw);
          const photo = this.resolveAvatar(item);
          if (photo && photo !== this.fallbackAvatarUrl) {
            nextMap[key] = photo;
          }
        });

        this.allUsersPhotoMap = nextMap;
        this.applyPhotoMapToProfiles(this.shortlistedProfiles);
      },
      error: () => {}
    });
  }

  private applyPhotoMapToProfiles(profiles: ShortlistedProfile[]): void {
    if (!profiles.length) {
      return;
    }

    profiles.forEach((profile) => {
      const lookupKey = profile.photoLookupId || String(profile.id);
      const mapped = this.allUsersPhotoMap[lookupKey] || this.allUsersPhotoMap[String(profile.id)];
      if (mapped && mapped !== profile.avatar) {
        this.setProfileAvatar(profile.id, mapped);
      }
    });
  }

  private extractUsersList(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.data?.list)) {
      return response.data.list;
    }
    if (Array.isArray(response?.data?.items)) {
      return response.data.items;
    }
    if (Array.isArray(response?.data?.results)) {
      return response.data.results;
    }
    if (Array.isArray(response?.data?.users)) {
      return response.data.users;
    }
    if (Array.isArray(response?.users)) {
      return response.users;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    return [];
  }

  markAvatarFailed(profileId: number): void {
    if (!this.failedAvatarIds.includes(profileId)) {
      this.failedAvatarIds = [...this.failedAvatarIds, profileId];
    }
  }

  showProfileIcon(profile: ShortlistedProfile): boolean {
    return !profile.avatar || this.failedAvatarIds.includes(profile.id);
  }

  private resolveUserId(): string | null {
    const profileUserId = localStorage.getItem('profile_user_id');
    if (profileUserId) {
      return profileUserId;
    }

    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      return null;
    }

    try {
      const user = JSON.parse(storedUser) as { id?: string | number; userId?: string | number; _id?: string | number };
      const userId = user.id || user.userId || user._id;
      return userId ? String(userId) : null;
    } catch {
      return null;
    }
  }
}

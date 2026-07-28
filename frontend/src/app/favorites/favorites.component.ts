import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewState, Language } from '../types';
import { ApiService } from '../services/api.service';
import { normalizeProfileImageUrl } from '../core/utils/profile-image-url';

interface FavoriteProfile {
  id: number;
  photoLookupId?: string;
  name: string;
  age: number;
  religion: string;
  location: string;
  profession: string;
  avatar: string;
  isFavorite: boolean;
}

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css']
})
export class FavoritesComponent implements OnInit {
  @Input() t: any;
  @Output() viewChange = new EventEmitter<ViewState>();
  @Output() viewProfile = new EventEmitter<number>();
  @Output() openChat = new EventEmitter<number>();

  private currentUserId: string | null = null;
  private allUsersPhotoMap: Record<string, string> = {};

  activeTab = 'favorite';
  sidebarOpen = false;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  /** When profile image fails to load or no photo, we show a profile icon instead of placeholder image. */
  fallbackAvatarUrl = '';

  /** Profile IDs for which the avatar image failed to load – show icon instead. */
  failedAvatarIds: number[] = [];

  tabs = [
    { id: 'favorite', label: 'Favorite' },
    { id: 'shortlisted', label: 'Shortlisted' }
  ];

  favoriteProfiles: FavoriteProfile[] = [];

  shortlistedProfiles: FavoriteProfile[] = [];

  newestProfiles: FavoriteProfile[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.currentUserId = this.resolveUserId();
    if (this.currentUserId) {
      this.preloadAllUsersPhotoMap(this.currentUserId);
      this.loadFavorites(this.currentUserId);
      this.loadShortlist(this.currentUserId);
    }
  }

  get currentNewestProfiles(): FavoriteProfile[] {
    switch (this.activeTab) {
      case 'shortlisted':
        return [
          {
            id: 14,
            name: 'Kavya Reddy',
            age: 29,
            religion: 'Hindu',
            location: 'Hyderabad',
            profession: 'Teacher',
            avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
            isFavorite: true
          }
        ];
      case 'favorite':
      default:
        return this.newestProfiles;
    }
  }

  onBack() {
    this.viewChange.emit('dashboard');
  }

  setView(view: ViewState) {
    this.viewChange.emit(view);
  }

  setTab(tab: string) {
    this.activeTab = tab;

    if (tab === 'shortlisted') {
      const userId = this.currentUserId || this.resolveUserId();
      if (!userId) {
        return;
      }

      this.currentUserId = userId;
      this.loadShortlist(userId);
    }
  }

  viewProfileDetail(profileId: number) {
    this.viewProfile.emit(profileId);
    this.viewChange.emit('profile-detail');
  }

  callMember(profileId: number) {
    console.log('Calling member:', profileId);
  }

  messageMember(profileId: number) {
    console.log('Messaging member:', profileId);
    this.openChat.emit(profileId);
  }

  toggleFavorite(profileId: number) {
    const userId = this.currentUserId || this.resolveUserId();
    const profile = this.findProfileById(profileId);
    if (!profile) {
      return;
    }

    if (!userId) {
      return;
    }

    this.currentUserId = userId;

    const nextState = !profile.isFavorite;
    profile.isFavorite = nextState;

    const payload = {
      userId,
      profileId: String(profileId)
    };

    if (!nextState && this.activeTab === 'shortlisted') {
      this.apiService.removeFromShortlist(payload).subscribe({
        next: (response) => {
          const isSuccess = response?.success === true || response?.status === 'success' || !!response?.message;
          if (!isSuccess) {
            profile.isFavorite = true;
            return;
          }
          this.removeProfileFromShortlist(profileId);
        },
        error: (error) => {
          profile.isFavorite = true;
          console.error('Remove from shortlist error:', error);
        }
      });
      return;
    }

    // Backend currently exposes add endpoint. When un-favoriting, keep local state only.
    if (!nextState) {
      return;
    }

    const request$ = this.activeTab === 'shortlisted'
      ? this.apiService.addToShortlist(payload)
      : this.apiService.addToFavorites(payload);

    request$.subscribe({
      next: (response) => {
        const isSuccess = response?.success === true || response?.status === 'success' || !!response?.message;
        if (!isSuccess) {
          profile.isFavorite = false;
          return;
        }

        if (this.activeTab === 'shortlisted') {
          this.ensureProfileExistsInShortlist(profile);
          return;
        }

        this.ensureProfileExistsInFavorites(profile);
      },
      error: (error) => {
        profile.isFavorite = false;
        console.error('Add item error:', error);
      }
    });
  }

  private loadFavorites(userId: string): void {
    this.apiService.listMyFavorites(userId, 1, 20).subscribe({
      next: (response) => {
        const list = this.extractFavoriteList(response);
        if (list.length === 0) {
          return;
        }

        this.favoriteProfiles = list.map((item, index) => this.mapFavoriteFromApi(item, index));
        this.applyPhotoMapToProfiles(this.favoriteProfiles);
        this.fetchRealPhotosForProfiles(this.favoriteProfiles);
      },
      error: (error) => {
        console.error('List favorites error:', error);
      }
    });
  }

  private loadShortlist(userId: string): void {
    this.apiService.listMyShortlist(userId, 1, 20).subscribe({
      next: (response) => {
        const list = this.extractShortlistList(response);
        if (list.length === 0) {
          return;
        }

        this.shortlistedProfiles = list.map((item, index) => this.mapFavoriteFromApi(item, index));
        this.applyPhotoMapToProfiles(this.shortlistedProfiles);
        this.fetchRealPhotosForProfiles(this.shortlistedProfiles);
      },
      error: (error) => {
        console.error('List shortlist error:', error);
      }
    });
  }

  /** When list API doesn't return photos, fetch each profile's details to get real photo. */
  private fetchRealPhotosForProfiles(profiles: FavoriteProfile[]): void {
    const fallback = this.fallbackAvatarUrl;
    profiles.forEach((profile) => {
      if (profile.avatar === fallback || !profile.avatar || !profile.avatar.startsWith('http')) {
        const lookupId = profile.photoLookupId || String(profile.id);
        this.apiService.getProfileDetails(lookupId).subscribe({
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
    if (!data || typeof data !== 'object') return null;
    const stripProfileSuffix = (u: string) => u.replace(/(\.(?:jpg|jpeg|png|webp))\.profile(\b|$)/i, '$1$2');
    const toAbsolute = (u: string) => {
      if (!u || typeof u !== 'string') return '';
      const t = stripProfileSuffix(u.trim());
      if (!t) return '';
      if (t.startsWith('http') || t.startsWith('//') || t.startsWith('data:')) return normalizeProfileImageUrl(t);
      return normalizeProfileImageUrl('https://vescript.vescript.com' + (t.startsWith('/') ? '' : '/') + t);
    };
    const raw = data.firstPhotoUrl ?? data.first_photo_url ?? data.profilePicture ?? data.profile_picture
      ?? data.avatar ?? data.photo ?? data.image ?? data.profilePhoto ?? data.imageUrl ?? data.photoUrl
      ?? data.picture ?? data.profile_image ?? data.profileImage;
    if (typeof raw === 'string' && raw.trim()) return toAbsolute(raw);
    if (Array.isArray(data.profilePhotos) && data.profilePhotos[0]) {
      const u = typeof data.profilePhotos[0] === 'string' ? data.profilePhotos[0] : data.profilePhotos[0]?.url;
      if (u) return toAbsolute(u);
    }
    if (Array.isArray(data.photos) && data.photos[0]) {
      const u = typeof data.photos[0] === 'string' ? data.photos[0] : data.photos[0]?.url;
      if (u) return toAbsolute(u);
    }
    return null;
  }

  private setProfileAvatar(profileId: number, avatarUrl: string): void {
    const i = this.favoriteProfiles.findIndex((p) => p.id === profileId);
    if (i !== -1) {
      this.favoriteProfiles = this.favoriteProfiles.slice(0);
      this.favoriteProfiles[i] = { ...this.favoriteProfiles[i], avatar: avatarUrl };
    }
    const j = this.shortlistedProfiles.findIndex((p) => p.id === profileId);
    if (j !== -1) {
      this.shortlistedProfiles = this.shortlistedProfiles.slice(0);
      this.shortlistedProfiles[j] = { ...this.shortlistedProfiles[j], avatar: avatarUrl };
    }
    this.failedAvatarIds = this.failedAvatarIds.filter(id => id !== profileId);
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
        this.applyPhotoMapToProfiles(this.favoriteProfiles);
        this.applyPhotoMapToProfiles(this.shortlistedProfiles);
      },
      error: () => {}
    });
  }

  private applyPhotoMapToProfiles(profiles: FavoriteProfile[]): void {
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

  private findProfileById(profileId: number): FavoriteProfile | undefined {
    return this.favoriteProfiles.find(p => p.id === profileId)
      || this.shortlistedProfiles.find(p => p.id === profileId)
      || this.newestProfiles.find(p => p.id === profileId);
  }

  private ensureProfileExistsInFavorites(profile: FavoriteProfile): void {
    const exists = this.favoriteProfiles.some(p => p.id === profile.id);
    if (!exists) {
      this.favoriteProfiles = [
        { ...profile, isFavorite: true },
        ...this.favoriteProfiles
      ];
    }
  }

  private ensureProfileExistsInShortlist(profile: FavoriteProfile): void {
    const exists = this.shortlistedProfiles.some(p => p.id === profile.id);
    if (!exists) {
      this.shortlistedProfiles = [
        { ...profile, isFavorite: true },
        ...this.shortlistedProfiles
      ];
    }
  }

  private removeProfileFromShortlist(profileId: number): void {
    this.shortlistedProfiles = this.shortlistedProfiles.filter(p => p.id !== profileId);
  }

  private extractFavoriteList(response: any): any[] {
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
    if (Array.isArray(response?.data?.favorites)) {
      return response.data.favorites;
    }
    if (Array.isArray(response?.favorites)) {
      return response.favorites;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    return [];
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

  private mapFavoriteFromApi(item: any, index: number): FavoriteProfile {
    const fallbackId = 1000 + index;
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
      avatar: this.resolveAvatar(item),
      isFavorite: true
    };
  }

  private resolveAvatar(itemOrProfile: any): string {
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

  /** Call when avatar img fails to load so we show profile icon instead. */
  markAvatarFailed(profileId: number): void {
    if (!this.failedAvatarIds.includes(profileId)) {
      this.failedAvatarIds = [...this.failedAvatarIds, profileId];
    }
  }

  showProfileIcon(profile: FavoriteProfile): boolean {
    return !profile.avatar ||
      profile.avatar === this.fallbackAvatarUrl ||
      this.failedAvatarIds.includes(profile.id);
  }

  get currentProfiles(): FavoriteProfile[] {
    switch (this.activeTab) {
      case 'shortlisted':
        return this.shortlistedProfiles;
      case 'favorite':
      default:
        return this.favoriteProfiles;
    }
  }
}
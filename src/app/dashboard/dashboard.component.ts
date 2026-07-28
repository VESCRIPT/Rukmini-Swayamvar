import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewState } from '../app.component';
import { ApiService } from '../services/api.service';
import { MatchmakingService } from '../services/matchmaking.service';
import { MatchExplain, ScoredMatchItem } from '../models/matchmaking.models';
import { extractMediaUrl, normalizeProfileImageUrl } from '../core/utils/profile-image-url';
import { NotificationDropdownComponent } from '../shared/notification-dropdown/notification-dropdown.component';

interface MemberProfile {
  id: number;
  name: string;
  height: string;
  location: string;
  religion: string;
  profession: string;
  income: string;
  bio: string;
  /** Profile photo URL. Empty string = user has not uploaded a photo; show placeholder icon. */
  image: string;
  rating: number;
  isActive: boolean;
  category: string[];
  matchPercent?: number;
  matchTier?: string;
  explainHeadline?: string;
  explain?: MatchExplain;
  isVerified?: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationDropdownComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  @Input() t: any;
  @Input() previousView: string = '';
  @Output() viewChange = new EventEmitter<ViewState>();
  @Output() viewProfile = new EventEmitter<number>();
  @Output() openChat = new EventEmitter<number | { otherUserId: number; name: string; avatar: string }>();

  activeFilter = 'All';
  username = 'Sam';
  /** Logged-in user's profile photo URL (sidebar & header). Null = show placeholder icon. */
  currentUserPhotoUrl: string | null = null;
  profileMenuOpen = false;
  isSearchOpen = false;
  searchQuery = '';
  activeSidebarItem: string = 'dashboard';
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  filters = ['Best Matches', 'Near Matches', 'All'];

  isLoadingProfiles = false;
  profilesLoadMessage = '';

  /** Profile IDs in Favorite section (heart filled pink when in this set). */
  favoritedProfileIds: number[] = [];
  /** Profile IDs in Shortlisted section (star filled golden when in this set). */
  shortlistedProfileIds: number[] = [];
  /** Connection request already sent (Pending). */
  pendingConnectionIds: number[] = [];
  /** Already accepted connections. */
  connectedProfileIds: number[] = [];
  /** In-flight connect requests. */
  connectingIds: number[] = [];
  connectionToastVisible = false;
  private connectionToastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private apiService: ApiService,
    private matchmaking: MatchmakingService
  ) { }

  ngOnInit() {
    const user = this.apiService.getUser();
    if (user) {
      const firstName = user.firstName || (user.name && (user.name + '').trim().split(/\s+/)[0]);
      const raw = (firstName && firstName.trim()) ? firstName.trim() : '';
      if (raw) {
        this.username = raw.charAt(0).toUpperCase() + raw.slice(1);
      }
    }

    const sidebarViews = [
      'profile-form',
      'edit-profile',
      'partner-preferences',
      'shortlisted',
      'my-connections',
      'favorites',
      'profile-views',
      'photo-gallery',
      'marriage-profile-maker',
      'community',
      'community-events',
      'event-detail',
      'teachings',
      'teaching-article'
    ];

    if (sidebarViews.includes(this.previousView)) {
      this.profileMenuOpen = true;
      this.activeSidebarItem = this.previousView;
    }

    const currentUserId = this.resolveUserId();
    if (currentUserId) {
      const initialFilter = sessionStorage.getItem('dashboard_initial_filter');
      sessionStorage.removeItem('dashboard_initial_filter');

      if (initialFilter === 'Best Matches') {
        this.activeFilter = 'Best Matches';
        this.loadBestMatches(currentUserId);
      } else if (initialFilter === 'Near Matches') {
        this.activeFilter = 'Near Matches';
        this.loadNearMatchProfiles(currentUserId);
      } else {
        this.activeFilter = 'All';
        this.loadAllUsers(currentUserId);
      }

      this.loadMyProfileForUsername(currentUserId);
      this.loadInitialFavoriteAndShortlistIds(currentUserId);
      this.hydrateConnectionStates();
    }
    // Show photo from cache immediately (e.g. after edit profile / photo upload)
    const cached = localStorage.getItem('my_profile_data');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        const photoUrl = this.getCurrentUserPhotoUrl(data);
        if (photoUrl) this.currentUserPhotoUrl = photoUrl;
      } catch (_) {}
    }
  }

  private loadMyProfileForUsername(userId: string): void {
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
          const name = data.name || data.full_name || data.fullName || data.firstName || data.first_name;
          if (name) {
            const first = (name + '').trim().split(/\s+/)[0];
            this.username = first ? first.charAt(0).toUpperCase() + first.slice(1) : this.username;
          }
          const photoUrl = this.getCurrentUserPhotoUrl(data);
          this.currentUserPhotoUrl = photoUrl || null;
          localStorage.setItem('my_profile_data', JSON.stringify(data));
        }
        this.loadCurrentUserPhotoFromListApi(userId);
      },
      error: () => {
        this.loadCurrentUserPhotoFromListApi(userId);
      }
    });
  }

  /** Set header/sidebar avatar from List My Photos API (first photo by sortOrder). */
  private loadCurrentUserPhotoFromListApi(userId: string): void {
    this.apiService.listMyPhotos(userId).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.photos) && res.photos.length > 0) {
          const preferredUrl = localStorage.getItem('primary_profile_photo_url');
          if (preferredUrl) {
            const preferred = res.photos.find((photo: any) => {
              const url = typeof photo === 'string' ? photo : photo?.url ?? photo?.imageUrl ?? photo?.path;
              return url && normalizeProfileImageUrl(url) === preferredUrl;
            });
            if (preferred) {
              const preferredUrlValue = typeof preferred === 'string' ? preferred : (preferred as any)?.url ?? (preferred as any)?.imageUrl ?? (preferred as any)?.path;
              if (preferredUrlValue) {
                this.currentUserPhotoUrl = normalizeProfileImageUrl(preferredUrlValue);
                return;
              }
            }
          }

          const sorted = [...res.photos].sort((a, b) => ((a as any)?.sortOrder ?? 0) - ((b as any)?.sortOrder ?? 0));
          const first = sorted[0];
          const url = typeof first === 'string' ? first : (first as any)?.url;
          if (url) this.currentUserPhotoUrl = normalizeProfileImageUrl(url);
        }
      },
      error: () => {}
    });
  }

  toggleProfileMenu() {
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  toggleSearch() {
    this.isSearchOpen = !this.isSearchOpen;
    if (!this.isSearchOpen) {
      this.searchQuery = '';
      this.currentPage = 1;
      this.updatePaginationState();
    }
  }

  onSearch() {
    this.currentPage = 1;
    console.log('Searching for:', this.searchQuery);
  }

  allProfiles: MemberProfile[] = [];

  get filteredProfiles(): MemberProfile[] {
    const filterQuery = this.searchQuery.trim().toLowerCase();
    const baseProfiles = this.activeFilter === 'All'
      ? this.allProfiles
      : this.allProfiles.filter(profile => profile.category.includes(this.activeFilter));

    if (!filterQuery) {
      return baseProfiles;
    }

    return baseProfiles.filter(profile => this.matchesSearchQuery(profile, filterQuery));
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
    this.currentPage = 1;
    const userId = this.resolveUserId();
    if (!userId) {
      this.updatePaginationState();
      return;
    }
    if (filter === 'Best Matches') {
      this.loadBestMatches(userId);
    } else if (filter === 'Near Matches') {
      this.loadNearMatchProfiles(userId);
    } else if (filter === 'All') {
      this.loadAllUsers(userId);
    } else {
      this.updatePaginationState();
    }
  }

  private matchesSearchQuery(profile: MemberProfile, filterQuery: string): boolean {
    const searchableFields = [
      profile.name,
      profile.location,
      profile.religion,
      profile.profession,
      profile.income,
      profile.bio,
      profile.height,
      ...(profile.category || [])
    ];

    return searchableFields.some(field => String(field || '').toLowerCase().includes(filterQuery));
  }

  navigateToSettings() {
    this.viewChange.emit('settings');
  }

  get memberProfiles(): MemberProfile[] {
    return this.getPaginatedProfiles();
  }

  get pageNumbers(): number[] {
    this.updatePaginationState();
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  onSearchQueryChange(): void {
    this.currentPage = 1;
    this.updatePaginationState();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  private getPaginatedProfiles(): MemberProfile[] {
    this.updatePaginationState();
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredProfiles.slice(startIndex, endIndex);
  }

  private updatePaginationState(): void {
    const filteredCount = this.filteredProfiles.length;
    this.totalPages = Math.max(1, Math.ceil(filteredCount / this.itemsPerPage));

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
  }

  onLogout() {
    this.viewChange.emit('home');
  }

  viewFullProfile(member: MemberProfile) {
    const memberId = typeof member === 'number' ? member : member.id;
    if (typeof member !== 'number' && member.explain) {
      try {
        sessionStorage.setItem(`match_explain_${memberId}`, JSON.stringify(member.explain));
      } catch { /* ignore quota */ }
    }
    this.viewProfile.emit(memberId);
    this.setView('profile-detail');
  }

  callMember(memberId: number) {
    console.log('Calling member:', memberId);
  }

  setView(view: ViewState) {
    this.viewChange.emit(view);
  }

  messageMember(member: MemberProfile) {
    this.openChat.emit({ otherUserId: member.id, name: member.name, avatar: member.image });
  }

  isFavorited(profileId: number): boolean {
    return this.favoritedProfileIds.includes(profileId);
  }

  isShortlisted(profileId: number): boolean {
    return this.shortlistedProfileIds.includes(profileId);
  }

  isConnectionPending(profileId: number): boolean {
    return this.pendingConnectionIds.includes(profileId);
  }

  isConnected(profileId: number): boolean {
    return this.connectedProfileIds.includes(profileId);
  }

  isConnecting(profileId: number): boolean {
    return this.connectingIds.includes(profileId);
  }

  private hydrateConnectionStates(): void {
    const tracked = this.apiService.getTrackedSentConnections();
    const pendingIds = tracked
      .map((item) => Number(item.otherUserId))
      .filter((id) => Number.isFinite(id));
    if (pendingIds.length) {
      this.pendingConnectionIds = Array.from(new Set([...this.pendingConnectionIds, ...pendingIds]));
    }
  }

  /** Connect button → Pending + toast "Connection request sent". */
  connectMember(member: MemberProfile): void {
    const userId = this.apiService.getAccountUserId() || this.resolveUserId();
    if (!userId || this.isConnectionPending(member.id) || this.isConnected(member.id) || this.isConnecting(member.id)) {
      return;
    }

    this.connectingIds = [...this.connectingIds, member.id];
    this.apiService.sendConnectionRequest(userId, String(member.id)).subscribe({
      next: () => {
        this.connectingIds = this.connectingIds.filter((id) => id !== member.id);
        this.markConnectionPending(member);
        this.showConnectionToast();
        this.apiService.createOrGetConversation({ userId, otherUserId: String(member.id) }).subscribe({
          next: (res) => {
            const convId = res?.data?.conversationId ?? res?.data?._id ?? res?.conversationId ?? res?._id;
            this.apiService.trackSentConnection({
              otherUserId: String(member.id),
              name: member.name,
              avatar: member.image,
              conversationId: convId != null ? String(convId) : undefined
            });
          },
          error: () => {
            this.apiService.trackSentConnection({
              otherUserId: String(member.id),
              name: member.name,
              avatar: member.image
            });
          }
        });
      },
      error: () => {
        // Request may already exist — still show Pending like the app
        this.connectingIds = this.connectingIds.filter((id) => id !== member.id);
        this.markConnectionPending(member);
        this.showConnectionToast();
        this.apiService.trackSentConnection({
          otherUserId: String(member.id),
          name: member.name,
          avatar: member.image
        });
      }
    });
  }

  private markConnectionPending(member: MemberProfile): void {
    if (!this.pendingConnectionIds.includes(member.id)) {
      this.pendingConnectionIds = [...this.pendingConnectionIds, member.id];
    }
    this.apiService.trackSentConnection({
      otherUserId: String(member.id),
      name: member.name,
      avatar: member.image
    });
  }

  private showConnectionToast(): void {
    this.connectionToastVisible = true;
    if (this.connectionToastTimer) {
      clearTimeout(this.connectionToastTimer);
    }
    this.connectionToastTimer = setTimeout(() => {
      this.connectionToastVisible = false;
      this.connectionToastTimer = null;
    }, 2800);
  }

  /** Heart icon: toggle Favorite. Click = add (heart pink); unclick = remove from Favorites. */
  likeMember(memberId: number) {
    const userId = this.resolveUserId();
    if (!userId) return;
    const isCurrentlyFavorited = this.isFavorited(memberId);
    const nextState = !isCurrentlyFavorited;

    // Update UI immediately, then reconcile with the API result.
    this.favoritedProfileIds = nextState
      ? [...this.favoritedProfileIds, memberId]
      : this.favoritedProfileIds.filter(id => id !== memberId);

    if (isCurrentlyFavorited) {
      this.apiService.removeFromFavorites({ userId, profileId: String(memberId) }).subscribe({
        next: () => {
        },
        error: () => {
          this.favoritedProfileIds = [...this.favoritedProfileIds, memberId];
        }
      });
    } else {
      this.apiService.addToFavorites({ userId, profileId: String(memberId) }).subscribe({
        next: () => {
        },
        error: () => {
          this.favoritedProfileIds = this.favoritedProfileIds.filter(id => id !== memberId);
        }
      });
    }
  }

  /** Star icon: toggle Shortlisted. Click = add (star golden); unclick = remove from Shortlisted. */
  shortlistMember(memberId: number) {
    const userId = this.resolveUserId();
    if (!userId) return;
    const isCurrentlyShortlisted = this.isShortlisted(memberId);
    const nextState = !isCurrentlyShortlisted;

    // Update UI immediately, then reconcile with the API result.
    this.shortlistedProfileIds = nextState
      ? [...this.shortlistedProfileIds, memberId]
      : this.shortlistedProfileIds.filter(id => id !== memberId);

    if (isCurrentlyShortlisted) {
      this.apiService.removeFromShortlist({ userId, profileId: String(memberId) }).subscribe({
        next: () => {
        },
        error: () => {
          this.shortlistedProfileIds = [...this.shortlistedProfileIds, memberId];
        }
      });
    } else {
      this.apiService.addToShortlist({ userId, profileId: String(memberId) }).subscribe({
        next: () => {
        },
        error: () => {
          this.shortlistedProfileIds = this.shortlistedProfileIds.filter(id => id !== memberId);
        }
      });
    }
  }

  deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      console.log('Account deleted');
      this.onLogout();
    }
  }

  /** All tab: every member profile (POST /api/profiles/all) — no preference scoring. */
  private loadAllUsers(userId: string): void {
    this.isLoadingProfiles = true;
    this.profilesLoadMessage = '';
    this.apiService.listAllUsers({ userId }).subscribe({
      next: (response) => {
        this.isLoadingProfiles = false;
        const list = this.extractUsersList(response);
        if (list.length === 0) {
          this.allProfiles = [];
          this.profilesLoadMessage = 'No profiles to show yet.';
          this.updatePaginationState();
          return;
        }
        this.failedProfileImageIds = [];
        this.allProfiles = list.map((item, index) => this.mapUserToMemberProfile(item, index));
        this.profilesLoadMessage = '';
        this.currentPage = 1;
        this.updatePaginationState();
      },
      error: (error) => {
        this.isLoadingProfiles = false;
        console.error('List all users error:', error);
        this.profilesLoadMessage = 'Could not load profiles.';
        this.updatePaginationState();
      }
    });
  }

  /** Primary: POST /api/profiles/list (scored). Fallback: POST /api/matchmaking/matches */
  private loadBestMatches(userId: string): void {
    this.isLoadingProfiles = true;
    this.profilesLoadMessage = '';
    this.matchmaking
      .listScoredProfiles({ userId, mode: 'balanced', page: 1, limit: 50, includeExplain: true })
      .subscribe({
        next: (response) => {
          const list = this.extractMatchList(response);
          if (list.length > 0) {
            this.finishScoredProfileLoad(list, 'Best Matches');
            return;
          }
          this.loadBestMatchesFromMatchmaking(userId);
        },
        error: (error) => {
          console.error('Profiles list (scored) error:', error);
          this.loadBestMatchesFromMatchmaking(userId);
        }
      });
  }

  private loadBestMatchesFromMatchmaking(userId: string): void {
    this.matchmaking
      .getScoredMatches({ userId, mode: 'balanced', page: 1, limit: 50, includeExplain: true })
      .subscribe({
        next: (response) => {
          const list = this.extractMatchList(response);
          if (list.length > 0) {
            this.finishScoredProfileLoad(list, 'Best Matches');
            return;
          }
          this.isLoadingProfiles = false;
          this.allProfiles = [];
          this.profilesLoadMessage =
            'No best matches yet. Try Near Matches or update your partner preferences.';
          this.currentPage = 1;
          this.updatePaginationState();
        },
        error: (error) => {
          this.isLoadingProfiles = false;
          console.error('Matchmaking matches error:', error);
          this.allProfiles = [];
          this.profilesLoadMessage = 'Could not load best matches. Please try again.';
          this.updatePaginationState();
        }
      });
  }

  private finishScoredProfileLoad(list: ScoredMatchItem[], category: string): void {
    this.isLoadingProfiles = false;
    this.failedProfileImageIds = [];
    this.allProfiles = list.map((item, index) => this.mapScoredMatchToMember(item, index, category));
    this.profilesLoadMessage = '';
    this.currentPage = 1;
    this.updatePaginationState();
  }

  private loadNearMatchProfiles(userId: string): void {
    this.isLoadingProfiles = true;
    this.profilesLoadMessage = '';
    this.matchmaking.getNearMatches({ userId, page: 1, limit: 50, includeExplain: true }).subscribe({
      next: (response) => {
        this.isLoadingProfiles = false;
        const list = this.extractMatchList(response);
        this.failedProfileImageIds = [];
        if (list.length === 0) {
          this.allProfiles = [];
          this.profilesLoadMessage = 'No near matches found. Relax preferences or check back later.';
          this.currentPage = 1;
          this.updatePaginationState();
          return;
        }
        this.allProfiles = list.map((item, index) => this.mapScoredMatchToMember(item, index, 'Near Matches'));
        this.currentPage = 1;
        this.updatePaginationState();
      },
      error: (error) => {
        this.isLoadingProfiles = false;
        console.error('Near matches error:', error);
        this.profilesLoadMessage = 'Could not load near matches.';
        this.allProfiles = [];
        this.updatePaginationState();
      }
    });
  }

  private extractMatchList(response: unknown): ScoredMatchItem[] {
    if (!response || typeof response !== 'object') return [];
    const r = response as Record<string, unknown>;
    if (Array.isArray(r['data'])) return r['data'] as ScoredMatchItem[];

    const data = r['data'];
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const d = data as Record<string, unknown>;
      for (const key of ['list', 'profiles', 'items', 'results', 'matches', 'users']) {
        if (Array.isArray(d[key])) return d[key] as ScoredMatchItem[];
      }
    }

    for (const key of ['list', 'profiles', 'items', 'results', 'matches']) {
      if (Array.isArray(r[key])) return r[key] as ScoredMatchItem[];
    }
    return [];
  }

  private mapScoredMatchToMember(item: ScoredMatchItem, index: number, category: string): MemberProfile {
    const profile = (item.profile ?? item) as Record<string, unknown>;
    const merged = { ...profile, userId: item.userId, matchPercent: item.matchPercent, explain: item.explain };
    const base = this.mapUserToMemberProfile(merged, index);
    const age = Number(profile['age'] ?? 0);
    const city = String(profile['city'] ?? '');
    const state = String(profile['state'] ?? '');
    const loc = [city, state].filter(Boolean).join(', ') || base.location;
    return {
      ...base,
      id: Number(item.userId) || base.id,
      location: loc,
      bio: item.explain?.headline || (age ? `Age ${age} · ${item.matchPercent}% match` : base.bio),
      category: [category],
      matchPercent: item.matchPercent,
      matchTier: item.tier,
      explainHeadline: item.explain?.headline,
      explain: item.explain
    };
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

  /** Resolve current user's profile photo from API profile object. Returns null if none (so UI shows placeholder). */
  private getCurrentUserPhotoUrl(data: any): string | null {
    if (!data || typeof data !== 'object') return null;
    const normalizeProfileUrl = (url: string): string => {
      if (!url || typeof url !== 'string') return '';
      const trimmed = url.trim();
      return trimmed.replace(/(\.(?:jpg|jpeg|png|webp))\.profile(\b|$)/i, '$1$2');
    };
    const toAbsolute = (url: string): string => {
      if (!url || typeof url !== 'string') return '';
      let normalized = normalizeProfileUrl(url);
      if (normalized.startsWith('data:') || normalized.startsWith('http') || normalized.startsWith('//')) {
        return normalizeProfileImageUrl(normalized);
      }
      const full = 'https://vescript.vescript.com' + (normalized.startsWith('/') ? '' : '/') + normalized;
      return normalizeProfileImageUrl(full);
    };
    const extractUrl = (val: any): string => {
      if (typeof val === 'string' && val.trim()) {
        const first = val.split(',')[0].trim();
        return toAbsolute(first);
      }
      if (val && typeof val === 'object') {
        const raw = val.url || val.path || val.src || val.image || val.uri || '';
        return toAbsolute(raw);
      }
      return '';
    };
    const directFields = ['firstPhotoUrl', 'first_photo_url', 'avatar', 'profilePicture', 'profilePhoto', 'photo', 'image', 'picture'];
    for (const field of directFields) {
      const val = data[field];
      if (val) {
        const url = extractUrl(val);
        if (url) return url;
      }
    }
    const arrayFields = ['profilePhotos', 'profile_photos', 'photos', 'images', 'gallery'];
    for (const field of arrayFields) {
      const arr = data[field];
      if (Array.isArray(arr) && arr.length > 0) {
        const url = extractUrl(arr[0]);
        if (url) return url;
      }
    }
    return null;
  }

  /** Profile IDs for which the profile image failed to load – show placeholder icon instead. */
  failedProfileImageIds: number[] = [];

  private resolveProfileImage(item: any): string {
    const directFields = ['firstPhotoUrl', 'first_photo_url', 'avatar', 'profilePicture', 'profilePhoto', 'photo', 'image', 'picture'];
    for (const field of directFields) {
      const val = item?.[field] || item?.profile?.[field];
      if (val) {
        const url = extractMediaUrl(val);
        if (url) return url;
      }
    }
    const arrayFields = ['profilePhotos', 'profile_photos', 'photos', 'images', 'gallery'];
    for (const field of arrayFields) {
      const arr = item?.[field] || item?.profile?.[field];
      if (Array.isArray(arr) && arr.length > 0) {
        const url = extractMediaUrl(arr[0]);
        if (url) return url;
      }
    }
    return '';
  }

  showProfilePlaceholder(member: MemberProfile): boolean {
    return !member.image || this.failedProfileImageIds.includes(member.id);
  }

  markProfileImageFailed(memberId: number): void {
    if (!this.failedProfileImageIds.includes(memberId)) {
      this.failedProfileImageIds = [...this.failedProfileImageIds, memberId];
    }
  }

  private mapUserToMemberProfile(item: any, index: number): MemberProfile {
    const fallbackId = index + 1;
    const numericId = Number(item?.id || item?.userId || item?._id);
    const name = item?.name || item?.fullName || item?.profile?.name || `User ${fallbackId}`;
    const age = Number(item?.age || item?.profile?.age || 0);

    return {
      id: Number.isFinite(numericId) ? numericId : fallbackId,
      name,
      height: item?.height || item?.profile?.height || '-',
      location: item?.location || item?.city || item?.state || item?.profile?.location || 'N/A',
      religion: item?.religion || item?.profile?.religion || 'N/A',
      profession: item?.profession || item?.occupation || item?.profile?.profession || 'N/A',
      income: item?.income || item?.salary || item?.profile?.income || '-',
      bio: item?.bio || item?.about || item?.profile?.bio || (age ? `Age ${age}` : 'Member profile'),
      image: this.resolveProfileImage(item),
      rating: 4.5,
      isActive: Boolean(item?.isOnline ?? item?.isActive ?? true),
      category: ['All'],
      isVerified: this.resolveVerificationStatus(item)
    };
  }

  private resolveVerificationStatus(item: any): boolean {
    const statusRaw =
      item?.verificationStatus ??
      item?.verification_status ??
      item?.profile?.verificationStatus ??
      item?.profile?.verification_status;
    const status = String(statusRaw ?? '').trim().toLowerCase();
    if (status === 'verified') {
      return true;
    }

    const numericRaw =
      item?.isVerified ??
      item?.is_verified ??
      item?.profile?.isVerified ??
      item?.profile?.is_verified;
    const numericStatus = Number(numericRaw);
    return Number.isFinite(numericStatus) && numericStatus === 2;
  }

  /** Match % and explain lines only on scored tabs, not on All. */
  get showMatchInsights(): boolean {
    return this.activeFilter !== 'All';
  }

  filterTabLabel(filter: string): string {
    return filter === 'All' ? 'All Profiles' : filter;
  }

  matchTierLabel(tier?: string): string {
    if (!tier) return '';
    const labels: Record<string, string> = {
      strong: 'Strong match',
      good: 'Good match',
      moderate: 'Moderate',
      weak: 'Possible match'
    };
    return labels[tier] ?? tier;
  }

  private loadInitialFavoriteAndShortlistIds(userId: string): void {
    this.apiService.listMyFavorites(userId, 1, 50).subscribe({
      next: (res) => {
        const list = this.extractFavoriteOrShortlistList(res);
        this.favoritedProfileIds = this.idsFromFavoriteOrShortlistList(list);
      },
      error: () => {}
    });
    this.apiService.listMyShortlist(userId, 1, 50).subscribe({
      next: (res) => {
        const list = this.extractFavoriteOrShortlistList(res);
        this.shortlistedProfileIds = this.idsFromFavoriteOrShortlistList(list);
      },
      error: () => {}
    });
  }

  private idsFromFavoriteOrShortlistList(list: any[]): number[] {
    return list
      .map(item => {
        const raw = item?.profileId ?? item?.profile_id ?? item?.id ?? item?._id ?? item?.profile?.id ?? item?.userId;
        const n = Number(raw);
        return Number.isFinite(n) ? n : 0;
      })
      .filter(n => n > 0);
  }

  private extractFavoriteOrShortlistList(response: any): any[] {
    if (!response || typeof response !== 'object') return [];
    const data = response?.data ?? response;
    if (Array.isArray(data?.list)) return data.list;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.favorites)) return data.favorites;
    if (Array.isArray(data?.shortlist)) return data.shortlist;
    if (Array.isArray(data)) return data;
    if (Array.isArray(response?.list)) return response.list;
    if (Array.isArray(response?.favorites)) return response.favorites;
    if (Array.isArray(response?.shortlist)) return response.shortlist;
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
}
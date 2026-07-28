import { Component, Input, Output, EventEmitter, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ViewState } from '../types';
import { ApiService } from '../services/api.service';
import { extractMediaUrl, toAbsoluteMediaUrl, normalizeProfileImageUrl } from '../core/utils/profile-image-url';

export type ConnectionsTab = 'connected' | 'requests' | 'sent';

export interface ConnectionItem {
  id: string;
  otherUserId: string;
  name: string;
  avatar: string;
  location: string;
  age?: number;
  subtitle: string;
  dateLabel: string;
  conversationId?: string;
}

@Component({
  selector: 'app-my-connections',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-connections.component.html',
  styleUrls: ['./my-connections.component.css']
})
export class MyConnectionsComponent implements OnInit {
  @Input() t: any;
  @Output() viewChange = new EventEmitter<ViewState>();
  @Output() viewProfile = new EventEmitter<string | number>();
  @Output() openChat = new EventEmitter<string | number | { otherUserId: string | number; conversationId?: string; name?: string; avatar?: string }>();

  private currentUserId: string | null = null;

  activeTab: ConnectionsTab = 'connected';
  loading = false;
  menuOpenId: string | null = null;

  connectedList: ConnectionItem[] = [];
  requestsList: ConnectionItem[] = [];
  sentList: ConnectionItem[] = [];
  failedAvatarIds: string[] = [];
  private allUsersPhotoMap: Record<string, string> = {};

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.resolveUserId();
    if (!this.currentUserId) {
      return;
    }
    // Same source dashboard/shortlisted use for firstPhotoUrl
    this.preloadAllUsersPhotoMap(this.currentUserId);
    this.refreshAll();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.menuOpenId = null;
  }

  get currentList(): ConnectionItem[] {
    switch (this.activeTab) {
      case 'requests':
        return this.requestsList;
      case 'sent':
        return this.sentList;
      default:
        return this.connectedList;
    }
  }

  onBack(): void {
    this.viewChange.emit('dashboard');
  }

  setTab(tab: ConnectionsTab): void {
    this.activeTab = tab;
    this.menuOpenId = null;
  }

  refreshAll(): void {
    const userId = this.apiService.getAccountUserId() || this.resolveUserId();
    if (!userId) {
      return;
    }
    this.currentUserId = userId;
    this.loading = true;
    const profileId = localStorage.getItem('profile_user_id') || undefined;

    forkJoin({
      connected: this.apiService.listAcceptedConnections(userId, 1, 50, profileId).pipe(
        catchError(() => of(null))
      ),
      requests: this.apiService.listConnectionRequests(userId, profileId).pipe(
        catchError(() => of(null))
      ),
      sent: this.apiService.listSentConnectionRequests(userId, 1, 50, profileId).pipe(
        catchError(() => of(null))
      )
    })
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: ({ connected, requests, sent }) => {
          this.connectedList = connected
            ? this.mapList(connected, 'connected', userId)
            : [];
          this.requestsList = requests
            ? this.mapList(requests, 'requests', userId)
            : [];
          this.sentList = sent
            ? this.mapList(sent, 'sent', userId)
            : [];

          this.sentList = this.mergeTrackedSent(this.sentList, userId);

          const connectedIds = new Set(this.connectedList.map((c) => c.otherUserId));
          this.sentList = this.sentList.filter((s) => !connectedIds.has(s.otherUserId));
          connectedIds.forEach((id) => this.apiService.removeTrackedSentConnection(id));

          // Apply photos from profiles/all immediately (same as Shortlisted)
          this.applyPhotoMapToList(this.connectedList, 'connected');
          this.applyPhotoMapToList(this.requestsList, 'requests');
          this.applyPhotoMapToList(this.sentList, 'sent');

          this.enrichProfiles(this.connectedList, 'connected');
          this.enrichProfiles(this.requestsList, 'requests');
          this.enrichProfiles(this.sentList, 'sent');
          this.fetchPhotosForList(this.connectedList, 'connected');
          this.fetchPhotosForList(this.requestsList, 'requests');
          this.fetchPhotosForList(this.sentList, 'sent');
          this.preloadAllUsersPhotoMap(userId);
        }
      });
  }

  private mergeTrackedSent(list: ConnectionItem[], currentUserId: string): ConnectionItem[] {
    const tracked = this.apiService.getTrackedSentConnections();
    if (!tracked.length) {
      return list;
    }

    // Fill missing photos/names on API rows from locally tracked Connect actions
    const byId = new Map(tracked.map((t) => [String(t.otherUserId), t]));
    const merged = list.map((item) => {
      const t = byId.get(item.otherUserId);
      if (!t) {
        return item;
      }
      const trackedAvatar = t.avatar ? toAbsoluteMediaUrl(t.avatar) : '';
      return {
        ...item,
        name: item.name && item.name !== 'User' ? item.name : (t.name || item.name),
        avatar: this.isUsableAvatar(item.avatar)
          ? item.avatar
          : (this.isUsableAvatar(trackedAvatar) ? trackedAvatar : item.avatar),
        location: item.location || t.location || '',
        age: item.age ?? t.age,
        conversationId: item.conversationId || t.conversationId,
        subtitle: this.buildSubtitle(
          'sent',
          item.age ?? t.age,
          item.location || t.location || ''
        )
      };
    });

    const seen = new Set(merged.map((item) => item.otherUserId));
    const extras: ConnectionItem[] = tracked
      .filter((item) => item.otherUserId && item.otherUserId !== currentUserId && !seen.has(String(item.otherUserId)))
      .map((item, index) => {
        const rawAvatar = item.avatar || '';
        const avatar = this.isUsableAvatar(rawAvatar) ? toAbsoluteMediaUrl(rawAvatar) : '';
        return {
          id: `tracked-sent-${item.otherUserId}-${index}`,
          otherUserId: String(item.otherUserId),
          name: item.name || 'User',
          avatar,
          location: item.location || '',
          age: item.age,
          subtitle: this.buildSubtitle('sent', item.age, item.location || ''),
          dateLabel: this.formatDateLabel(item.createdAt),
          conversationId: item.conversationId
        };
      });
    return [...extras, ...merged];
  }

  toggleMenu(itemId: string, event: Event): void {
    event.stopPropagation();
    this.menuOpenId = this.menuOpenId === itemId ? null : itemId;
  }

  viewProfileDetail(item: ConnectionItem, event?: Event): void {
    event?.stopPropagation();
    this.menuOpenId = null;
    this.viewProfile.emit(item.otherUserId);
    this.viewChange.emit('profile-detail');
  }

  messageMember(item: ConnectionItem, event?: Event): void {
    event?.stopPropagation();
    this.menuOpenId = null;
    this.openChat.emit({
      otherUserId: item.otherUserId,
      conversationId: item.conversationId,
      name: item.name,
      avatar: item.avatar
    });
  }

  acceptRequest(item: ConnectionItem, event: Event): void {
    event.stopPropagation();
    const userId = this.currentUserId;
    if (!userId) {
      return;
    }
    this.apiService.acceptConnectionRequest(userId, item.otherUserId).subscribe({
      next: () => {
        this.requestsList = this.requestsList.filter((r) => r.otherUserId !== item.otherUserId);
        this.refreshConnectedOnly(userId);
      },
      error: () => {}
    });
  }

  declineRequest(item: ConnectionItem, event: Event): void {
    event.stopPropagation();
    const userId = this.currentUserId;
    if (!userId) {
      return;
    }
    this.apiService.declineConnectionRequest(userId, item.otherUserId).subscribe({
      next: () => {
        this.requestsList = this.requestsList.filter((r) => r.otherUserId !== item.otherUserId);
      },
      error: () => {}
    });
  }

  withdrawRequest(item: ConnectionItem, event: Event): void {
    event.stopPropagation();
    this.menuOpenId = null;
    const userId = this.currentUserId || this.apiService.getAccountUserId();
    if (!userId) {
      return;
    }
    this.apiService.withdrawConnectionRequest(userId, item.otherUserId).subscribe({
      next: () => {
        this.sentList = this.sentList.filter((r) => r.otherUserId !== item.otherUserId);
        this.apiService.removeTrackedSentConnection(item.otherUserId);
      },
      error: () => {
        // Still remove locally so UI matches user intent if API already cancelled
        this.sentList = this.sentList.filter((r) => r.otherUserId !== item.otherUserId);
        this.apiService.removeTrackedSentConnection(item.otherUserId);
      }
    });
  }

  markAvatarFailed(id: string): void {
    if (!this.failedAvatarIds.includes(id)) {
      this.failedAvatarIds = [...this.failedAvatarIds, id];
    }
    const item =
      this.sentList.find((r) => r.id === id) ||
      this.requestsList.find((r) => r.id === id) ||
      this.connectedList.find((r) => r.id === id);
    if (!item || (item as any)._photoRetried) {
      return;
    }
    (item as any)._photoRetried = true;
    const tab: ConnectionsTab =
      this.sentList.some((r) => r.id === id) ? 'sent'
        : this.requestsList.some((r) => r.id === id) ? 'requests'
          : 'connected';

    const mapped =
      this.allUsersPhotoMap[item.otherUserId] ||
      this.allUsersPhotoMap[`name:${(item.name || '').trim().toLowerCase()}`];
    if (mapped && this.isUsableAvatar(mapped) && mapped !== item.avatar) {
      this.patchConnectionItem(tab, item, { avatar: mapped });
      return;
    }
    this.loadPhotoForItem(item, tab, true);
  }

  showProfileIcon(item: ConnectionItem): boolean {
    return !this.isUsableAvatar(item.avatar) || this.failedAvatarIds.includes(item.id);
  }

  private isUsableAvatar(url: string | undefined | null): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }
    const t = url.trim();
    if (!t || t === 'null' || t === 'undefined' || t === '[object Object]') {
      return false;
    }
    if (!(t.startsWith('http') || t.startsWith('//') || t.startsWith('data:') || t.startsWith('/'))) {
      return false;
    }
    // Reject weak/non-image paths that still look like URLs (common API junk)
    if (t.startsWith('data:')) {
      return true;
    }
    const lower = t.toLowerCase();
    return (
      /\.(jpg|jpeg|png|webp|gif|bmp)(\?|#|$)/i.test(lower) ||
      lower.includes('/photos/') ||
      lower.includes('/uploads/') ||
      lower.includes('/profiles/') ||
      lower.includes('vescript') ||
      lower.includes('cloudinary') ||
      lower.includes('amazonaws') ||
      lower.includes('googleusercontent')
    );
  }

  private refreshConnectedOnly(userId: string): void {
    const profileId = localStorage.getItem('profile_user_id') || undefined;
    this.apiService.listAcceptedConnections(userId, 1, 50, profileId).subscribe({
      next: (response) => {
        this.connectedList = this.mapList(response, 'connected', userId);
        this.enrichProfiles(this.connectedList, 'connected');
      },
      error: () => {}
    });
  }

  private mapList(response: any, tab: ConnectionsTab, currentUserId: string): ConnectionItem[] {
    const list = this.extractList(response);
    const mapped = list
      .map((item: any, index: number) => this.mapItem(item, index, tab, currentUserId))
      .filter((item: ConnectionItem) => !!item.otherUserId && item.otherUserId !== currentUserId);

    // Dedupe by otherUserId
    const seen = new Set<string>();
    return mapped.filter((item) => {
      if (seen.has(item.otherUserId)) {
        return false;
      }
      seen.add(item.otherUserId);
      return true;
    });
  }

  private extractList(response: any): any[] {
    if (!response || typeof response !== 'object') {
      return [];
    }
    if (Array.isArray(response)) {
      return response;
    }

    const found: any[][] = [];
    const listKeys = new Set([
      'list', 'items', 'results', 'connections', 'accepted', 'connected',
      'pending', 'requests', 'connectionRequests', 'pendingRequests',
      'sent', 'sentRequests', 'sentList', 'outgoing', 'outgoingRequests',
      'pendingSent', 'pending_sent', 'data', 'records', 'rows', 'users', 'profiles'
    ]);

    const walk = (node: any, depth: number) => {
      if (!node || typeof node !== 'object' || depth > 4) {
        return;
      }
      if (Array.isArray(node)) {
        if (node.length > 0 && typeof node[0] === 'object') {
          found.push(node);
        }
        return;
      }
      for (const key of Object.keys(node)) {
        const val = node[key];
        if (Array.isArray(val) && listKeys.has(key) && val.length > 0) {
          found.push(val);
        } else if (val && typeof val === 'object') {
          walk(val, depth + 1);
        }
      }
    };

    walk(response, 0);
    if (!found.length) {
      return [];
    }
    return found.reduce((best, cur) => (cur.length > best.length ? cur : best), found[0]);
  }

  private mapItem(item: any, index: number, tab: ConnectionsTab, currentUserId: string): ConnectionItem {
    const otherUserId = this.resolveOtherUserId(item, tab, currentUserId);
    const profile = this.pickProfileNode(item, tab, currentUserId);
    const name =
      profile?.name ||
      profile?.fullName ||
      profile?.full_name ||
      item?.name ||
      item?.fullName ||
      item?.otherUserName ||
      item?.fromName ||
      item?.toName ||
      `User ${index + 1}`;
    const location =
      this.firstString(
        profile?.location,
        profile?.city,
        profile?.state,
        profile?.district,
        item?.location,
        item?.city,
        item?.state
      ) || '';
    const age = Number(profile?.age ?? item?.age) || undefined;
    const resolvedAvatar = this.resolveAvatar(item, profile);
    const avatar = this.isUsableAvatar(resolvedAvatar) ? resolvedAvatar : '';
    const dateLabel = this.formatDateLabel(
      item?.updatedAt ||
      item?.createdAt ||
      item?.acceptedAt ||
      item?.requestedAt ||
      item?.sentAt ||
      item?.date ||
      item?.timestamp ||
      item?.created_at ||
      item?.updated_at
    );

    return {
      id: String(item?.id ?? item?._id ?? item?.requestId ?? `${tab}-${otherUserId}-${index}`),
      otherUserId,
      name: typeof name === 'string' ? name : 'User',
      avatar,
      location,
      age,
      subtitle: this.buildSubtitle(tab, age, location),
      dateLabel,
      conversationId: (item?.conversationId ?? item?.conversation_id) != null
        ? String(item?.conversationId ?? item?.conversation_id)
        : undefined
    };
  }

  /** Pick the other person's user id based on tab — never the logged-in user. */
  private resolveOtherUserId(item: any, tab: ConnectionsTab, currentUserId: string): string {
    const candidatesByTab: unknown[] =
      tab === 'requests'
        ? [
            item?.fromUserId,
            item?.from_user_id,
            item?.senderId,
            item?.sender_id,
            item?.requesterId,
            item?.requester_id,
            item?.requestFrom,
            item?.request_from,
            item?.from?.id,
            item?.from?._id,
            item?.from?.userId,
            item?.sender?.id,
            item?.requester?.id,
            item?.user?.id,
            item?.user?._id,
            item?.profile?.userId,
            item?.profile?.id,
            item?.otherUserId,
            item?.other_user_id,
            item?.otherUser?.id,
            item?.otherUser?.userId,
            item?.otherUser?._id
          ]
        : tab === 'sent'
          ? [
              item?.toUserId,
              item?.to_user_id,
              item?.receiverId,
              item?.receiver_id,
              item?.recipientId,
              item?.recipient_id,
              item?.targetUserId,
              item?.target_user_id,
              item?.requestedUserId,
              item?.otherUserId,
              item?.other_user_id,
              item?.connectedUserId,
              item?.otherUser?.id,
              item?.otherUser?.userId,
              item?.otherUser?._id,
              item?.recipient?.id,
              item?.recipient?.userId,
              item?.to?.id,
              item?.to?._id,
              item?.to?.userId,
              item?.receiver?.id,
              item?.profile?.userId,
              item?.profile?.id,
              item?.user?.id,
              item?.userId,
              item?.user_id
            ]
          : [
              item?.otherUserId,
              item?.other_user_id,
              item?.connectedUserId,
              item?.connected_user_id,
              item?.partnerId,
              item?.partner_id,
              item?.otherUser?.id,
              item?.otherUser?.userId,
              item?.otherUser?._id,
              item?.toUserId,
              item?.to_user_id,
              item?.fromUserId,
              item?.from_user_id,
              item?.from?.id,
              item?.to?.id,
              item?.user?.id,
              item?.profile?.userId,
              item?.profile?.id
            ];

    for (const raw of candidatesByTab) {
      if (raw == null || raw === '') {
        continue;
      }
      const id = String(raw);
      if (id !== currentUserId) {
        return id;
      }
    }

    const fromId = item?.fromUserId ?? item?.from_user_id ?? item?.from?.id ?? item?.from?._id;
    const toId = item?.toUserId ?? item?.to_user_id ?? item?.to?.id ?? item?.to?._id;
    if (fromId != null && String(fromId) !== currentUserId) {
      return String(fromId);
    }
    if (toId != null && String(toId) !== currentUserId) {
      return String(toId);
    }

    return '';
  }

  private pickProfileNode(item: any, tab: ConnectionsTab, currentUserId: string): any {
    if (tab === 'requests') {
      return item?.from || item?.sender || item?.requester || item?.otherUser || item?.profile || item?.user || item;
    }
    if (tab === 'sent') {
      return item?.to || item?.receiver || item?.recipient || item?.otherUser || item?.profile || item?.user || item;
    }
    const fromId = item?.fromUserId ?? item?.from_user_id ?? item?.from?.id;
    if (fromId != null && String(fromId) !== currentUserId) {
      return item?.from || item?.otherUser || item?.profile || item?.user || item;
    }
    const toId = item?.toUserId ?? item?.to_user_id ?? item?.to?.id;
    if (toId != null && String(toId) !== currentUserId) {
      return item?.to || item?.otherUser || item?.profile || item?.user || item;
    }
    return item?.otherUser || item?.profile || item?.user || item?.from || item?.to || item;
  }

  private buildSubtitle(tab: ConnectionsTab, age: number | undefined, location: string): string {
    if (tab === 'sent') {
      return [age ? `${age} yrs` : '', location, 'Waiting for response'].filter(Boolean).join(' • ');
    }
    if (tab === 'requests') {
      return location || 'Wants to connect with you';
    }
    if (age && location) {
      return `${age} yrs • ${location}`;
    }
    if (age) {
      return `${age} yrs`;
    }
    return location || '—';
  }

  private resolveAvatar(item: any, profile?: any): string {
    const sources = [
      profile,
      item,
      item?.profile,
      item?.user,
      item?.from,
      item?.to,
      item?.otherUser,
      item?.recipient,
      item?.receiver
    ].filter(Boolean);
    const fields = [
      'firstPhotoUrl',
      'first_photo_url',
      'avatar',
      'profilePicture',
      'profile_picture',
      'profilePhoto',
      'profile_photo',
      'photo',
      'image',
      'imageUrl',
      'photoUrl',
      'photo_url',
      'profile_image',
      'profileImage'
    ];

    for (const src of sources) {
      for (const field of fields) {
        const url = extractMediaUrl(src?.[field]);
        if (url) {
          return url;
        }
      }
      for (const field of ['profilePhotos', 'profile_photos', 'photos', 'images', 'gallery']) {
        const arr = src?.[field];
        if (Array.isArray(arr) && arr[0]) {
          const url = extractMediaUrl(arr[0]);
          if (url) {
            return url;
          }
        }
      }
    }
    return '';
  }

  /** Always fill name / age / location from profile details when incomplete. */
  private enrichProfiles(list: ConnectionItem[], tab: ConnectionsTab): void {
    list.forEach((item) => {
      const needsEnrich =
        !item.avatar ||
        !item.location ||
        !item.age ||
        !item.name ||
        item.name === 'User' ||
        /^User\s*\d*$/i.test(item.name);

      if (!needsEnrich) {
        return;
      }

      this.apiService.getProfileDetails(item.otherUserId).subscribe({
        next: (res) => {
          const data = this.extractProfilePayload(res);
          if (!data) {
            return;
          }
          const name = this.firstString(data?.name, data?.fullName, data?.full_name);
          const avatar = this.extractPhotoFromProfilePayload(res);
          const location = this.firstString(data?.location, data?.city, data?.state, data?.district) || '';
          const age = Number(data?.age) || undefined;
          this.patchConnectionItem(tab, item, {
            name: name || undefined,
            avatar: avatar || undefined,
            location: location || undefined,
            age
          });
          // Name may unlock photo map lookup
          if (name) {
            const mapped =
              this.allUsersPhotoMap[item.otherUserId] ||
              this.allUsersPhotoMap[`name:${name.trim().toLowerCase()}`];
            if (mapped && this.isUsableAvatar(mapped)) {
              this.patchConnectionItem(tab, item, { avatar: mapped });
            }
          }
        },
        error: () => {}
      });
    });
  }

  /** Force-load profile photos for every row (Sent / Requests / Connected). */
  private fetchPhotosForList(list: ConnectionItem[], tab: ConnectionsTab): void {
    list.forEach((item) => this.loadPhotoForItem(item, tab, !this.isUsableAvatar(item.avatar)));
  }

  private loadPhotoForItem(item: ConnectionItem, tab: ConnectionsTab, force = false): void {
    if (!force && this.isUsableAvatar(item.avatar) && !this.failedAvatarIds.includes(item.id)) {
      return;
    }

    // Parallel: profile details + photos list (same sources dashboard/profile-detail use)
    this.apiService.getProfileDetails(item.otherUserId).subscribe({
      next: (res) => {
        const avatar = this.extractPhotoFromProfilePayload(res);
        if (avatar) {
          this.patchConnectionItem(tab, item, { avatar });
        }
      },
      error: () => {}
    });

    this.apiService.listMyPhotos(item.otherUserId).subscribe({
      next: (photoRes) => {
        const photoUrl = this.extractFirstPhotoUrl(photoRes);
        if (photoUrl) {
          this.patchConnectionItem(tab, item, { avatar: photoUrl });
        }
      },
      error: () => {}
    });
  }

  private preloadAllUsersPhotoMap(userId: string): void {
    this.apiService.listAllUsers({ userId }).subscribe({
      next: (response) => {
        const users = this.extractUsersList(response);
        if (!users.length) {
          return;
        }
        const photoMap: Record<string, string> = { ...this.allUsersPhotoMap };
        users.forEach((user: any) => {
          const photo = this.resolveAvatar(user) || this.resolveAvatar(user?.profile);
          if (!photo || !this.isUsableAvatar(photo)) {
            return;
          }
          const keys = [
            user?.id,
            user?.userId,
            user?.user_id,
            user?._id,
            user?.profileId,
            user?.profile_id,
            user?.profile?.id,
            user?.profile?.userId,
            user?.profile?.user_id,
            user?.profile?._id
          ];
          keys.forEach((keyRaw) => {
            if (keyRaw != null && String(keyRaw).trim()) {
              photoMap[String(keyRaw).trim()] = photo;
            }
          });
          const nameKey = (user?.name || user?.fullName || user?.profile?.name || '')
            .toString()
            .trim()
            .toLowerCase();
          if (nameKey) {
            photoMap[`name:${nameKey}`] = photo;
          }
        });

        this.allUsersPhotoMap = photoMap;
        this.applyPhotoMapToList(this.connectedList, 'connected');
        this.applyPhotoMapToList(this.requestsList, 'requests');
        this.applyPhotoMapToList(this.sentList, 'sent');
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  /** Prefer profiles/all firstPhotoUrl (same as Shortlisted). */
  private applyPhotoMapToList(list: ConnectionItem[], tab: ConnectionsTab): void {
    if (!list.length || !Object.keys(this.allUsersPhotoMap).length) {
      return;
    }
    list.forEach((item) => {
      const mapped =
        this.allUsersPhotoMap[item.otherUserId] ||
        this.allUsersPhotoMap[`name:${(item.name || '').trim().toLowerCase()}`];
      if (mapped && this.isUsableAvatar(mapped) && mapped !== item.avatar) {
        this.patchConnectionItem(tab, item, { avatar: mapped });
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
    if (Array.isArray(response?.data?.profiles)) {
      return response.data.profiles;
    }
    if (Array.isArray(response?.users)) {
      return response.users;
    }
    if (Array.isArray(response?.profiles)) {
      return response.profiles;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    const data = response?.data ?? response;
    for (const key of ['list', 'items', 'results', 'users', 'profiles', 'data']) {
      if (Array.isArray(data?.[key])) {
        return data[key];
      }
    }
    return Array.isArray(data) ? data : [];
  }

  private extractProfilePayload(res: any): any {
    return (
      res?.data?.profile ??
      res?.data?.user ??
      res?.profile ??
      res?.user ??
      res?.data ??
      null
    );
  }

  private extractPhotoFromProfilePayload(res: any): string {
    if (!res || typeof res !== 'object') {
      return '';
    }
    const data = this.extractProfilePayload(res);
    const candidates = [
      data,
      data?.profile,
      data?.user,
      res?.data?.profile,
      res?.data?.user,
      res?.data,
      res?.profile,
      res?.user,
      res
    ];
    for (const node of candidates) {
      if (!node || typeof node !== 'object') {
        continue;
      }
      const direct = this.resolveAvatar(node);
      if (direct && this.isUsableAvatar(direct)) {
        return direct;
      }
      const top = extractMediaUrl(node.firstPhotoUrl ?? node.first_photo_url);
      if (top && this.isUsableAvatar(top)) {
        return top;
      }
    }
    return '';
  }

  private extractFirstPhotoUrl(photoRes: any): string {
    const photos =
      photoRes?.photos ||
      photoRes?.data?.photos ||
      photoRes?.data?.list ||
      photoRes?.list ||
      photoRes?.data ||
      [];
    if (!Array.isArray(photos) || !photos.length) {
      return '';
    }
    const sorted = [...photos].sort(
      (a, b) => Number((a as any)?.sortOrder ?? 0) - Number((b as any)?.sortOrder ?? 0)
    );
    for (const p of sorted) {
      if (typeof p === 'string' && p.trim()) {
        const url = toAbsoluteMediaUrl(p.trim());
        if (this.isUsableAvatar(url)) {
          return url;
        }
      }
      if (p && typeof p === 'object') {
        const raw =
          (p as any).url ||
          (p as any).path ||
          (p as any).src ||
          (p as any).image ||
          (p as any).imageUrl ||
          (p as any).photoUrl;
        if (raw) {
          const url = extractMediaUrl(raw);
          if (url && this.isUsableAvatar(url)) {
            return url;
          }
        }
        // Some APIs only return photo id / filename
        const id = (p as any).id || (p as any).photoId || (p as any).name || (p as any).filename;
        if (typeof id === 'string' && id.trim()) {
          const bare = id.trim().replace(/^\//, '');
          const built = normalizeProfileImageUrl(
            `https://vescript.vescript.com/api/profiles/photos/${encodeURIComponent(bare)}`
          );
          if (this.isUsableAvatar(built)) {
            return built;
          }
        }
      }
    }
    return '';
  }

  private patchConnectionItem(
    tab: ConnectionsTab,
    item: ConnectionItem,
    patch: Partial<Pick<ConnectionItem, 'name' | 'avatar' | 'location' | 'age'>>
  ): void {
    const target =
      tab === 'connected' ? this.connectedList
        : tab === 'requests' ? this.requestsList
          : this.sentList;
    const idx = target.findIndex((row) => row.id === item.id || row.otherUserId === item.otherUserId);
    if (idx === -1) {
      return;
    }
    const current = target[idx];
    const nextAvatar = patch.avatar && this.isUsableAvatar(patch.avatar) ? patch.avatar : current.avatar;
    const nextAge = patch.age ?? current.age;
    const nextLocation = patch.location ?? current.location;
    const updated = [...target];
    updated[idx] = {
      ...current,
      name: patch.name || current.name,
      avatar: nextAvatar || current.avatar,
      location: nextLocation || current.location,
      age: nextAge,
      subtitle: this.buildSubtitle(tab, nextAge, nextLocation || current.location)
    };
    if (tab === 'connected') {
      this.connectedList = updated;
    } else if (tab === 'requests') {
      this.requestsList = updated;
    } else {
      this.sentList = updated;
    }
    // Allow image to show after a successful new URL
    if (patch.avatar && this.isUsableAvatar(patch.avatar)) {
      this.failedAvatarIds = this.failedAvatarIds.filter((id) => id !== item.id && id !== current.id);
    }
    this.cdr.markForCheck();
  }

  private firstString(...values: unknown[]): string {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  }

  private formatDateLabel(value: unknown): string {
    if (!value) {
      return '';
    }
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return typeof value === 'string' ? value : '';
    }
    const now = new Date();
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    if (sameDay) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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

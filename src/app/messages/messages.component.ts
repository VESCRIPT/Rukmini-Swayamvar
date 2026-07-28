import { Component, Input, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewState, Language } from '../types';
import { ApiService } from '../services/api.service';
import { toAbsoluteMediaUrl } from '../core/utils/profile-image-url';

interface ChatUser {
  id: string | number;
  name: string;
  avatar: string;
  conversationId?: string;
  lastMessage?: string;
  callDuration?: string;
  time: string;
  unreadCount: number;
  isOnline: boolean;
  callType?: 'incoming' | 'outgoing' | 'missed';
  isVideo?: boolean;
}

export interface ChatOpenPayload {
  otherUserId: string | number;
  conversationId?: string;
  name?: string;
  avatar?: string;
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css']
})
export class MessagesComponent implements OnInit {
  @Input() t: any;
  @Output() viewChange = new EventEmitter<ViewState>();
  @Output() openChat = new EventEmitter<string | number | ChatOpenPayload>();

  private currentUserId: string | null = null;

  activeTab = 'chats';
  searchQuery = '';
  sidebarOpen = false;
  /** Header ⋮ menu */
  headerMenuOpen = false;

  /** True while conversations API request is in flight. */
  loadingConversations = false;
  /** Set when conversations API fails (e.g. network or 401). */
  conversationsError: string | null = null;

  /** Profile IDs for which the avatar image failed to load – show icon instead. */
  failedAvatarIds: (string | number)[] = [];

  /** Incoming connection requests (for "Connection requests" section). */
  connectionRequests: { id?: string; fromUserId: string; name: string; avatar?: string }[] = [];

  chatUsers: ChatUser[] = [
    // {
    //   id: 1,
    //   name: 'Priya Sharma',
    //   avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    //   lastMessage: 'Hi, how are you?',
    //    callDuration: '5:32',
    //   time: '2:30 PM',
    //   unreadCount: 2,
    //    isOnline: true,
    //    callType: 'outgoing',
    //   isVideo: false
    //  },
    // {
    //   id: 2,
    //   name: 'Anjali Patel',
    //   avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    //   lastMessage: 'Thank you for your message',
    //   callDuration: '12:15',
    //   time: 'Yesterday',
    //   unreadCount: 0,
    //   isOnline: false,
    //   callType: 'incoming',
    //   isVideo: true
    // },
    // {
    //   id: 3,
    //   name: 'Kavya Reddy',
    //   avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',
    //   lastMessage: 'Looking forward to meeting you',
    //   callDuration: '--',
    //   time: '2 days ago',
    //   unreadCount: 1,
    //   isOnline: true,
    //   callType: 'missed',
    //   isVideo: false
    // },
    // {
    //   id: 4,
    //   name: 'Meera Desai',
    //   avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop',
    //   lastMessage: 'That sounds great! Let\'s plan something',
    //   callDuration: '8:45',
    //   time: '3 days ago',
    //   unreadCount: 0,
    //   isOnline: false,
    //   callType: 'outgoing',
    //   isVideo: true
    // },
    // {
    //   id: 5,
    //   name: 'Sneha Kapoor',
    //   avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop',
    //   lastMessage: 'I would love to meet you',
    //   callDuration: '3:20',
    //   time: '4 days ago',
    //   unreadCount: 3,
    //   isOnline: true,
    //   callType: 'incoming',
    //   isVideo: false
    // },
    // {
    //   id: 6,
    //   name: 'Riya Malhotra',
    //   avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
    //   lastMessage: 'Thank you for connecting',
    //   callDuration: '15:10',
    //   time: '1 week ago',
    //   unreadCount: 0,
    //   isOnline: false,
    //   callType: 'outgoing',
    //   isVideo: true
    // },
    // {
    //   id: 7,
    //   name: 'Divya Iyer',
    //   avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    //   lastMessage: 'Hope you are doing well',
    //   callDuration: '--',
    //   time: '1 week ago',
    //   unreadCount: 1,
    //   isOnline: true,
    //   callType: 'missed',
    //   isVideo: false
    // },
    // {
    //   id: 8,
    //   name: 'Neha Gupta',
    //   avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    //   lastMessage: 'Looking forward to our conversation',
    //   callDuration: '6:55',
    //   time: '2 weeks ago',
    //   unreadCount: 0,
    //   isOnline: false,
    //   callType: 'incoming',
    //   isVideo: true
    // }
  ];

  constructor(private apiService: ApiService) { }

  private refreshInterval: any;

  ngOnInit(): void {
    this.currentUserId = this.resolveUserId();
    if (!this.currentUserId) {
      this.conversationsError = 'Please sign in to see your messages.';
      this.chatUsers = [];
      return;
    }
    this.loadConversations(this.currentUserId);
    this.loadConnectionRequests();
    
    // Auto-refresh the inbox every 5 seconds so new messages appear
    this.refreshInterval = setInterval(() => {
       if (this.currentUserId && !this.loadingConversations) {
         this.loadConversationsSilently(this.currentUserId);
       }
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private loadConversationsSilently(userId: string): void {
    this.apiService.listMyConversations(userId, 1, 20).subscribe({
      next: (response) => {
        const list = this.extractConversationList(response);
        const sorted = Array.isArray(list) ? [...list].sort((a, b) => this.getConversationSortTime(b) - this.getConversationSortTime(a)) : [];
        this.chatUsers = sorted.map((item, index) => this.mapConversationToChatUser(item, index, userId));
        this.fetchNamesForPlaceholders();
      },
      error: () => {
        // Silently ignore errors during polling
      }
    });
  }

  get filteredChats(): ChatUser[] {
    if (!this.searchQuery) return this.chatUsers;
    return this.chatUsers.filter(user =>
      user.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  onBack() {
    this.viewChange.emit('dashboard');
  }

  toggleHeaderMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.headerMenuOpen = !this.headerMenuOpen;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.headerMenuOpen = false;
  }

  onMessagesMenuSelect(action: 'refresh' | 'notifications' | 'settings' | 'help'): void {
    this.headerMenuOpen = false;
    switch (action) {
      case 'refresh':
        this.retryLoadConversations();
        break;
      case 'notifications':
        this.viewChange.emit('notification-settings');
        break;
      case 'settings':
        this.viewChange.emit('settings');
        break;
      case 'help':
        this.viewChange.emit('help-center');
        break;
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  setView(view: ViewState) {
    this.viewChange.emit(view);
  }

  onChatClick(user: ChatUser) {
    this.openChat.emit({
      otherUserId: user.id,
      conversationId: user.conversationId,
      name: user.name,
      avatar: user.avatar
    });
  }

  onNewMessage(): void {
    this.viewChange.emit('dashboard');
  }

  setTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'request') {
      this.loadConnectionRequests();
    }
  }

  onSearch(event: any) {
    this.searchQuery = event.target.value;
  }

  showProfileIcon(user: ChatUser): boolean {
    return !user.avatar ||
      this.failedAvatarIds.includes(user.id);
  }

  markAvatarFailed(userId: string | number): void {
    if (this.failedAvatarIds.includes(userId)) return;
    this.failedAvatarIds = [...this.failedAvatarIds, userId];
  }

  private loadConversations(userId: string): void {
    this.loadingConversations = true;
    this.conversationsError = null;
    this.apiService.listMyConversations(userId, 1, 20).subscribe({
      next: (response) => {
        this.loadingConversations = false;
        const list = this.extractConversationList(response);
        this.failedAvatarIds = [];
        const sorted = Array.isArray(list) ? [...list].sort((a, b) => this.getConversationSortTime(b) - this.getConversationSortTime(a)) : [];
        this.chatUsers = sorted.map((item, index) => this.mapConversationToChatUser(item, index, userId));
        this.fetchNamesForPlaceholders();
      },
      error: (error) => {
        this.loadingConversations = false;
        this.conversationsError = error?.error?.message || error?.message || 'Could not load messages. Please try again.';
        console.error('List conversations error:', error);
        this.chatUsers = [];
      }
    });
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

  /**
   * Unread count per your app logic: 1 when last message is incoming (senderId !== userId) and unread (readAt == null), else 0.
   * Uses lastMessage from list conversations API: senderId, readAt.
   */
  private computeUnreadCount(item: any, userId: string): number {
    const lastMsg = item?.lastMessage ?? item?.last_message;
    if (lastMsg == null || typeof lastMsg !== 'object') {
      const apiUnread = item?.unreadCount ?? item?.unread_count ?? item?.unread;
      return Math.max(0, Number(apiUnread) || 0);
    }
    const senderId = lastMsg?.senderId ?? lastMsg?.sender_id ?? lastMsg?.userId ?? lastMsg?.user_id ?? lastMsg?.from?.id ?? lastMsg?.from?._id;
    const readAt = lastMsg?.readAt ?? lastMsg?.read_at;
    if (senderId != null && String(senderId) !== userId && readAt == null) return 1;
    return 0;
  }

  /** Timestamp for sorting: newest message first (descending). Prefer last message time so newly sent messages show on top. */
  private getConversationSortTime(item: any): number {
    const raw = this.getConversationTimeRaw(item);
    if (raw === undefined || raw === null) return 0;
    const date = typeof raw === 'number' && raw < 1e12 ? new Date(raw * 1000) : new Date(raw);
    const t = date.getTime();
    return Number.isNaN(t) ? 0 : t;
  }

  private extractConversationList(response: any): any[] {
    if (!response || typeof response !== 'object') return [];
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data?.list)) return response.data.list;
    if (Array.isArray(response?.data?.items)) return response.data.items;
    if (Array.isArray(response?.data?.results)) return response.data.results;
    if (Array.isArray(response?.data?.conversations)) return response.data.conversations;
    if (Array.isArray(response?.data?.chats)) return response.data.chats;
    if (Array.isArray(response?.conversations)) return response.conversations;
    if (Array.isArray(response?.list)) return response.list;
    if (Array.isArray(response?.chats)) return response.chats;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  }

  private mapConversationToChatUser(item: any, index: number, userId: string): ChatUser {
    const participants = Array.isArray(item?.participants) ? item.participants : [];
    const otherParticipant = participants.find((p: any) => {
      const participantId = p?.id || p?.userId || p?._id;
      return participantId && String(participantId) !== userId;
    });

    const otherUser = item?.otherUser || item?.otherParticipant || otherParticipant || item?.user || item?.partner || {};
    const otherUserId =
      otherUser?.id ||
      otherUser?.userId ||
      otherUser?._id ||
      item?.otherUserId ||
      item?.otherUserId ||
      item?.participantId ||
      item?.receiverId ||
      item?.senderId ||
      `${index + 1}`;

    const nameFromOther = otherUser?.name || otherUser?.firstName || otherUser?.fullName || otherUser?.full_name
      || otherUser?.profile?.name || otherUser?.profile?.firstName;
    const nameFromItem = item?.name || item?.otherUserName || item?.other_user_name || item?.partnerName || item?.partner_name
      || item?.receiverName || item?.receiver_name || item?.senderName || item?.sender_name;
    const isCurrentUserSender = item?.senderId != null && String(item.senderId) === userId;
    const nameFromRole = isCurrentUserSender ? (item?.receiverName || item?.receiver_name) : (item?.senderName || item?.sender_name);
    const resolvedName = nameFromOther || nameFromItem || nameFromRole || `User ${index + 1}`;

    const lastMessageObj = item?.lastMessage;
    const lastMessageText =
      (typeof lastMessageObj === 'string' && lastMessageObj) ? lastMessageObj
        : (lastMessageObj && (lastMessageObj.text ?? lastMessageObj.content ?? lastMessageObj.body ?? lastMessageObj.message))
        || item?.message
        || item?.lastMessageText
        || 'Start conversation';

    const unread = this.computeUnreadCount(item, userId);

    const conversationId = item?.id || item?.conversationId || item?._id || undefined;
    const rawAvatar = otherUser?.avatar || otherUser?.profilePicture || otherUser?.profile_photo || otherUser?.profilePicture
      || item?.avatar || item?.profilePicture || item?.otherUserAvatar || '';
    const avatarUrl = this.normalizeAvatar(rawAvatar);
    return {
      id: otherUserId,
      name: resolvedName,
      avatar: avatarUrl || '',
      conversationId: typeof conversationId === 'string' ? conversationId : (conversationId != null ? String(conversationId) : undefined),
      lastMessage: String(lastMessageText),
      callDuration: '--',
      time: this.toDisplayTime(this.getConversationTimeRaw(item)),
      unreadCount: unread,
      isOnline: !!(otherUser?.isOnline || item?.isOnline),
      callType: 'incoming',
      isVideo: false
    };
  }

  /** When list API returns "User 1" style placeholders, fetch profile details to get real names. */
  private fetchNamesForPlaceholders(): void {
    this.chatUsers.forEach((user, i) => {
      if (!/^User \d+$/.test(user.name)) return;
      const id = user.id;
      this.apiService.getProfileDetails(String(id)).subscribe({
        next: (res) => {
          const name = this.extractNameFromProfile(res);
          const avatar = this.extractAvatarFromProfile(res);
          if (name || avatar) {
            const updated = this.chatUsers.slice();
            updated[i] = { ...updated[i], name: name || updated[i].name, avatar: avatar || updated[i].avatar };
            this.chatUsers = updated;
          }
        },
        error: () => { }
      });
    });
  }

  private extractNameFromProfile(response: any): string {
    if (!response || typeof response !== 'object') return '';
    const data = response?.data?.profile || response?.data?.user || response?.data || response?.profile || response?.user || response;
    if (!data || typeof data !== 'object') return '';
    const name = data.name || data.fullName || data.full_name || data.firstName || data.first_name;
    if (typeof name === 'string' && name.trim()) return name.trim();
    return '';
  }

  private extractAvatarFromProfile(response: any): string {
    if (!response || typeof response !== 'object') return '';
    const data = response?.data?.profile || response?.data?.user || response?.data || response?.profile || response?.user || response;
    if (!data || typeof data !== 'object') return '';
    const url = data.profilePicture || data.profile_picture || data.avatar || data.firstPhotoUrl || data.first_photo_url
      || data.photo || data.image;
    const normalizedTopLevel = this.normalizeAvatar(url);
    if (normalizedTopLevel) return normalizedTopLevel;

    if (Array.isArray(data.profilePhotos) && data.profilePhotos[0]) {
      const first = data.profilePhotos[0];
      const u = typeof first === 'string' ? first : first?.url;
      const normalizedPhoto = this.normalizeAvatar(u);
      if (normalizedPhoto) return normalizedPhoto;
    }
    return '';
  }

  /** All possible API fields for conversation / last message time (single source for display and sort). */
  private getConversationTimeRaw(item: any): any {
    const lastMsg = item?.lastMessage ?? item?.last_message;
    return (
      (lastMsg && typeof lastMsg === 'object' && (
        lastMsg.createdAt ?? lastMsg.created_at ?? lastMsg.timestamp ?? lastMsg.time
        ?? lastMsg.sentAt ?? lastMsg.sent_at ?? lastMsg.date ?? lastMsg.updatedAt ?? lastMsg.updated_at
      )) ??
      item?.lastMessageAt ?? item?.last_message_at ?? item?.lastActivityAt ?? item?.last_activity_at ??
      item?.updatedAt ?? item?.updated_at ?? item?.createdAt ?? item?.created_at ?? item?.timestamp
    );
  }

  private toDisplayTime(raw: any): string {
    if (raw === undefined || raw === null) return '';
    let date: Date;
    if (typeof raw === 'number') {
      date = raw < 1e12 ? new Date(raw * 1000) : new Date(raw);
    } else {
      date = new Date(raw);
    }
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((todayStart.getTime() - msgDayStart.getTime()) / 86400000);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 0) {
      const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
      if (diffMins < 1) return 'Just now';
      return timeStr;
    }
    if (diffDays === 1) return 'Yesterday';
    return '';
  }

  retryLoadConversations(): void {
    const userId = this.currentUserId || this.resolveUserId();
    if (userId) {
      this.currentUserId = userId;
      this.loadConversations(userId);
      this.loadConnectionRequests();
    }
  }

  private loadConnectionRequests(): void {
    const userId = this.currentUserId || this.resolveUserId();
    if (!userId) return;
    const profileId = localStorage.getItem('profile_user_id') || undefined;
    this.apiService.listConnectionRequests(userId, profileId).subscribe({
      next: (response) => {
        const list = this.extractConnectionRequestList(response);
        this.connectionRequests = list.map((item: any) => {
          const fromUserId = item?.fromUserId ?? item?.from_user_id ?? item?.userId ?? item?.user_id
            ?? item?.senderId ?? item?.sender_id ?? item?.requesterId ?? item?.requester_id
            ?? item?.requestFrom ?? item?.request_from
            ?? item?.from?.id ?? item?.from?._id ?? item?.from?.userId ?? item?.user?.id ?? item?.user?._id;
          const name = item?.name ?? item?.from?.name ?? item?.from?.fullName ?? item?.user?.name ?? item?.profile?.name ?? 'User';
          const avatar = item?.avatar ?? item?.from?.avatar ?? item?.from?.profilePicture ?? item?.user?.avatar ?? item?.profilePicture ?? item?.profile?.avatar ?? '';
          return {
            id: item?.id ?? item?._id,
            fromUserId: String(fromUserId ?? ''),
            name: typeof name === 'string' ? name : 'User',
            avatar: this.normalizeAvatar(avatar)
          };
        }).filter((r: any) => r.fromUserId);
        this.fetchNamesForConnectionRequests();
      },
      error: () => { }
    });
  }

  /** Fetch real name and avatar for connection requests that show "User" or have no name. */
  private fetchNamesForConnectionRequests(): void {
    this.connectionRequests.forEach((req, i) => {
      const needsName = !req.name || req.name === 'User' || /^User\s*\d*$/.test(req.name);
      if (!needsName && req.avatar) return;
      this.apiService.getProfileDetails(req.fromUserId).subscribe({
        next: (res) => {
          const name = this.extractNameFromProfile(res);
          const avatar = this.extractAvatarFromProfile(res);
          if (name || avatar) {
            const updated = [...this.connectionRequests];
            updated[i] = { ...updated[i], name: name || updated[i].name, avatar: avatar || updated[i].avatar };
            this.connectionRequests = updated;
          }
        },
        error: () => { }
      });
    });
  }

  private extractConnectionRequestList(response: any): any[] {
    if (!response || typeof response !== 'object') return [];
    if (Array.isArray(response)) return response;
    const data = response?.data ?? response;
    if (data && typeof data === 'object') {
      if (Array.isArray(data?.list)) return data.list;
      if (Array.isArray(data?.pending)) return data.pending;
      if (Array.isArray(data?.requests)) return data.requests;
      if (Array.isArray(data?.connectionRequests)) return data.connectionRequests;
      if (Array.isArray(data?.pendingRequests)) return data.pendingRequests;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data)) return data;
    }
    if (Array.isArray(response?.list)) return response.list;
    if (Array.isArray(response?.pending)) return response.pending;
    if (Array.isArray(response?.requests)) return response.requests;
    if (Array.isArray(response?.result)) return response.result;
    return [];
  }

  acceptConnectionRequest(req: { fromUserId: string; name: string; avatar?: string }): void {
    const userId = this.currentUserId || this.resolveUserId();
    if (!userId) return;
    this.apiService.acceptConnectionRequest(userId, req.fromUserId).subscribe({
      next: () => {
        this.connectionRequests = this.connectionRequests.filter(r => r.fromUserId !== req.fromUserId);
        this.loadConversations(userId);
        this.openChat.emit({
          otherUserId: req.fromUserId,
          name: req.name,
          avatar: req.avatar ?? ''
        });
      },
      error: () => { }
    });
  }

  declineConnectionRequest(req: { fromUserId: string }): void {
    const userId = this.currentUserId || this.resolveUserId();
    if (!userId) return;
    this.apiService.declineConnectionRequest(userId, req.fromUserId).subscribe({
      next: () => {
        this.connectionRequests = this.connectionRequests.filter(r => r.fromUserId !== req.fromUserId);
      },
      error: () => { }
    });
  }

  private normalizeAvatar(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') {
      return toAbsoluteMediaUrl(value);
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const raw = record['url'] ?? record['path'] ?? record['src'] ?? record['avatar'] ?? record['image'];
      return typeof raw === 'string' ? toAbsoluteMediaUrl(raw) : '';
    }
    return '';
  }
}
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewChecked, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewState } from '../types';
import { ApiService } from '../services/api.service';
import {
  ChatThemeSettings,
  DEFAULT_CHAT_THEME,
  buildThemeBodyStyle,
  cloneTheme,
  loadThemeFromStorage,
  saveThemeToStorage,
  themeBgMode,
  themeBodyClassList,
  themePreviewSurfaceClassList,
} from './chat-theme-settings.model';

interface Message {
  id: number | string;
  text: string;
  time: string;
  isMe: boolean;
}

interface ChatUser {
  id: number | string;
  name: string;
  avatar: string;
  isOnline: boolean;
}

@Component({
  selector: 'app-chat-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-detail.component.html',
  styleUrls: ['./chat-detail.component.css']
})
export class ChatDetailComponent implements OnInit, OnChanges, AfterViewChecked {
  @Input() t: any;
  @Input() userId!: string | number;
  @Input() conversationId?: string | null;
  @Input() otherUserInfo?: { name: string; avatar: string } | null;
  /** 'connected' = full chat; 'pending_sent' = request sent, allow one message; 'pending_received' = they requested, accept in Request tab; 'none' = show Connect to message */
  @Input() connectionStatus: 'connected' | 'pending_sent' | 'pending_received' | 'none' = 'connected';
  @Output() viewChange = new EventEmitter<ViewState>();
  @Output() backToMessages = new EventEmitter<void>();
  @Output() connectionStatusChange = new EventEmitter<'connected' | 'pending_sent' | 'pending_received' | 'none'>();
  /** Parent can handle block / report; theme opens in-app modal but still emits for optional hooks. */
  @Output() chatMenuAction = new EventEmitter<'block' | 'unblock' | 'report' | 'theme'>();
  /** Emitted when user picks file(s) via the attach button; optional upload hook. */
  @Output() filesSelected = new EventEmitter<FileList>();
  @ViewChild('messagesContainer') private messagesContainerRef?: ElementRef<HTMLDivElement>;
  private shouldScrollToBottom = false;

  newMessage = '';
  /** When connectionStatus is pending_sent, allow only one message until accepted. */
  hasSentIntroMessage = false;
  connectRequestSending = false;
  /** Header avatar image failed to load – show profile icon instead. */
  headerAvatarFailed = false;
  /** Kebab menu in chat header */
  headerMenuOpen = false;

  /** Persisted chat appearance (messages + input area only). */
  savedTheme: ChatThemeSettings = cloneTheme(DEFAULT_CHAT_THEME);
  /** Editable copy while theme modal is open. */
  draftTheme: ChatThemeSettings = cloneTheme(DEFAULT_CHAT_THEME);
  themeModalOpen = false;

  reportModalOpen = false;
  readonly reportReasons: string[] = [
    'Spam',
    'Harassment',
    'Fake profile',
    'Inappropriate content',
    'Scam',
    'Child safety concerns',
    'Other'
  ];
  selectedReportReason = this.reportReasons[0];
  reportDetails = '';
  readonly reportDetailsMaxLength = 5000;
  reportSubmitting = false;

  blockModalOpen = false;
  blockReason = '';
  readonly blockReasonMaxLength = 500;
  blockSubmitting = false;

  chatUsers: ChatUser[] = [
    // { id: 1, name: 'Priya Sharma', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', isOnline: true },
    // { id: 2, name: 'Anjali Patel', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', isOnline: false },
    // { id: 3, name: 'Kavya Reddy', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', isOnline: true }
  ];

  messages: Message[] = [];

  private refreshInterval: any;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.savedTheme = loadThemeFromStorage();
    if (this.connectionStatus !== 'none' && this.connectionStatus !== 'pending_received') {
      this.initializeConversationAndLoadMessages();
      this.startPolling();
    }
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private startPolling(): void {
    this.refreshInterval = setInterval(() => {
      const currentUserId = this.resolveUserId();
      const convId = this.conversationId || localStorage.getItem('active_conversation_id');
      if (currentUserId && convId && this.connectionStatus !== 'none' && this.connectionStatus !== 'pending_received') {
        this.loadMessagesSilently(currentUserId, convId);
      }
    }, 3000);
  }

  private loadMessagesSilently(userId: string, conversationId: string): void {
    this.apiService.listMessages({
      userId,
      conversationId,
      page: 1,
      limit: 50,
      markRead: true
    }).subscribe({
      next: (response) => {
        const list = this.extractMessageList(response);
        const serverMessages = list.map((item, index) => this.mapApiMessage(item, index, userId));

        // Keep in-flight optimistic sends until the server returns the same text
        const pendingOptimistic = this.messages.filter(m => this.isOptimisticMessage(m));
        const stillPending = pendingOptimistic.filter(
          opt => !serverMessages.some(srv => srv.isMe && srv.text === opt.text)
        );

        const merged = [...serverMessages, ...stillPending];
        const changed =
          merged.length !== this.messages.length ||
          merged.some((m, i) => m.id !== this.messages[i]?.id || m.text !== this.messages[i]?.text);

        if (changed) {
          this.messages = merged;
          this.scrollToBottomAfterSend();
        }
      },
      error: () => {}
    });
  }

  /** Negative numeric ids are local-only until the server echoes the message. */
  private isOptimisticMessage(msg: Message): boolean {
    return typeof msg.id === 'number' && msg.id < 0;
  }

  /** Live chat uses draft while the theme modal is open so background (and other) picks apply immediately. */
  private get effectiveThemeForChat(): ChatThemeSettings {
    return this.themeModalOpen ? this.draftTheme : this.savedTheme;
  }

  get appliedThemeStyles(): Record<string, string> {
    return buildThemeBodyStyle(this.effectiveThemeForChat);
  }

  get appliedThemeClasses(): string[] {
    return themeBodyClassList(this.effectiveThemeForChat);
  }

  get appliedBgMode(): 'solid' | 'image' {
    return themeBgMode(this.effectiveThemeForChat);
  }

  get draftThemeStyles(): Record<string, string> {
    return buildThemeBodyStyle(this.draftTheme);
  }

  get draftThemeClasses(): string[] {
    return themeBodyClassList(this.draftTheme);
  }

  get draftBgMode(): 'solid' | 'image' {
    return themeBgMode(this.draftTheme);
  }

  get draftPreviewClasses(): string[] {
    return themePreviewSurfaceClassList(this.draftTheme);
  }

  /** Sample bubbles for the theme modal preview. */
  readonly previewMessages: { text: string; time: string; isMe: boolean }[] = [
    { text: 'Hey! How are you?', time: '10:00 AM', isMe: false },
    { text: 'Doing great!', time: '10:01 AM', isMe: true },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    const userIdChanged = changes['userId'] || changes['conversationId'];
    const statusChanged = changes['connectionStatus'];
    if (changes['userId'] || changes['otherUserInfo']) {
      this.headerAvatarFailed = false;
    }
    if (statusChanged && !statusChanged.firstChange) {
      this.hasSentIntroMessage = false;
    }
    if (userIdChanged && !userIdChanged.firstChange) {
      this.messages = [];
      this.hasSentIntroMessage = false;
      if (this.connectionStatus !== 'none' && this.connectionStatus !== 'pending_received') {
        this.initializeConversationAndLoadMessages();
      }
    }
  }

  get currentUser(): ChatUser {
    if (this.otherUserInfo) {
      return {
        id: this.userId,
        name: this.otherUserInfo.name,
        avatar: this.otherUserInfo.avatar || '',
        isOnline: false
      };
    }
    const selectedUserId = this.userId != null ? Number(this.userId) : NaN;
    if (!Number.isFinite(selectedUserId)) return this.chatUsers[0];
    return this.chatUsers.find(u => u.id === selectedUserId) || this.chatUsers[0];
  }

  onBack() {
    this.backToMessages.emit();
  }

  toggleHeaderMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.headerMenuOpen = !this.headerMenuOpen;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.headerMenuOpen = false;
  }

  @HostListener('document:keydown', ['$event'])
  onEscapePress(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      if (this.themeModalOpen) this.cancelThemeModal();
      if (this.reportModalOpen) this.closeReportModal();
      if (this.blockModalOpen) this.closeBlockModal();
    }
  }

  onHeaderMenuSelect(action: 'block' | 'unblock' | 'report' | 'theme'): void {
    this.headerMenuOpen = false;
    if (action === 'theme') {
      this.openThemeModal();
      this.chatMenuAction.emit('theme');
      return;
    }
    
    if (action === 'block') {
      this.handleBlockUser();
    } else if (action === 'unblock') {
      this.handleUnblockUser();
    } else if (action === 'report') {
      this.handleReportUser();
    }
    
    this.chatMenuAction.emit(action);
  }

  private handleBlockUser(): void {
    this.openBlockModal();
  }

  private handleUnblockUser(): void {
    const currentUserId = this.resolveUserId();
    const otherUserId = this.userId;
    if (!currentUserId || !otherUserId) return;
    
    this.apiService.unblockUser({ userId: currentUserId, blockedUserId: String(otherUserId) } as any).subscribe({
      next: () => {
        window.alert(`You have unblocked ${this.currentUser.name}.`);
      },
      error: (err) => {
        const msg = err?.error?.message || err?.error?.error || 'Failed to unblock user.';
        window.alert(msg);
      }
    });
  }

  private handleReportUser(): void {
    this.openReportModal();
  }

  openReportModal(): void {
    this.selectedReportReason = this.reportReasons[0];
    this.reportDetails = '';
    this.reportModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeReportModal(): void {
    this.reportModalOpen = false;
    if (!this.blockModalOpen && !this.themeModalOpen) {
      document.body.style.overflow = '';
    }
  }

  setReportReason(reason: string): void {
    this.selectedReportReason = reason;
  }

  onReportDetailsInput(value: string): void {
    this.reportDetails = value.slice(0, this.reportDetailsMaxLength);
  }

  submitReport(): void {
    if (!this.selectedReportReason || this.reportSubmitting) return;

    const currentUserId = this.resolveUserId();
    const otherUserId = this.userId;
    if (!currentUserId || !otherUserId) return;

    const payload = {
      userId: currentUserId,
      reportedUserId: String(otherUserId),
      reason: this.mapReportReason(this.selectedReportReason),
      details: this.reportDetails.trim() || undefined
    };

    this.reportSubmitting = true;
    this.apiService.submitUserReport(payload as any).subscribe({
      next: (res: any) => {
        this.reportSubmitting = false;
        this.chatMenuAction.emit('report');
        this.closeReportModal();
        window.alert(res?.message || 'Report submitted successfully.');
      },
      error: (err: any) => {
        this.reportSubmitting = false;
        const apiMessage = err?.error?.message || err?.error?.error;
        window.alert(apiMessage || 'Unable to submit report. Please try again.');
      }
    });
  }

  openBlockModal(): void {
    this.blockReason = '';
    this.blockModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeBlockModal(): void {
    this.blockModalOpen = false;
    if (!this.reportModalOpen && !this.themeModalOpen) {
      document.body.style.overflow = '';
    }
  }

  onBlockReasonInput(value: string): void {
    this.blockReason = value.slice(0, this.blockReasonMaxLength);
  }

  submitBlock(): void {
    if (this.blockSubmitting) return;

    const currentUserId = this.resolveUserId();
    const otherUserId = this.userId;
    if (!currentUserId || !otherUserId) return;

    const payload = {
      userId: currentUserId,
      blockedUserId: String(otherUserId),
      reason: this.blockReason.trim() || undefined
    };

    this.blockSubmitting = true;
    this.apiService.blockUser(payload as any).subscribe({
      next: (res: any) => {
        this.blockSubmitting = false;
        this.chatMenuAction.emit('block');
        this.closeBlockModal();
        window.alert(res?.message || 'User blocked successfully.');
      },
      error: (err: any) => {
        this.blockSubmitting = false;
        const apiMessage = err?.error?.message || err?.error?.error;
        window.alert(apiMessage || 'Unable to block user. Please try again.');
      }
    });
  }

  private mapReportReason(reason: string): string {
    const normalized = reason.trim().toLowerCase();
    switch (normalized) {
      case 'fake profile': return 'fake_profile';
      case 'inappropriate content': return 'inappropriate_content';
      case 'child safety concerns': return 'child_safety_concerns';
      default: return normalized.replace(/\s+/g, '_');
    }
  }

  openThemeModal(): void {
    this.draftTheme = cloneTheme(this.savedTheme);
    this.themeModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  cancelThemeModal(): void {
    this.themeModalOpen = false;
    if (!this.reportModalOpen && !this.blockModalOpen) {
      document.body.style.overflow = '';
    }
  }

  applyThemeModal(): void {
    this.savedTheme = cloneTheme(this.draftTheme);
    saveThemeToStorage(this.savedTheme);
    this.themeModalOpen = false;
    if (!this.reportModalOpen && !this.blockModalOpen) {
      document.body.style.overflow = '';
    }
  }

  setDraft(partial: Partial<ChatThemeSettings>): void {
    this.draftTheme = { ...this.draftTheme, ...partial };
  }

  onWallpaperSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      if (url.length > 2_400_000) {
        input.value = '';
        return;
      }
      this.setDraft({ background: 'image', wallpaperDataUrl: url });
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  clearWallpaper(): void {
    this.setDraft({ wallpaperDataUrl: null, background: this.draftTheme.background === 'image' ? 'default' : this.draftTheme.background });
  }

  openFilePicker(input: HTMLInputElement): void {
    input.click();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.filesSelected.emit(files);
    }
    input.value = '';
  }

  sendMessage() {
    const content = this.newMessage.trim();
    if (!content) return;
    if (this.connectionStatus === 'pending_received' || (this.connectionStatus === 'pending_sent' && this.hasSentIntroMessage)) return;

    const optimisticMessage: Message = {
      id: -Date.now(),
      text: content,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    };

    this.messages = [...this.messages, optimisticMessage];
    this.newMessage = '';
    if (this.connectionStatus === 'pending_sent') {
      this.hasSentIntroMessage = true;
    }
    this.scrollToBottomAfterSend();
    this.sendMessageToApi(content, optimisticMessage.id as number);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.shouldScrollToBottom = false;
      this.doScrollToBottom();
    }
  }

  private scrollToBottomAfterSend(): void {
    this.shouldScrollToBottom = true;
  }

  private doScrollToBottom(): void {
    const el = this.messagesContainerRef?.nativeElement;
    if (el) {
      setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 0);
    }
  }

  connectToMessage(): void {
    const currentUserId = this.resolveUserId();
    if (!currentUserId || this.userId == null || this.connectRequestSending) return;
    this.connectRequestSending = true;
    const otherUserId = String(this.userId);
    const other = this.currentUser;
    this.apiService.sendConnectionRequest(currentUserId, otherUserId).subscribe({
      next: () => {
        this.connectRequestSending = false;
        this.apiService.trackSentConnection({
          otherUserId,
          name: other?.name || this.otherUserInfo?.name || 'User',
          avatar: other?.avatar || this.otherUserInfo?.avatar || '',
        });
        this.apiService.createOrGetConversation({ userId: currentUserId, otherUserId }).subscribe({
          next: (res) => {
            const convId = res?.data?.conversationId ?? res?.data?._id ?? res?.conversationId ?? res?._id;
            if (convId) {
              localStorage.setItem('active_conversation_id', String(convId));
              this.apiService.trackSentConnection({
                otherUserId,
                name: other?.name || this.otherUserInfo?.name || 'User',
                avatar: other?.avatar || this.otherUserInfo?.avatar || '',
                conversationId: String(convId)
              });
            }
            this.connectionStatusChange.emit('pending_sent');
          },
          error: () => {
            this.connectionStatusChange.emit('pending_sent');
          }
        });
      },
      error: () => {
        this.connectRequestSending = false;
        // Still track if request may have been created (e.g. already-sent error)
        this.apiService.trackSentConnection({
          otherUserId,
          name: other?.name || this.otherUserInfo?.name || 'User',
          avatar: other?.avatar || this.otherUserInfo?.avatar || '',
        });
        this.apiService.createOrGetConversation({ userId: currentUserId, otherUserId }).subscribe({
          next: (res) => {
            const convId = res?.data?.conversationId ?? res?.data?._id ?? res?.conversationId ?? res?._id;
            if (convId) localStorage.setItem('active_conversation_id', String(convId));
            this.connectionStatusChange.emit('pending_sent');
          },
          error: () => this.connectionStatusChange.emit('pending_sent')
        });
      }
    });
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.sendMessage();
    }
  }

  private sendMessageToApi(content: string, optimisticMessageId: number | string): void {
    const currentUserId = this.resolveUserId();
    if (!currentUserId) {
      this.rollbackOptimisticMessage(optimisticMessageId);
      return;
    }

    const convId = this.conversationId || localStorage.getItem('active_conversation_id');
    if (convId) {
      const normalized = String(convId).trim();
      if (normalized) {
        localStorage.setItem('active_conversation_id', normalized);
        this.postMessage(currentUserId, normalized, content, optimisticMessageId);
        return;
      }
    }

    this.apiService.createOrGetConversation({
      userId: currentUserId,
      otherUserId: String(this.userId)
    }).subscribe({
      next: (response) => {
        const conversationId =
          response?.data?.conversationId ||
          response?.data?._id ||
          response?.conversationId ||
          response?._id;

        if (!conversationId) {
          this.rollbackOptimisticMessage(optimisticMessageId);
          return;
        }

        const normalizedConversationId = String(conversationId);
        localStorage.setItem('active_conversation_id', normalizedConversationId);
        this.postMessage(currentUserId, normalizedConversationId, content, optimisticMessageId);
      },
      error: (error) => {
        this.rollbackOptimisticMessage(optimisticMessageId);
        console.error('Create/Get conversation before send error:', error);
      }
    });
  }

  private postMessage(userId: string, conversationId: string, content: string, optimisticMessageId: number | string): void {
    this.apiService.sendMessage({ userId, conversationId, content }).subscribe({
      next: () => {
        this.loadMessagesSilently(userId, conversationId);
      },
      error: (error) => {
        this.rollbackOptimisticMessage(optimisticMessageId);
        console.error('Send message error:', error);
      }
    });
  }

  private rollbackOptimisticMessage(messageId: number | string): void {
    this.messages = this.messages.filter(msg => msg.id !== messageId);
  }

  private initializeConversationAndLoadMessages(): void {
    const currentUserId = this.resolveUserId();
    if (!currentUserId || this.userId == null) {
      return;
    }

    this.messages = [];

    const convId = this.conversationId || localStorage.getItem('active_conversation_id');
    if (convId) {
      localStorage.setItem('active_conversation_id', convId);
      this.loadMessages(currentUserId, convId);
      return;
    }

    this.apiService.createOrGetConversation({
      userId: currentUserId,
      otherUserId: String(this.userId)
    }).subscribe({
      next: (response) => {
        const conversationId =
          response?.data?.conversationId ||
          response?.data?._id ||
          response?.conversationId ||
          response?._id;

        if (!conversationId) {
          return;
        }

        const normalizedConversationId = String(conversationId);
        localStorage.setItem('active_conversation_id', normalizedConversationId);
        this.loadMessages(currentUserId, normalizedConversationId);
      },
      error: (error) => {
        console.error('Create/Get conversation before list messages error:', error);
      }
    });
  }

  private loadMessages(userId: string, conversationId: string): void {
    this.apiService.listMessages({
      userId,
      conversationId,
      page: 1,
      limit: 50,
      markRead: true
    }).subscribe({
      next: (response) => {
        const list = this.extractMessageList(response);
        this.messages = list.map((item, index) => this.mapApiMessage(item, index, userId));
        this.scrollToBottomAfterSend();
      },
      error: (error) => {
        console.error('List messages error:', error);
      }
    });
  }

  private extractMessageList(response: any): any[] {
    if (!response || typeof response !== 'object') return [];
    if (Array.isArray(response)) return response;
    const data = response?.data ?? response;
    if (Array.isArray(data?.list)) return data.list;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.messages)) return data.messages;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(response?.list)) return response.list;
    if (Array.isArray(response?.messages)) return response.messages;
    return [];
  }

  private mapApiMessage(rawItem: any, index: number, currentUserId: string): Message {
    // If backend returns raw Sequelize instances, the actual data is inside dataValues
    const item = rawItem?.dataValues ? rawItem.dataValues : rawItem;
    
    const messageId = item?.id ?? item?._id ?? index + 1;
    let senderId = item?.senderId ?? item?.sender_id ?? item?.userId ?? item?.user_id
      ?? item?.sender?.id ?? item?.sender?._id ?? item?.sender?.userId ?? item?.from?.id ?? item?.from?._id
      ?? item?.authorId ?? item?.author_id;
      
    if (!senderId && typeof item?.sender === 'string') senderId = item.sender;
    if (!senderId && typeof item?.from === 'string') senderId = item.from;
    if (!senderId && typeof item?.user === 'string') senderId = item.user;
      
    let content = item?.content ?? item?.text ?? item?.message ?? item?.body ?? item?.msg ?? item?.chatText;
    
    if (typeof content === 'object' && content !== null) {
        content = content.text ?? content.content ?? content.message ?? content.body ?? JSON.stringify(content);
    } else if (!content && typeof item === 'string') {
        content = item;
    } else if (!content && typeof item === 'object') {
        // Fallback: maybe it's in a nested object, or stringify if absolutely nothing is found
        content = item?.data?.content ?? item?.data?.text ?? JSON.stringify(item);
    }
    
    const timeSource = item?.createdAt ?? item?.created_at ?? item?.time ?? item?.timestamp;

    const isMe = senderId != null && (String(senderId) === String(currentUserId));

    return {
      id: Number.isFinite(Number(messageId)) ? Number(messageId) : messageId,
      text: String(content),
      time: this.formatTime(timeSource),
      isMe
    };
  }

  private formatTime(raw: any): string {
    if (!raw) {
      return '';
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return String(raw);
    }

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
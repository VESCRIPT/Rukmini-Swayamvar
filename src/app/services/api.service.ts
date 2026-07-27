import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { map, tap, catchError, switchMap, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CreateProfileRequest, CreateProfileResponse } from '../models/create-profile.model';

export interface AuthResponse {
  status: string;
  success: boolean;
  message?: string;
  token?: string;
  user?: any;
  data?: any;
}

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterRequest {
  email?: string;
  phone?: string;
  password: string;
  name?: string;
}

export interface OtpRequest {
  email?: string;
  phone?: string;
}

export interface VerifyOtpRequest {
  email?: string;
  phone?: string;
  otp: string;
}

export interface DeactivateAccountPayload {
  userId: string;
  password: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface SuccessStorySubmitPayload {
  photos: File[];
  story?: string;
  weddingDate?: string;
  spouseName?: string;
  spouseUserId?: string;
}

export interface SuccessStoriesListPayload {
  page: number;
  limit: number;
}

export interface SuccessStoriesMinePayload {
  userId: string;
  page: number;
  limit: number;
}

export interface PartnerPreferencesPayload {
  userId: string;
  age_range: [number, number];
  height_range: [number, number];
  income_range: [number, number];
  country_select: string[];
  marital_status: string;
  religion: string;
  residential_status?: string;
  occupation?: string;
  education?: string;
  qualification?: string;
  mother_tongue?: string;
}

export interface FavoritePayload {
  userId: string;
  profileId: string;
}

export interface FavoritesListPayload {
  userId: string;
  page?: number;
  limit?: number;
}

export interface ConversationPayload {
  userId: string;
  otherUserId: string;
}

export interface SendMessagePayload {
  userId: string;
  conversationId: string;
  content: string;
}

export interface ListMessagesPayload {
  userId: string;
  conversationId: string;
  page?: number;
  limit?: number;
  markRead?: boolean;
}

export interface ListAllUsersPayload {
  userId: string;
}

export interface ListProfilesByPartnerPreferencesPayload {
  userId: string;
  page?: number;
  limit?: number;
  includeAllGenders?: boolean;
}

export interface GetProfileDetailsPayload {
  userId: string;
}

export interface SubmitReportPayload {
  userId: string;
  reportedUserId: string;
  reason: string;
  details?: string;
}

export interface MyReportsListPayload {
  userId: string;
}

export interface MyAccountReportsListPayload {
  userId: string;
  page: number;
  limit: number;
}

export interface BlockUserPayload {
  userId: string;
  blockedUserId: string;
  reason?: string;
}

export interface BlockedUsersListPayload {
  userId: string;
}

export interface UnblockUserPayload {
  userId: string;
  blockedUserId: string;
}

export interface NotificationsListPayload {
  userId: string;
  page?: number;
  limit?: number;
}

export interface MarkNotificationReadPayload {
  userId: string;
  notificationId: string;
}

export interface MarkMultipleNotificationsReadPayload {
  userId: string;
  notificationIds: string[];
}

export interface PushNotificationTestPayload {
  userId: string;
  title?: string;
  message?: string;
}

export interface CreateTicketPayload {
  userId: string;
  subject: string;
  category: string;
  message: string;
}

export interface ListTicketsPayload {
  userId: string;
  page: number;
  limit: number;
}

export interface TicketDetailPayload {
  userId: string;
  ticketId: string | number;
}

export interface ReplyTicketPayload {
  userId: string;
  ticketId: string | number;
  message: string;
}

export interface CommunityEventsListPayload {
  page?: number;
  limit?: number;
  category: 'marriage_meetup' | 'religious_gathering';
  upcomingOnly: boolean;
}

export interface CommunityEventDetailPayload {
  eventId: string | number;
  userId: string;
}

export interface CommunityEventRsvpPayload {
  eventId: string | number;
  userId: string;
  status: 'going' | 'interested' | 'none';
}

export interface TeachingsListPayload {
  page?: number;
  limit?: number;
  category: 'history' | 'traditions' | 'marriage_guidelines';
}

export interface TeachingDetailPayload {
  articleId?: string | number;
  slug?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;
  private unavailableNotificationPaths = new Set<string>();
  private pendingPhotosEndpointMode: 'unknown' | 'get' | 'post' | 'approval' | 'none' = 'unknown';
  private successStoriesListCache$: Observable<any> | null = null;

  constructor(private http: HttpClient) {}

  private normalizeResponse<T extends AuthResponse>(response: T): T {
    if (response && typeof response.success !== 'boolean') {
      const hasToken = !!this.extractToken(response);
      const statusOk =
        (response as { status?: string }).status === 'success' ||
        (response as { status?: string }).status === 'ok';
      const success = hasToken || statusOk || (response as { user?: unknown }).user != null;
      return { ...response, success: success ? true : response.success ?? true };
    }
    return response;
  }

  /** Read JWT/session token from common API response shapes. */
  extractToken(response: unknown): string | null {
    if (!response || typeof response !== 'object') {
      return null;
    }
    const r = response as Record<string, unknown>;
    const d =
      r['data'] && typeof r['data'] === 'object'
        ? (r['data'] as Record<string, unknown>)
        : null;
    const candidates = [
      r['token'],
      r['accessToken'],
      r['access_token'],
      r['jwt'],
      d?.['token'],
      d?.['accessToken'],
      d?.['access_token'],
      d?.['jwt']
    ];
    for (const value of candidates) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return null;
  }

  private persistAuth(response: AuthResponse): void {
    const token = this.extractToken(response);
    if (token) {
      this.setToken(token);
      // Normalise token to top level so callers can read it
      (response as any).token = token;
    }

    let userToSet: any = null;

    if (response.user) {
      userToSet = response.user;
    } else {
      const dataUser = response.data?.user;
      if (dataUser) {
        userToSet = dataUser;
      } else {
        const userId =
          (response as any).userId ||
          (response as any).id ||
          response.user?.id ||
          (response.user as any)?.userId ||
          (response.data as any)?.userId ||
          (response.data as any)?.id;
        if (userId) {
          const email =
            (response as any).email ||
            (response.user as any)?.email ||
            (response.data as any)?.email;
          userToSet = email ? { id: userId, userId, email } : { id: userId, userId };
        }
      }
    }

    if (userToSet) {
      const existing = this.getUser();
      const sameUser = existing && userToSet && (
        String(existing.id || existing.userId) === String(userToSet.id || userToSet.userId)
      );
      if (sameUser && existing) {
        if ((existing.firstName != null && existing.firstName !== '') && !(userToSet.firstName != null && userToSet.firstName !== '')) {
          userToSet = { ...userToSet, firstName: existing.firstName };
        }
        if ((existing.name != null && existing.name !== '') && !(userToSet.name != null && userToSet.name !== '')) {
          userToSet = { ...userToSet, name: existing.name };
        }
      }
      this.setUser(userToSet);
      const currentUserId = userToSet.id || userToSet.userId;
      if (currentUserId != null) {
        localStorage.setItem('profile_user_id', String(currentUserId));
      }
    }
  }

  // Authentication Methods
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, credentials).pipe(
      map(response => this.normalizeResponse(response)),
      tap(response => this.persistAuth(response))
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, userData).pipe(
      map(response => this.normalizeResponse(response)),
      tap(response => this.persistAuth(response))
    );
  }

  sendOtp(data: OtpRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/send-otp`, data).pipe(
      map(response => this.normalizeResponse(response))
    );
  }

  resendOtp(data: OtpRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/resend-otp`, data).pipe(
      map(response => this.normalizeResponse(response))
    );
  }

  verifyOtp(data: VerifyOtpRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/verify-otp`, data).pipe(
      map(response => this.normalizeResponse(response)),
      tap(response => this.persistAuth(response))
    );
  }

  setPassword(data: { email?: string; password: string; confirmPassword?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/set-password`, data).pipe(
      map(response => this.normalizeResponse(response)),
      tap(response => this.persistAuth(response))
    );
  }

  forgotPassword(data: { email: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/forgot-password`, data).pipe(
      map(response => this.normalizeResponse(response))
    );
  }

  resetPassword(payload: ResetPasswordPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/reset-password`, payload).pipe(
      map(response => this.normalizeResponse(response))
    );
  }

  changePassword(payload: ChangePasswordPayload): Observable<AuthResponse> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/change-password`, payload, options).pipe(
      map(response => this.normalizeResponse(response))
    );
  }

  deactivateAccount(payload: DeactivateAccountPayload): Observable<AuthResponse> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/deactivate-account`, payload, options).pipe(
      map(response => this.normalizeResponse(response))
    );
  }

  submitSuccessStory(userId: string, payload: SuccessStorySubmitPayload): Observable<any> {
    const token = this.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    const formData = new FormData();

    payload.photos.forEach((photo) => {
      formData.append('photos', photo, photo.name);
    });
    if (payload.story?.trim()) formData.append('story', payload.story.trim());
    if (payload.weddingDate?.trim()) formData.append('weddingDate', payload.weddingDate.trim());
    if (payload.spouseName?.trim()) formData.append('spouseName', payload.spouseName.trim());
    if (payload.spouseUserId?.trim()) formData.append('spouseUserId', payload.spouseUserId.trim());

    const url = `${this.baseUrl}/success-stories?userId=${encodeURIComponent(userId)}`;
    return this.http.post<any>(url, formData, { headers }).pipe(
      tap(() => this.clearSuccessStoriesCache())
    );
  }

  /** Cached list for fast repeat loads (home + gallery share one request). */
  listSuccessStories(payload: SuccessStoriesListPayload = { page: 1, limit: 12 }): Observable<any> {
    const page = payload?.page ?? 1;
    const limit = payload?.limit ?? 12;
    // Only cache the default first page used by UI.
    if (page === 1 && limit <= 12) {
      if (!this.successStoriesListCache$) {
        this.successStoriesListCache$ = this.fetchSuccessStoriesList({ page: 1, limit: 12 }).pipe(
          shareReplay({ bufferSize: 1, refCount: false })
        );
      }
      return this.successStoriesListCache$;
    }
    return this.fetchSuccessStoriesList({ page, limit });
  }

  /** Kick off the list request early (e.g. on home init) so UI mounts with data ready. */
  prefetchSuccessStories(): void {
    this.listSuccessStories({ page: 1, limit: 12 }).subscribe({ next: () => {}, error: () => {} });
  }

  clearSuccessStoriesCache(): void {
    this.successStoriesListCache$ = null;
  }

  private fetchSuccessStoriesList(payload: SuccessStoriesListPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post<any>(`${this.baseUrl}/success-stories/list`, payload, options);
  }

  listMySuccessStories(payload: SuccessStoriesMinePayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post<any>(`${this.baseUrl}/success-stories/mine`, payload, options);
  }

  // Profile Methods
  /** POST /api/auth/create-profile — see CreateProfileRequest for body shape. */
  createProfile(profileData: CreateProfileRequest): Observable<CreateProfileResponse & AuthResponse> {
    return this.http
      .post<CreateProfileResponse & AuthResponse>(`${this.baseUrl}/auth/create-profile`, profileData)
      .pipe(
        map((response) => this.normalizeResponse(response)),
        tap((response) => this.persistAuth(response))
      );
  }

  /** @deprecated Use MatchmakingService.savePreferences (PUT /matchmaking/preferences). */
  savePartnerPreferences(payload: PartnerPreferencesPayload): Observable<AuthResponse> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    return this.http.post<AuthResponse>(`${this.baseUrl}/preferences`, payload, options).pipe(
      map(response => this.normalizeResponse(response))
    );
  }

  /** @deprecated Use MatchmakingService.getPreferences (GET /matchmaking/preferences). */
  getPartnerPreferences(userId: string): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    return this.http.get<any>(`${this.baseUrl}/preferences?userId=${userId}`, options);
  }

  addToFavorites(payload: FavoritePayload): Observable<AuthResponse> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    return this.http.post<AuthResponse>(`${this.baseUrl}/favorites`, payload, options).pipe(
      map(response => this.normalizeResponse(response))
    );
  }

  removeFromFavorites(payload: FavoritePayload): Observable<AuthResponse> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    return this.http.post<AuthResponse>(`${this.baseUrl}/favorites/remove`, payload, options).pipe(
      map(response => this.normalizeResponse(response))
    );
  }

  addToShortlist(payload: FavoritePayload): Observable<AuthResponse> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    return this.http.post<AuthResponse>(`${this.baseUrl}/favorites/shortlist`, payload, options).pipe(
      map(response => this.normalizeResponse(response))
    );
  }

  removeFromShortlist(payload: FavoritePayload): Observable<AuthResponse> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    return this.http.post<AuthResponse>(`${this.baseUrl}/favorites/shortlist/remove`, payload, options).pipe(
      map(response => this.normalizeResponse(response))
    );
  }

  listMyFavorites(userId: string, page = 1, limit = 20): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    const payload: FavoritesListPayload = {
      userId,
      page,
      limit
    };

    return this.http.post(`${this.baseUrl}/favorites/list`, payload, options);
  }

  listMyShortlist(userId: string, page = 1, limit = 20): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    const payload: FavoritesListPayload = {
      userId,
      page,
      limit
    };

    return this.http.post(`${this.baseUrl}/favorites/shortlist/list`, payload, options);
  }

  createOrGetConversation(payload: ConversationPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    return this.http.post(`${this.baseUrl}/conversations`, payload, options);
  }

  listMyConversations(userId: string, page = 1, limit = 20): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    const payload: FavoritesListPayload = {
      userId,
      page,
      limit
    };

    return this.http.post(`${this.baseUrl}/conversations/list`, payload, options);
  }

  sendMessage(payload: SendMessagePayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    return this.http.post(`${this.baseUrl}/conversations/messages`, payload, options);
  }

  listMessages(payload: ListMessagesPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    return this.http.post(`${this.baseUrl}/conversations/messages/list`, payload, options);
  }

  /** Get Connection Status – POST /api/connections/status with { userId, otherUserId }. */
  getConnectionStatus(userId: string, otherUserId: string): Observable<{ connected: boolean; requestSent?: boolean; requestReceived?: boolean; conversationId?: string }> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/connections/status`, { userId, otherUserId }, options).pipe(
      map((response: any) => {
        const data = response?.data ?? response;
        const status = (data?.status ?? data?.connectionStatus ?? '').toLowerCase();
        const connected =
          data?.connected === true ||
          data?.accepted === true ||
          status === 'connected' ||
          status === 'accepted' ||
          status === 'accepted_connection';
        const requestSent =
          data?.requestSent === true ||
          data?.request_sent === true ||
          status === 'pending_sent' ||
          status === 'request_sent' ||
          status === 'sent';
        const requestReceived =
          data?.requestReceived === true ||
          data?.request_received === true ||
          status === 'pending_received' ||
          status === 'request_received' ||
          status === 'received';
        const conversationId = data?.conversationId ?? data?.conversation_id;
        return {
          connected: !!connected,
          requestSent: !!requestSent,
          requestReceived: !!requestReceived,
          conversationId: conversationId != null ? String(conversationId) : undefined
        };
      })
    );
  }

  /** Send Connection Request – POST /api/connections/request with { userId, otherUserId }. */
  sendConnectionRequest(userId: string, otherUserId: string): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/connections/request`, { userId, otherUserId }, options);
  }

  /** List Pending Received – POST /api/connections/list-pending with { userId } (and profileId if same as userId). */
  listConnectionRequests(userId: string, profileId?: string): Observable<any> {
    const options = this.connectionAuthOptions();
    const payload = this.connectionListPayload(userId, profileId);
    return this.http.post(`${this.baseUrl}/connections/list-pending`, payload, options);
  }

  /** List Accepted Connections – tries list-accepted, then list with status filters. */
  listAcceptedConnections(userId: string, page = 1, limit = 50, profileId?: string): Observable<any> {
    const options = this.connectionAuthOptions();
    const accountId = this.getAccountUserId() || userId;
    const base = this.connectionListPayload(accountId, profileId, page, limit);
    return this.http.post(`${this.baseUrl}/connections/list-accepted`, base, options).pipe(
      catchError(() => this.http.post(`${this.baseUrl}/connections/list`, { ...base, status: 'accepted' }, options)),
      catchError(() => this.http.post(`${this.baseUrl}/connections/list`, { ...base, status: 'connected' }, options)),
      catchError(() => this.http.post(`${this.baseUrl}/connections/list`, { ...base, type: 'connected' }, options)),
      catchError(() => this.http.post(`${this.baseUrl}/connections/list`, { ...base, type: 'accepted' }, options))
    );
  }

  /** Withdraw / cancel a sent connection request. */
  withdrawConnectionRequest(userId: string, otherUserId: string): Observable<any> {
    const options = this.connectionAuthOptions();
    const body = { userId, otherUserId, profileId: localStorage.getItem('profile_user_id') || undefined };
    return this.http.post(`${this.baseUrl}/connections/withdraw`, body, options).pipe(
      catchError(() => this.http.post(`${this.baseUrl}/connections/cancel`, body, options)),
      catchError(() => this.http.post(`${this.baseUrl}/connections/revoke`, body, options)),
      catchError(() => this.http.post(`${this.baseUrl}/connections/reject`, body, options)),
      tap(() => this.removeTrackedSentConnection(otherUserId))
    );
  }

  /** List Sent Connection Requests – tries several endpoints, then conversation+status fallback. */
  listSentConnectionRequests(userId: string, page = 1, limit = 50, profileId?: string): Observable<any> {
    const options = this.connectionAuthOptions();
    // Prefer account id for connection APIs (same account the mobile app uses)
    const accountId = this.getAccountUserId() || userId;
    const base = this.connectionListPayload(accountId, profileId, page, limit);

    const endpointAttempts: Array<{ url: string; body: Record<string, unknown> }> = [
      { url: `${this.baseUrl}/connections/list-sent`, body: { ...base } },
      { url: `${this.baseUrl}/connections/list-outgoing`, body: { ...base } },
      { url: `${this.baseUrl}/connections/pending-sent`, body: { ...base } },
      { url: `${this.baseUrl}/connections/sent`, body: { ...base } },
      { url: `${this.baseUrl}/connections/outgoing`, body: { ...base } },
      { url: `${this.baseUrl}/connections/list`, body: { ...base, status: 'sent' } },
      { url: `${this.baseUrl}/connections/list`, body: { ...base, status: 'pending_sent' } },
      { url: `${this.baseUrl}/connections/list`, body: { ...base, type: 'sent' } },
      { url: `${this.baseUrl}/connections/list`, body: { ...base, direction: 'outgoing' } },
      { url: `${this.baseUrl}/connections/list`, body: { ...base, role: 'sender' } },
      { url: `${this.baseUrl}/connections/list-pending`, body: { ...base, type: 'sent' } },
      { url: `${this.baseUrl}/connections/list-pending`, body: { ...base, direction: 'sent' } },
      { url: `${this.baseUrl}/connections/list-pending`, body: { ...base, status: 'sent' } },
      { url: `${this.baseUrl}/connections/list-pending`, body: { ...base, role: 'sender' } }
    ];

    const tryAt = (index: number): Observable<any> => {
      if (index >= endpointAttempts.length) {
        return this.buildSentListFromConversations(accountId, limit);
      }
      const attempt = endpointAttempts[index];
      return this.http.post(attempt.url, attempt.body, options).pipe(
        switchMap((response) => {
          if (this.connectionResponseHasItems(response)) {
            return of(response);
          }
          return tryAt(index + 1);
        }),
        catchError(() => tryAt(index + 1))
      );
    };

    return tryAt(0).pipe(
      map((response) => this.mergeTrackedSentIntoResponse(accountId, response))
    );
  }

  /** Persist a sent connection so My Connections → Sent stays in sync even if list-sent is empty. */
  trackSentConnection(entry: {
    otherUserId: string;
    name?: string;
    avatar?: string;
    location?: string;
    age?: number;
    conversationId?: string;
  }): void {
    const otherUserId = String(entry.otherUserId || '').trim();
    if (!otherUserId) {
      return;
    }
    const existing = this.getTrackedSentConnections();
    const next = existing.filter((item) => String(item.otherUserId) !== otherUserId);
    next.unshift({
      otherUserId,
      name: entry.name || 'User',
      avatar: entry.avatar || '',
      location: entry.location || '',
      age: entry.age,
      conversationId: entry.conversationId,
      createdAt: new Date().toISOString(),
      status: 'sent'
    });
    localStorage.setItem(this.sentConnectionsStorageKey, JSON.stringify(next.slice(0, 100)));
  }

  removeTrackedSentConnection(otherUserId: string): void {
    const id = String(otherUserId || '').trim();
    if (!id) {
      return;
    }
    const next = this.getTrackedSentConnections().filter((item) => String(item.otherUserId) !== id);
    localStorage.setItem(this.sentConnectionsStorageKey, JSON.stringify(next));
  }

  getTrackedSentConnections(): Array<{
    otherUserId: string;
    name?: string;
    avatar?: string;
    location?: string;
    age?: number;
    conversationId?: string;
    createdAt?: string;
    status?: string;
  }> {
    try {
      const raw = localStorage.getItem(this.sentConnectionsStorageKey);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private readonly sentConnectionsStorageKey = 'sent_connection_requests';

  private connectionResponseHasItems(response: any): boolean {
    return this.extractConnectionListDeep(response).length > 0;
  }

  /** Deep-scan common / nested list shapes used by connection APIs. */
  private extractConnectionListDeep(response: any): any[] {
    if (!response) {
      return [];
    }
    if (Array.isArray(response)) {
      return response;
    }
    if (typeof response !== 'object') {
      return [];
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
        if (node.length > 0 && (typeof node[0] === 'object' || typeof node[0] === 'string')) {
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

  /** When list-sent APIs are empty, discover pending_sent peers from conversations. */
  private buildSentListFromConversations(userId: string, limit = 50): Observable<any> {
    return this.listMyConversations(userId, 1, limit).pipe(
      switchMap((response) => {
        const conversations = this.extractConversationArray(response);
        if (!conversations.length) {
          return of({ data: { list: this.getTrackedSentConnections() } });
        }

        const peers = conversations
          .map((item) => this.extractConversationPeer(item, userId))
          .filter((peer): peer is { otherUserId: string; name: string; avatar: string; conversationId?: string } => !!peer?.otherUserId);

        if (!peers.length) {
          return of({ data: { list: this.getTrackedSentConnections() } });
        }

        const statusCalls = peers.map((peer) =>
          this.getConnectionStatus(userId, peer.otherUserId).pipe(
            map((status) => ({ peer, status })),
            catchError(() => of({ peer, status: { connected: false, requestSent: false, requestReceived: false, conversationId: undefined as string | undefined } }))
          )
        );

        return forkJoin(statusCalls).pipe(
          map((rows) => {
            const sent = rows
              .filter((row) => row.status?.requestSent && !row.status?.connected)
              .map((row) => ({
                otherUserId: row.peer.otherUserId,
                toUserId: row.peer.otherUserId,
                name: row.peer.name,
                avatar: row.peer.avatar,
                conversationId: row.peer.conversationId || row.status?.conversationId,
                status: 'sent',
                createdAt: new Date().toISOString()
              }));
            return { data: { list: sent } };
          })
        );
      }),
      catchError(() => of({ data: { list: this.getTrackedSentConnections() } }))
    );
  }

  private extractConversationArray(response: any): any[] {
    if (!response || typeof response !== 'object') {
      return [];
    }
    if (Array.isArray(response)) {
      return response;
    }
    const data = response?.data ?? response;
    for (const key of ['list', 'items', 'results', 'conversations', 'chats', 'data']) {
      if (Array.isArray(data?.[key])) {
        return data[key];
      }
      if (Array.isArray(response?.[key])) {
        return response[key];
      }
    }
    return Array.isArray(data) ? data : [];
  }

  private extractConversationPeer(
    item: any,
    userId: string
  ): { otherUserId: string; name: string; avatar: string; conversationId?: string } | null {
    const participants = Array.isArray(item?.participants) ? item.participants : [];
    const otherParticipant = participants.find((p: any) => {
      const participantId = p?.id || p?.userId || p?._id;
      return participantId && String(participantId) !== userId;
    });
    const otherUser = item?.otherUser || item?.otherParticipant || otherParticipant || item?.user || item?.partner || {};
    const otherUserId = String(
      otherUser?.id ||
      otherUser?.userId ||
      otherUser?._id ||
      item?.otherUserId ||
      item?.other_user_id ||
      item?.participantId ||
      item?.receiverId ||
      ''
    );
    if (!otherUserId || otherUserId === userId) {
      return null;
    }
    const name =
      otherUser?.name ||
      otherUser?.fullName ||
      item?.otherUserName ||
      item?.name ||
      'User';
    const avatar =
      otherUser?.avatar ||
      otherUser?.profilePicture ||
      item?.avatar ||
      item?.otherUserAvatar ||
      '';
    const conversationId = item?.id || item?.conversationId || item?._id;
    return {
      otherUserId,
      name: typeof name === 'string' ? name : 'User',
      avatar: typeof avatar === 'string' ? avatar : '',
      conversationId: conversationId != null ? String(conversationId) : undefined
    };
  }

  private mergeTrackedSentIntoResponse(userId: string, response: any): any {
    const tracked = this.getTrackedSentConnections();
    if (!tracked.length) {
      return response;
    }

    const existing = this.extractConnectionListForMerge(response);
    const seen = new Set(
      existing
        .map((item) =>
          String(
            item?.otherUserId ??
            item?.other_user_id ??
            item?.toUserId ??
            item?.to_user_id ??
            item?.userId ??
            item?.id ??
            ''
          )
        )
        .filter((id) => id && id !== userId)
    );

    const extras = tracked.filter((item) => item.otherUserId && !seen.has(String(item.otherUserId)));
    if (!extras.length) {
      return response;
    }

    return {
      data: {
        list: [
          ...extras.map((item) => ({
            ...item,
            toUserId: item.otherUserId,
            status: 'sent'
          })),
          ...existing
        ]
      }
    };
  }

  private extractConnectionListForMerge(response: any): any[] {
    return this.extractConnectionListDeep(response);
  }

  private connectionAuthOptions(): { headers: HttpHeaders } | undefined {
    const token = this.getToken();
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : undefined;
  }

  private connectionListPayload(
    userId: string,
    profileId?: string,
    page?: number,
    limit?: number
  ): { userId: string; profileId?: string; page?: number; limit?: number } {
    const payload: { userId: string; profileId?: string; page?: number; limit?: number } = { userId };
    const resolvedProfileId = profileId || localStorage.getItem('profile_user_id') || undefined;
    if (resolvedProfileId) {
      payload.profileId = resolvedProfileId;
    }
    if (page != null) {
      payload.page = page;
    }
    if (limit != null) {
      payload.limit = limit;
    }
    return payload;
  }

  /** Accept Connection – POST /api/connections/accept with { userId, otherUserId }. */
  acceptConnectionRequest(userId: string, otherUserId: string): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/connections/accept`, { userId, otherUserId }, options);
  }

  /** Reject Connection – POST /api/connections/reject with { userId, otherUserId }. */
  declineConnectionRequest(userId: string, otherUserId: string): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/connections/reject`, { userId, otherUserId }, options);
  }

  listAllUsers(payload: ListAllUsersPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    return this.http.post(`${this.baseUrl}/profiles/all`, payload, options);
  }

  getMyProfileDetails(userId: string): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    return this.http.post(`${this.baseUrl}/profiles/me`, { userId }, options);
  }

  editMyProfile(payload: any): Observable<any> {
    // Auth header is added by authInterceptor — avoid duplicate Authorization headers.
    return this.http.post(`${this.baseUrl}/profiles/update`, payload);
  }

  listProfilesByPartnerPreferences(payload: ListProfilesByPartnerPreferencesPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    return this.http.post(`${this.baseUrl}/profiles/list`, payload, options);
  }

  getProfileDetails(userId: string): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    const payload: GetProfileDetailsPayload = { userId };
    return this.http.post(`${this.baseUrl}/profiles/details`, payload, options);
  }

  submitUserReport(payload: SubmitReportPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    return this.http.post(`${this.baseUrl}/reports/submit`, payload, options);
  }

  listMyReports(userId: string): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    const payload: MyReportsListPayload = { userId };
    return this.http.post(`${this.baseUrl}/reports/my-list`, payload, options);
  }

  listMyAccountReports(userId: string, page = 1, limit = 20): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    const payload: MyAccountReportsListPayload = { userId, page, limit };
    return this.http.post(`${this.baseUrl}/reports/my-account-list`, payload, options);
  }

  blockUser(payload: BlockUserPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/blocks/block`, payload, options);
  }

  listBlockedUsers(userId: string): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    const payload: BlockedUsersListPayload = { userId };
    return this.http.post(`${this.baseUrl}/blocks/list`, payload, options);
  }

  unblockUser(payload: UnblockUserPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/blocks/unblock`, payload, options);
  }

  /** POST /api/profiles/photos/upload?userId=... with form-data: photo (file), optional userId (text) */
  uploadProfilePhoto(userId: string, file: File): Observable<any> {
    const token = this.getToken();
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
    const formData = new FormData();
    formData.append('photo', file, file.name);
    formData.append('userId', userId);
    const url = `${this.baseUrl}/profiles/photos/upload?userId=${encodeURIComponent(userId)}`;
    return this.http.post(url, formData, { headers });
  }

  /** POST /api/profiles/pdf/upload?userId=... with form-data: pdf (file), optional userId (text) */
  uploadProfilePdf(userId: string, file: File): Observable<any> {
    const token = this.getToken();
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
    const url = `${this.baseUrl}/profiles/pdf/upload?userId=${encodeURIComponent(userId)}`;
    const uploadWithField = (fieldName: 'pdf' | 'document') => {
      const formData = new FormData();
      formData.append(fieldName, file, file.name);
      formData.append('userId', userId);
      return this.http.post(url, formData, { headers });
    };

    // Some backend deployments accept "pdf", others "document".
    // Retry transparently with "document" when server says file missing.
    return uploadWithField('pdf').pipe(
      catchError((err: any) => {
        const noFileCode = err?.error?.code === 'NO_FILE';
        const mentionsPdfField = typeof err?.error?.error === 'string' &&
          (err.error.error.includes('pdf') || err.error.error.includes('document'));
        if (!noFileCode && !mentionsPdfField) {
          return throwError(() => err);
        }
        return uploadWithField('document');
      })
    );
  }

  /** GET /api/profiles/pdf?userId=... */
  getMyPdf(userId: string): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    const url = `${this.baseUrl}/profiles/pdf?userId=${encodeURIComponent(userId)}`;
    return this.http.get(url, options);
  }

  /** DELETE /api/profiles/pdf?userId=... */
  deleteMyPdf(userId: string): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    const url = `${this.baseUrl}/profiles/pdf?userId=${encodeURIComponent(userId)}`;
    return this.http.delete(url, options);
  }

  /** GET /api/profiles/photos?userId=... – returns { success, photos: [{ id, url, sortOrder }] } */
  listMyPhotos(userId: string): Observable<{ success: boolean; photos: Array<{ id?: string; url: string; sortOrder?: number } | string> }> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    const url = `${this.baseUrl}/profiles/photos?userId=${encodeURIComponent(userId)}`;
    return this.http.get(url, options) as Observable<{ success: boolean; photos: Array<{ id?: string; url: string; sortOrder?: number } | string> }>;
  }

  /** DELETE /api/profiles/photos?userId=...&photoId=... – remove one profile photo so it’s removed from gallery and profile */
  deleteProfilePhoto(userId: string, photoIdOrUrl: string): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    const url = `${this.baseUrl}/profiles/photos?userId=${encodeURIComponent(userId)}&photoId=${encodeURIComponent(photoIdOrUrl)}&id=${encodeURIComponent(photoIdOrUrl)}`;
    return this.http.delete(url, options);
  }

  /** DELETE /api/profiles/photos/:photoId?userId=... */
  deleteProfilePhotoByPath(userId: string, photoId: string): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    const url = `${this.baseUrl}/profiles/photos/${encodeURIComponent(photoId)}?userId=${encodeURIComponent(userId)}`;
    return this.http.delete(url, options);
  }

  /** POST /api/profiles/photos/remove – body: { userId, photoId } */
  removeProfilePhoto(userId: string, photoId: string): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/profiles/photos/remove`, { userId, photoId }, options);
  }

  /** PATCH /api/profiles/photos/reorder – body: { userId, photoNames } */
  reorderProfilePhotos(userId: string, photoNames: string[]): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.patch(`${this.baseUrl}/profiles/photos/reorder`, { userId, photoNames }, options);
  }

  profilesPing(): Observable<any> {
    return this.http.get(`${this.baseUrl}/profiles/ping`);
  }

  createCallSession(payload: { userId: string; otherUserId: string; type: 'voice' | 'video' }): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    return this.http.post(`${this.baseUrl}/calls/session`, payload, options);
  }

  endCall(payload: { userId: string; channelId: string }): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    return this.http.post(`${this.baseUrl}/calls/end`, payload, options);
  }

  listCallLogs(userId: string, page = 1, limit = 20): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;

    const payload = { userId, page, limit };
    return this.http.post(`${this.baseUrl}/calls/logs`, payload, options);
  }

  /** POST /api/notifications/unread-count – { userId } */
  getNotificationsUnreadCount(userId: string): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/notifications/unread-count`, { userId }, options);
  }

  /** POST /api/notifications/list – { userId, page?, limit? } */
  listNotifications(userId: string, page = 1, limit = 20): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    const payload: NotificationsListPayload = { userId, page, limit };
    return this.http.post(`${this.baseUrl}/notifications/list`, payload, options);
  }

  /** POST /api/notifications/list-unread – { userId, page?, limit? } */
  listNotificationsUnreadOnly(userId: string, page = 1, limit = 20): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    const payload: NotificationsListPayload = { userId, page, limit };
    return this.http.post(`${this.baseUrl}/notifications/list-unread`, payload, options);
  }

  /** POST /api/notifications/inbox – admin / merged inbox (photo approval, etc.) */
  listNotificationsInbox(userId: string, page = 1, limit = 20): Observable<any> {
    const payload: NotificationsListPayload = { userId, page, limit };
    return this.postNotificationsPayload('/notifications/inbox', payload);
  }

  /** POST /api/notifications/list-all */
  listNotificationsListAll(userId: string, page = 1, limit = 20): Observable<any> {
    const payload: NotificationsListPayload = { userId, page, limit };
    return this.postNotificationsPayload('/notifications/list-all', payload);
  }

  /** POST /api/notifications/admin/list */
  listNotificationsAdmin(userId: string, page = 1, limit = 20): Observable<any> {
    const payload: NotificationsListPayload = { userId, page, limit };
    return this.postNotificationsPayload('/notifications/admin/list', payload);
  }

  /** POST /api/admin/notifications */
  listAdminNotifications(userId: string, page = 1, limit = 20): Observable<any> {
    const payload: NotificationsListPayload = { userId, page, limit };
    return this.postNotificationsPayload('/admin/notifications', payload);
  }

  /** GET/POST /api/profiles/photos/pending – photos awaiting admin approval */
  listPendingProfilePhotos(userId: string, page = 1, limit = 50): Observable<any> {
    const options = this.authJsonOptions();
    const payload = { userId, page, limit };
    const getPendingUrl = `${this.baseUrl}/profiles/photos/pending?userId=${encodeURIComponent(userId)}&page=${page}&limit=${limit}`;
    const postPendingUrl = `${this.baseUrl}/profiles/photos/pending`;
    const pendingApprovalUrl = `${this.baseUrl}/profiles/photos/pending-approval?userId=${encodeURIComponent(userId)}&page=${page}&limit=${limit}`;

    if (this.pendingPhotosEndpointMode === 'none') {
      return of({ pendingPhotos: [] });
    }

    const tryGetPending = () =>
      this.http.get(getPendingUrl, options).pipe(
        tap(() => {
          this.pendingPhotosEndpointMode = 'get';
        })
      );

    const tryPostPending = () =>
      this.http.post(postPendingUrl, payload, options).pipe(
        tap(() => {
          this.pendingPhotosEndpointMode = 'post';
        })
      );

    const tryPendingApproval = () =>
      this.http.get(pendingApprovalUrl, options).pipe(
        tap(() => {
          this.pendingPhotosEndpointMode = 'approval';
        })
      );

    const handleFallback = (error: any, next: () => Observable<any>) => {
      if (this.isNotFoundError(error)) {
        return next();
      }
      return throwError(() => error);
    };

    if (this.pendingPhotosEndpointMode === 'get') {
      return tryGetPending().pipe(
        catchError((error) =>
          handleFallback(error, () =>
            tryPostPending().pipe(
              catchError((postError) =>
                handleFallback(postError, () =>
                  tryPendingApproval().pipe(
                    catchError((approvalError) => {
                      if (this.isNotFoundError(approvalError)) {
                        this.pendingPhotosEndpointMode = 'none';
                        return of({ pendingPhotos: [] });
                      }
                      return throwError(() => approvalError);
                    })
                  )
                )
              )
            )
          )
        )
      );
    }

    if (this.pendingPhotosEndpointMode === 'post') {
      return tryPostPending().pipe(
        catchError((error) =>
          handleFallback(error, () =>
            tryPendingApproval().pipe(
              catchError((approvalError) => {
                if (this.isNotFoundError(approvalError)) {
                  this.pendingPhotosEndpointMode = 'none';
                  return of({ pendingPhotos: [] });
                }
                return throwError(() => approvalError);
              })
            )
          )
        )
      );
    }

    if (this.pendingPhotosEndpointMode === 'approval') {
      return tryPendingApproval().pipe(
        catchError((error) => {
          if (this.isNotFoundError(error)) {
            this.pendingPhotosEndpointMode = 'none';
            return of({ pendingPhotos: [] });
          }
          return throwError(() => error);
        })
      );
    }

    return tryGetPending().pipe(
      catchError((getError) =>
        handleFallback(getError, () =>
          tryPostPending().pipe(
            catchError((postError) =>
              handleFallback(postError, () =>
                tryPendingApproval().pipe(
                  catchError((approvalError) => {
                    if (this.isNotFoundError(approvalError)) {
                      this.pendingPhotosEndpointMode = 'none';
                      return of({ pendingPhotos: [] });
                    }
                    return throwError(() => approvalError);
                  })
                )
              )
            )
          )
        )
      )
    );
  }

  private postNotificationsPayload(path: string, payload: NotificationsListPayload): Observable<any> {
    if (this.unavailableNotificationPaths.has(path)) {
      return of({ notifications: [] });
    }

    return this.http.post(`${this.baseUrl}${path}`, payload, this.authJsonOptions()).pipe(
      catchError((error: unknown) => {
        if (this.isNotFoundError(error)) {
          this.unavailableNotificationPaths.add(path);
          return of({ notifications: [] });
        }
        return throwError(() => error);
      })
    );
  }

  private isNotFoundError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 404;
  }

  private authJsonOptions(): { headers: HttpHeaders } | undefined {
    const token = this.getToken();
    return token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
  }

  /** POST /api/notifications/mark-one-read – { userId, notificationId } */
  markOneNotificationRead(userId: string, notificationId: string): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    const payload: MarkNotificationReadPayload = { userId, notificationId };
    return this.http.post(`${this.baseUrl}/notifications/mark-one-read`, payload, options);
  }

  /** POST /api/notifications/mark-all-read – { userId } */
  markAllNotificationsRead(userId: string): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/notifications/mark-all-read`, { userId }, options);
  }

  /** POST /api/notifications/mark-multiple-read – { userId, notificationIds } */
  markMultipleNotificationsRead(userId: string, notificationIds: string[]): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    const payload: MarkMultipleNotificationsReadPayload = { userId, notificationIds };
    return this.http.post(`${this.baseUrl}/notifications/mark-multiple-read`, payload, options);
  }

  /** POST /api/notifications/push-test – creates inbox row (dev / QA) */
  pushNotificationTest(payload: PushNotificationTestPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/notifications/push-test`, payload, options);
  }

  // Token Management
  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  removeToken(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('profile_user_id');
    localStorage.removeItem('my_profile_data');
    localStorage.removeItem('signup_email');
    sessionStorage.removeItem('signup_email');
  }

  /** Logged-in account id — use for notification inbox (not a stale profile id). */
  getAccountUserId(): string | null {
    const user = this.getUser();
    const authId = user?.id ?? user?.userId ?? user?._id;
    if (authId != null && String(authId).trim() !== '') {
      return String(authId);
    }
    const profileUserId = localStorage.getItem('profile_user_id');
    return profileUserId?.trim() ? profileUserId : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * After signup/set-password, backend may return userId without a JWT.
   * Log in with stored signup credentials so protected routes (dashboard) work.
   */
  ensureSessionAuth(): Observable<boolean> {
    if (this.isAuthenticated()) {
      return of(true);
    }
    const email = (
      sessionStorage.getItem('signup_email') ||
      localStorage.getItem('signup_email') ||
      this.getUser()?.email ||
      ''
    ).trim();
    const password = sessionStorage.getItem('signup_password') || '';
    if (!email || !password) {
      return of(false);
    }
    return this.login({ email, password }).pipe(
      map(() => this.isAuthenticated()),
      catchError(() => of(false))
    );
  }

  clearSignupSessionCredentials(): void {
    sessionStorage.removeItem('signup_password');
    sessionStorage.removeItem('onboarding_after_signup');
    sessionStorage.removeItem('pending_login_after_signup');
  }

  // Help & Support Ticket Methods
  createHelpTicket(payload: CreateTicketPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/help/tickets/create`, payload, options);
  }

  listHelpTickets(payload: ListTicketsPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/help/tickets/my-list`, payload, options);
  }

  getHelpTicketDetail(payload: TicketDetailPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/help/tickets/detail`, payload, options);
  }

  replyHelpTicket(payload: ReplyTicketPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/help/tickets/reply`, payload, options);
  }

  /** POST /api/community-events/list */
  listCommunityEvents(payload: CommunityEventsListPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/community-events/list`, {
      page: payload.page ?? 1,
      limit: payload.limit ?? 20,
      category: payload.category,
      upcomingOnly: !!payload.upcomingOnly
    }, options);
  }

  /** POST /api/community-events/detail */
  getCommunityEventDetail(payload: CommunityEventDetailPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/community-events/detail`, {
      eventId: payload.eventId,
      userId: String(payload.userId)
    }, options);
  }

  /** POST /api/community-events/rsvp */
  rsvpCommunityEvent(payload: CommunityEventRsvpPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/community-events/rsvp`, {
      eventId: payload.eventId,
      userId: String(payload.userId),
      status: payload.status
    }, options);
  }

  /** POST /api/teachings/list */
  listTeachings(payload: TeachingsListPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    return this.http.post(`${this.baseUrl}/teachings/list`, {
      page: payload.page ?? 1,
      limit: payload.limit ?? 20,
      category: payload.category
    }, options);
  }

  /** POST /api/teachings/detail — by articleId or slug */
  getTeachingDetail(payload: TeachingDetailPayload): Observable<any> {
    const token = this.getToken();
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
    const body: Record<string, string | number> = {};
    if (payload.articleId != null && String(payload.articleId).trim() !== '') {
      body['articleId'] = payload.articleId;
    }
    if (payload.slug?.trim()) {
      body['slug'] = payload.slug.trim();
    }
    return this.http.post(`${this.baseUrl}/teachings/detail`, body, options);
  }

  // User Data Management
  setUser(user: any): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  /** Clear session; optionally keep signup email for the login screen after registration. */
  logout(options?: { preserveSignupEmail?: boolean }): void {
    const preservedEmail = options?.preserveSignupEmail
      ? (sessionStorage.getItem('signup_email') || localStorage.getItem('signup_email') || '').trim()
      : '';
    this.removeToken();
    if (preservedEmail) {
      localStorage.setItem('signup_email', preservedEmail);
      sessionStorage.setItem('signup_email', preservedEmail);
    }
  }
}
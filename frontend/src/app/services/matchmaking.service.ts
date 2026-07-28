import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  MatchmakingCatalogResponse,
  MatchmakingPreferencesResponse,
  MatchesListResponse,
  SavePreferencesPayload
} from '../models/matchmaking.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class MatchmakingService {
  private readonly baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) {}

  private authOptions(): { headers?: HttpHeaders } | undefined {
    const token = this.apiService.getToken();
    return token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : undefined;
  }

  /** GET /api/matchmaking/catalog — field registry for preference UI */
  getCatalog(): Observable<MatchmakingCatalogResponse> {
    return this.http.get<MatchmakingCatalogResponse>(
      `${this.baseUrl}/matchmaking/catalog`,
      this.authOptions()
    );
  }

  /** GET /api/matchmaking/preferences?userId= */
  getPreferences(userId: string): Observable<MatchmakingPreferencesResponse> {
    return this.http.get<MatchmakingPreferencesResponse>(
      `${this.baseUrl}/matchmaking/preferences?userId=${encodeURIComponent(userId)}`,
      this.authOptions()
    );
  }

  /** PUT /api/matchmaking/preferences */
  savePreferences(payload: SavePreferencesPayload): Observable<MatchmakingPreferencesResponse> {
    return this.http.put<MatchmakingPreferencesResponse>(
      `${this.baseUrl}/matchmaking/preferences`,
      payload,
      this.authOptions()
    );
  }

  /** POST /api/matchmaking/matches — scored matches (balanced, strict, etc.) */
  getScoredMatches(params: {
    userId: string;
    mode?: string;
    page?: number;
    limit?: number;
    includeExplain?: boolean;
  }): Observable<MatchesListResponse> {
    const body = {
      userId: params.userId,
      mode: params.mode ?? 'balanced',
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      includeExplain: params.includeExplain ?? true
    };
    return this.http.post<MatchesListResponse>(
      `${this.baseUrl}/matchmaking/matches`,
      body,
      this.authOptions()
    );
  }

  /** POST /api/matchmaking/matches/near — relaxed near matches */
  getNearMatches(params: {
    userId: string;
    page?: number;
    limit?: number;
    includeExplain?: boolean;
  }): Observable<MatchesListResponse> {
    const body = {
      userId: params.userId,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      includeExplain: params.includeExplain ?? true
    };
    return this.http.post<MatchesListResponse>(
      `${this.baseUrl}/matchmaking/matches/near`,
      body,
      this.authOptions()
    );
  }

  /** POST /api/matchmaking/matches/explain — why this pair matched */
  explainMatch(userId: string, candidateUserId: string): Observable<{ success: boolean; explain?: unknown; error?: string }> {
    return this.http.post<{ success: boolean; explain?: unknown; error?: string }>(
      `${this.baseUrl}/matchmaking/matches/explain`,
      { userId, candidateUserId },
      this.authOptions()
    );
  }

  /** POST /api/profiles/list — scored profiles (primary list for dashboard Best / All tabs) */
  listScoredProfiles(params: {
    userId: string;
    mode?: string;
    page?: number;
    limit?: number;
    includeExplain?: boolean;
  }): Observable<MatchesListResponse> {
    const body = {
      userId: params.userId,
      scored: true,
      mode: params.mode ?? 'balanced',
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      includeExplain: params.includeExplain ?? true
    };
    return this.http.post<MatchesListResponse>(
      `${this.baseUrl}/profiles/list`,
      body,
      this.authOptions()
    );
  }
}

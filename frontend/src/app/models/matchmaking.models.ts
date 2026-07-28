export type MatchmakingFieldType =
  | 'range'
  | 'multi_value'
  | 'lifestyle_set'
  | 'personality_set';

export type MatchmakingPriority = 'must_have' | 'important' | 'nice_to_have';

export type RecommendationMode =
  | 'strict'
  | 'balanced'
  | 'near_match'
  | 'discovery'
  | 'ai_enhanced';

export interface CatalogField {
  key: string;
  label: string;
  type: MatchmakingFieldType;
  defaultPriority: MatchmakingPriority;
  defaultDealBreaker: boolean;
  defaultMandatory: boolean;
  relaxable: boolean;
  weight: number;
  range: { min: number; max: number; step: number } | null;
  options: string[] | null;
  matchMode: string;
  maxItems: number | null;
}

export interface MatchmakingCatalogResponse {
  success: boolean;
  schemaVersion: number;
  catalog: CatalogField[];
  enums: Record<string, string[]>;
  defaultMatchingConfig: {
    minScorePercent: number;
    nearMatchMinScorePercent: number;
    maxCandidatesPool?: number;
    cacheTtlMinutes?: number;
    enableDealBreakers?: boolean;
    relaxationSteps?: number;
    aiBlendWeight?: number;
  };
  recommendationModes: RecommendationMode[];
  features: Record<string, unknown>;
}

export interface PreferenceCriterion {
  key: string;
  type?: MatchmakingFieldType;
  values: { min: number; max: number } | string[];
  priority?: MatchmakingPriority;
  weight?: number;
  isDealBreaker?: boolean;
  mandatory?: boolean;
  matchMode?: string;
  relaxable?: boolean;
}

export interface PreferencesDocument {
  version: number;
  updatedAt?: string;
  criteria: PreferenceCriterion[];
  matchingConfig?: {
    minScorePercent?: number;
    nearMatchMinScorePercent?: number;
  };
  meta?: Record<string, unknown>;
}

export interface MatchmakingPreferencesResponse {
  success: boolean;
  schemaVersion?: number;
  preferences?: PreferencesDocument;
  legacy?: Record<string, unknown>;
  completion?: {
    criteriaCount: number;
    criteriaWithValues: number;
    mustHaveFilled: number;
    mustHaveTotal: number;
    completionPercent: number;
    weightedCompletionPercent: number;
    missingMustHave: string[];
  };
}

export interface SavePreferencesPayload {
  userId: string;
  preferences: {
    version: number;
    criteria: Array<{
      key: string;
      values: { min: number; max: number } | string[];
      priority?: MatchmakingPriority;
      isDealBreaker?: boolean;
      mandatory?: boolean;
      matchMode?: string;
      weight?: number;
      type?: MatchmakingFieldType;
    }>;
    matchingConfig?: {
      minScorePercent?: number;
      nearMatchMinScorePercent?: number;
    };
  };
}

export interface MatchExplain {
  matchPercent: number;
  tier: string;
  headline: string;
  dealBreakerFailed: boolean;
  reasons?: Array<{ type: string; key: string; label: string; message: string }>;
  strengths?: Array<{ key: string; reason: string }>;
  gaps?: Array<{ key: string; reason: string; partial?: boolean }>;
  breakdown?: Array<{
    key: string;
    priority: string;
    weight: number;
    scorePercent: number;
    passed: boolean;
    reason: string;
  }>;
}

export interface ScoredMatchItem {
  userId: number;
  profile: Record<string, unknown>;
  matchPercent: number;
  tier: string;
  dealBreakerFailed?: boolean;
  explain?: MatchExplain;
}

export interface MatchesListResponse {
  success: boolean;
  data: ScoredMatchItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  meta?: Record<string, unknown>;
  completion?: MatchmakingPreferencesResponse['completion'];
}

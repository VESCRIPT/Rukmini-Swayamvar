import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ViewState } from '../types';
import { backToDashboardView } from '../core/constants/dashboard-sidebar-views';
import { CatalogField, PreferencesDocument } from '../models/matchmaking.models';
import { MatchmakingService } from '../services/matchmaking.service';
import { ApiService } from '../services/api.service';
import {
  applyV2CriteriaToPartnerForm,
  buildV2CriteriaFromPartnerForm,
  hasMinimalPartnerPrefs,
  PartnerPrefsFormValues
} from '../core/utils/matchmaking-preferences.helper';

@Component({
  selector: 'app-partner-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-preferences.component.html',
  styleUrls: ['./partner-preferences.component.css']
})
export class PartnerPreferencesComponent implements OnInit {
  @Input() t: any;
  @Input() previousView: ViewState = 'dashboard';
  @Output() viewChange = new EventEmitter<ViewState>();

  isSaving = false;
  isLoading = true;
  loadError = '';

  catalog: CatalogField[] = [];
  catalogByKey = new Map<string, CatalogField>();
  enums: Record<string, string[]> = {};

  minScorePercent = 55;
  nearMatchMinScorePercent = 40;
  completionPercent = 0;

  occupation = '';
  selectedCountry = '';
  selectedMaritalStatus = '';
  selectedReligions: string[] = [];
  selectedLanguage = '';
  selectedEducation = '';
  caste = '';
  city = '';
  selectedState = '';
  minAge: number | null = null;
  maxAge: number | null = null;
  fromHeightCm: number | null = null;
  toHeightCm: number | null = null;
  fromIncome: number | null = null;
  toIncome: number | null = null;

  countryOptions = ['India', 'USA', 'UK', 'Canada', 'Australia', 'UAE', 'Singapore'];
  maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'];
  religionOptions: string[] = [];
  languageOptions: string[] = [];
  educationOptions: string[] = [];
  occupationOptions: string[] = [];
  dietOptions: string[] = [];
  personalitySocialOptions: string[] = [];
  selectedDiet: string[] = [];
  selectedPersonalitySocial: string[] = [];

  absMinAge = 18;
  absMaxAge = 80;

  constructor(
    private matchmaking: MatchmakingService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    const userId = this.resolveUserId();
    if (!userId) {
      this.isLoading = false;
      return;
    }
    forkJoin({
      catalog: this.matchmaking.getCatalog(),
      prefs: this.matchmaking.getPreferences(userId)
    }).subscribe({
      next: ({ catalog, prefs }) => {
        this.catalog = catalog.catalog ?? [];
        this.catalog.forEach(f => this.catalogByKey.set(f.key, f));
        this.enums = catalog.enums ?? {};
        this.religionOptions = this.enums['religions'] ?? ['Hindu', 'Muslim', 'Sikh', 'Christian', 'Jain', 'Other'];
        this.languageOptions = this.enums['mother_tongues'] ?? ['Marathi', 'Hindi', 'English', 'Other'];
        this.educationOptions = this.enums['educations'] ?? ['Bachelors', 'Masters', 'Doctorate', 'Other'];
        this.occupationOptions = this.enums['occupations'] ?? [];
        const dietField = this.catalogByKey.get('diet');
        this.dietOptions = dietField?.options ?? ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan', 'Jain'];
        const socialField = this.catalogByKey.get('personality_social');
        this.personalitySocialOptions = socialField?.options ?? ['Introvert', 'Ambivert', 'Extrovert'];

        const ageField = this.catalogByKey.get('age');
        if (ageField?.range) {
          this.absMinAge = ageField.range.min;
          this.absMaxAge = ageField.range.max;
        }
        if (catalog.defaultMatchingConfig) {
          this.minScorePercent = catalog.defaultMatchingConfig.minScorePercent ?? 55;
          this.nearMatchMinScorePercent = catalog.defaultMatchingConfig.nearMatchMinScorePercent ?? 40;
        }

        this.applySavedPreferences(prefs.preferences, prefs.legacy as Record<string, unknown> | undefined);
        this.completionPercent = prefs.completion?.completionPercent ?? 0;
        this.isLoading = false;
      },
      error: (err) => {
        this.loadError = err?.error?.message || 'Could not load match preferences. Please try again.';
        this.isLoading = false;
        console.error('Matchmaking catalog/preferences load failed:', err);
      }
    });
  }

  private applySavedPreferences(doc?: PreferencesDocument, legacy?: Record<string, unknown>): void {
    const criteria = doc?.criteria ?? [];
    if (doc?.matchingConfig) {
      this.minScorePercent = doc.matchingConfig.minScorePercent ?? this.minScorePercent;
      this.nearMatchMinScorePercent = doc.matchingConfig.nearMatchMinScorePercent ?? this.nearMatchMinScorePercent;
    }
    const patch: PartnerPrefsFormValues = {};
    applyV2CriteriaToPartnerForm(criteria, patch);
    this.patchFormFromValues(patch);
    if (criteria.length === 0 && legacy) {
      const ageRange = legacy['age_range'] as number[] | undefined;
      if (Array.isArray(ageRange) && ageRange.length >= 2) {
        this.minAge = ageRange[0];
        this.maxAge = ageRange[1];
      }
      const countries = legacy['country_select'] as string[] | undefined;
      if (countries?.length) this.selectedCountry = countries[0];
      if (legacy['marital_status']) this.selectedMaritalStatus = String(legacy['marital_status']);
      if (legacy['religion']) this.selectedReligions = [String(legacy['religion'])];
      if (legacy['mother_tongue']) this.selectedLanguage = String(legacy['mother_tongue']);
      if (legacy['education']) this.selectedEducation = String(legacy['education']);
      if (legacy['occupation']) this.occupation = String(legacy['occupation']);
    }
  }

  private patchFormFromValues(v: PartnerPrefsFormValues): void {
    if (v.minAge != null) this.minAge = v.minAge;
    if (v.maxAge != null) this.maxAge = v.maxAge;
    if (v.fromHeightCm != null) this.fromHeightCm = v.fromHeightCm;
    if (v.toHeightCm != null) this.toHeightCm = v.toHeightCm;
    if (v.fromIncome != null) this.fromIncome = v.fromIncome;
    if (v.toIncome != null) this.toIncome = v.toIncome;
    if (v.country) this.selectedCountry = v.country;
    if (v.maritalStatus) this.selectedMaritalStatus = v.maritalStatus;
    if (v.religions?.length) this.selectedReligions = v.religions;
    if (v.occupation) this.occupation = v.occupation;
    if (v.education) this.selectedEducation = v.education;
    if (v.motherTongue) this.selectedLanguage = v.motherTongue;
    if (v.caste) this.caste = v.caste;
    if (v.city) this.city = v.city;
    if (v.state) this.selectedState = v.state;
    if (v.diet?.length) this.selectedDiet = v.diet;
    if (v.personalitySocial?.length) this.selectedPersonalitySocial = v.personalitySocial;
  }

  private formValues(): PartnerPrefsFormValues {
    return {
      minAge: this.minAge,
      maxAge: this.maxAge,
      fromHeightCm: this.fromHeightCm,
      toHeightCm: this.toHeightCm,
      fromIncome: this.fromIncome,
      toIncome: this.toIncome,
      country: this.selectedCountry,
      maritalStatus: this.selectedMaritalStatus,
      religions: this.selectedReligions,
      occupation: this.occupation,
      education: this.selectedEducation,
      motherTongue: this.selectedLanguage,
      caste: this.caste,
      city: this.city,
      state: this.selectedState,
      diet: this.selectedDiet,
      personalitySocial: this.selectedPersonalitySocial
    };
  }

  toggleReligion(value: string): void {
    const idx = this.selectedReligions.indexOf(value);
    if (idx >= 0) {
      this.selectedReligions = this.selectedReligions.filter(v => v !== value);
    } else {
      this.selectedReligions = [...this.selectedReligions, value];
    }
  }

  toggleChip(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter(v => v !== value) : [...list, value];
  }

  onDietToggle(value: string): void {
    this.selectedDiet = this.toggleChip(this.selectedDiet, value);
  }

  onPersonalityToggle(value: string): void {
    this.selectedPersonalitySocial = this.toggleChip(this.selectedPersonalitySocial, value);
  }

  savePreferences(): void {
    const userId = this.resolveUserId();
    if (!userId) {
      alert('Session expired. Please log in and complete your profile first.');
      this.viewChange.emit('login');
      return;
    }
    const criteria = buildV2CriteriaFromPartnerForm(this.formValues(), this.catalogByKey);
    if (!hasMinimalPartnerPrefs(criteria)) {
      alert('Please set at least age range and country.');
      return;
    }

    this.isSaving = true;
    this.matchmaking.savePreferences({
      userId,
      preferences: {
        version: 2,
        criteria,
        matchingConfig: {
          minScorePercent: this.minScorePercent,
          nearMatchMinScorePercent: this.nearMatchMinScorePercent
        }
      }
    }).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res.success) {
          this.completionPercent = res.completion?.completionPercent ?? this.completionPercent;
          if (this.apiService.isAuthenticated()) {
            sessionStorage.setItem('dashboard_initial_filter', 'Best Matches');
            this.viewChange.emit('dashboard');
          } else {
            this.viewChange.emit('login');
          }
          return;
        }
        alert((res as { message?: string }).message || 'Failed to save preferences.');
      },
      error: (err) => {
        this.isSaving = false;
        alert(err?.error?.message || err?.error?.error || 'Failed to save preferences.');
        console.error('Save matchmaking preferences error:', err);
      }
    });
  }

  onBack(): void {
    this.viewChange.emit(backToDashboardView());
  }

  private resolveUserId(): string | null {
    return this.apiService.getAccountUserId();
  }
}

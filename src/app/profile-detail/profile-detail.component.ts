import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewState } from '../types';
import { ApiService } from '../services/api.service';
import { MatchmakingService } from '../services/matchmaking.service';
import { MatchExplain } from '../models/matchmaking.models';
import { normalizeProfileImageUrl } from '../core/utils/profile-image-url';
import { formatMatchExplainLine, MatchExplainLineInput } from '../core/utils/match-explain-label';

interface ProfileData {
  id: number;
  name: string;
  age: number;
  height: string;
  weight: string;
  location: string;
  religion: string;
  caste: string;
  motherTongue: string;
  profession: string;
  income: string;
  education: string;
  workExperience: string;
  occupation: string;
  companyName: string;
  workLocation: string;
  bio: string;
  images: string[];
  matchScore: number;
  profileId: string;
  createdBy: string;
  dateOfBirth: string;
  maritalStatus: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  address: string;
  haveChildren: string;
  smoke: string;
  drinks: string;
  diet: string;
  familyStatus: string;
  familyValues: string;
  familyType: string;
  familyIncome: string;
  fatherOccupation: string;
  motherOccupation: string;
  livingWith: string;
  brothers: number;
  sisters: number;
}

@Component({
  selector: 'app-profile-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-detail.component.html',
  styleUrls: ['./profile-detail.component.css']
})
export class ProfileDetailComponent implements OnChanges {
  @Input() t: any;
  @Input() profileId!: number;
  @Output() viewChange = new EventEmitter<ViewState>();
  @Output() backToDashboard = new EventEmitter<void>();
  @Output() profileMenuAction = new EventEmitter<'report' | 'block'>();

  currentImageIndex = 0;
  apiProfileData: ProfileData | null = null;
  headerMenuOpen = false;
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
  matchExplain: MatchExplain | null = null;
  matchExplainLoading = false;
  explainExpanded = false;

  isFavorited = false;
  connectionStatus: 'none' | 'pending' | 'connected' = 'none';
  connectSending = false;
  connectionToastVisible = false;
  private connectionToastTimer: ReturnType<typeof setTimeout> | null = null;

  get matchPercentDisplay(): number | null {
    const raw = this.matchExplain?.matchPercent ?? this.profile.matchScore;
    return raw != null && Number(raw) > 0 ? Math.round(Number(raw)) : null;
  }

  get hasExplainDetails(): boolean {
    return !!(
      this.matchExplain &&
      ((this.matchExplain.strengths?.length ?? 0) > 0 || (this.matchExplain.gaps?.length ?? 0) > 0)
    );
  }

  formatExplainLine(item: MatchExplainLineInput): string {
    return formatMatchExplainLine(item);
  }

  toggleExplainDetails(): void {
    this.explainExpanded = !this.explainExpanded;
  }

  constructor(
    private apiService: ApiService,
    private matchmaking: MatchmakingService
  ) {}

  allProfiles: ProfileData[] = [];

  get profile(): ProfileData {
    if (this.apiProfileData) {
      return this.apiProfileData;
    }
    const found = this.allProfiles.find(p => p.id === this.profileId);
    // Return a default profile if not found
    if (!found) {
      return {
        id: this.profileId || 0,
        name: 'Profile Not Found',
        age: 0,
        height: '',
        weight: '',
        location: '',
        religion: '',
        caste: '',
        motherTongue: '',
        profession: '',
        income: '',
        education: '',
        workExperience: '',
        occupation: '',
        companyName: '',
        workLocation: '',
        bio: 'Profile information is not available.',
        images: [],
        matchScore: 0,
        profileId: 'N/A',
        createdBy: '',
        dateOfBirth: '',
        maritalStatus: '',
        email: '',
        phone: '',
        country: '',
        state: '',
        city: '',
        address: '',
        haveChildren: '',
        smoke: '',
        drinks: '',
        diet: '',
        familyStatus: '',
        familyValues: '',
        familyType: '',
        familyIncome: '',
        fatherOccupation: '',
        motherOccupation: '',
        livingWith: '',
        brothers: 0,
        sisters: 0
      };
    }
    return found;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['profileId'] && this.profileId) {
      this.apiProfileData = null;
      this.matchExplain = null;
      this.explainExpanded = false;
      this.currentImageIndex = 0;
      this.isFavorited = false;
      this.connectionStatus = 'none';
      this.connectSending = false;
      this.loadProfileDetails();
      this.loadMatchExplain();
      this.loadFavoriteAndConnectionState();
    }
  }

  private loadFavoriteAndConnectionState(): void {
    const userId = this.apiService.getAccountUserId() || this.resolveCurrentUserId();
    if (!userId || !this.profileId) {
      return;
    }

    const tracked = this.apiService.getTrackedSentConnections();
    if (tracked.some((item) => String(item.otherUserId) === String(this.profileId))) {
      this.connectionStatus = 'pending';
    }

    this.apiService.listMyFavorites(userId, 1, 100).subscribe({
      next: (response) => {
        const list = this.extractFavoriteIds(response);
        this.isFavorited = list.some((id) => String(id) === String(this.profileId));
      },
      error: () => {}
    });

    this.apiService.getConnectionStatus(userId, String(this.profileId)).subscribe({
      next: (status) => {
        if (status.connected) {
          this.connectionStatus = 'connected';
        } else if (status.requestSent) {
          this.connectionStatus = 'pending';
          this.apiService.trackSentConnection({
            otherUserId: String(this.profileId),
            name: this.profile.name,
            avatar: this.profile.images?.[0] || ''
          });
        }
      },
      error: () => {}
    });
  }

  private extractFavoriteIds(response: any): Array<string | number> {
    const raw =
      response?.data?.list ||
      response?.data?.favorites ||
      response?.data?.items ||
      response?.favorites ||
      response?.list ||
      response?.data ||
      [];
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .map((item: any) => item?.profileId ?? item?.profile?.id ?? item?.userId ?? item?.id ?? item?._id)
      .filter((id: any): id is string | number => id != null && (typeof id === 'string' || typeof id === 'number'));
  }

  toggleFavorite(): void {
    const userId = this.apiService.getAccountUserId() || this.resolveCurrentUserId();
    if (!userId || !this.profileId) {
      return;
    }
    const next = !this.isFavorited;
    this.isFavorited = next;
    const payload = { userId, profileId: String(this.profileId) };
    const req$ = next
      ? this.apiService.addToFavorites(payload)
      : this.apiService.removeFromFavorites(payload);
    req$.subscribe({
      error: () => {
        this.isFavorited = !next;
      }
    });
  }

  connectToProfile(): void {
    const userId = this.apiService.getAccountUserId() || this.resolveCurrentUserId();
    if (!userId || !this.profileId || this.connectionStatus !== 'none' || this.connectSending) {
      return;
    }
    this.connectSending = true;
    this.apiService.sendConnectionRequest(userId, String(this.profileId)).subscribe({
      next: () => {
        this.connectSending = false;
        this.connectionStatus = 'pending';
        this.showConnectionToast();
        this.apiService.trackSentConnection({
          otherUserId: String(this.profileId),
          name: this.profile.name,
          avatar: this.profile.images?.[0] || ''
        });
        this.apiService.createOrGetConversation({ userId, otherUserId: String(this.profileId) }).subscribe({
          next: (res) => {
            const convId = res?.data?.conversationId ?? res?.data?._id ?? res?.conversationId ?? res?._id;
            if (convId) {
              this.apiService.trackSentConnection({
                otherUserId: String(this.profileId),
                name: this.profile.name,
                avatar: this.profile.images?.[0] || '',
                conversationId: String(convId)
              });
            }
          },
          error: () => {}
        });
      },
      error: () => {
        this.connectSending = false;
        this.connectionStatus = 'pending';
        this.showConnectionToast();
        this.apiService.trackSentConnection({
          otherUserId: String(this.profileId),
          name: this.profile.name,
          avatar: this.profile.images?.[0] || ''
        });
      }
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

  private loadMatchExplain(): void {
    const cached = sessionStorage.getItem(`match_explain_${this.profileId}`);
    if (cached) {
      try {
        this.matchExplain = JSON.parse(cached) as MatchExplain;
        if (this.apiProfileData && this.matchExplain?.matchPercent) {
          this.apiProfileData.matchScore = this.matchExplain.matchPercent;
        }
        return;
      } catch { /* fetch from API */ }
    }
    const viewerId = this.resolveCurrentUserId();
    if (!viewerId || String(this.profileId) === viewerId) return;
    this.matchExplainLoading = true;
    this.matchmaking.explainMatch(viewerId, String(this.profileId)).subscribe({
      next: (res) => {
        this.matchExplainLoading = false;
        if (res.success && res.explain) {
          this.matchExplain = res.explain as MatchExplain;
          if (this.apiProfileData && this.matchExplain.matchPercent) {
            this.apiProfileData.matchScore = this.matchExplain.matchPercent;
          }
        }
      },
      error: () => {
        this.matchExplainLoading = false;
      }
    });
  }

  private loadProfileDetails(): void {
    const userId = String(this.profileId);
    this.apiService.getProfileDetails(userId).subscribe({
      next: (res: any) => {
        const data =
          res?.data?.profile ||
          res?.data?.user ||
          res?.profile ||
          res?.user ||
          res?.data ||
          null;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          this.apiProfileData = this.mapApiProfile(data);
          if (userId === this.resolveCurrentUserId()) {
            this.loadProfilePhotosIntoView(userId);
          }
        }
      },
      error: () => {
        if (userId === this.resolveCurrentUserId()) {
          this.loadProfilePhotosIntoView(userId);
        }
      }
    });
  }

  private resolveCurrentUserId(): string | null {
    const id = localStorage.getItem('profile_user_id');
    if (id) return id;
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const uid = user?.id ?? user?.userId ?? user?._id;
      return uid != null ? String(uid) : null;
    } catch {
      return null;
    }
  }

  /** When viewing own profile, set images from List My Photos API. */
  private loadProfilePhotosIntoView(userId: string): void {
    this.apiService.listMyPhotos(userId).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.photos) && res.photos.length > 0 && this.apiProfileData) {
          const urls = [...res.photos]
            .sort((a, b) => ((a as any)?.sortOrder ?? 0) - ((b as any)?.sortOrder ?? 0))
            .map((p) => normalizeProfileImageUrl(typeof p === 'string' ? p : (p as any)?.url ?? ''))
            .filter(Boolean) as string[];
          if (urls.length > 0) {
            this.apiProfileData = { ...this.apiProfileData, images: urls };
          }
        }
      },
      error: () => {}
    });
  }

  private mapApiProfile(data: any): ProfileData {
    const calcAge = (dob: string): number => {
      if (!dob) return 0;
      try {
        const birth = new Date(dob);
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const m = now.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
        return age;
      } catch { return 0; }
    };

    const rawPhotos = data.photos || data.images || data.profilePhotos || [];
    const images: string[] = Array.isArray(rawPhotos) && rawPhotos.length > 0
      ? rawPhotos.map((p: any) => normalizeProfileImageUrl(typeof p === 'string' ? p : p?.url || p?.path || ''))
      : [];

    return {
      id: data.id || data._id || data.userId || this.profileId,
      name: data.name || data.full_name || data.fullName || 'Unknown',
      age: data.age ?? calcAge(data.date_of_birth || data.dateOfBirth || data.dob || ''),
      height: data.height || '',
      weight: data.weight || '',
      location: data.location || data.city || '',
      religion: data.religion || '',
      caste: data.caste || '',
      motherTongue: data.mother_tongue || data.motherTongue || '',
      profession: data.profession || data.occupation || '',
      income: data.income || data.annual_income || data.annualIncome || '',
      education: data.education || '',
      workExperience: data.work_experience || data.workExperience || '',
      occupation: data.occupation || data.profession || '',
      companyName: data.company_name || data.companyName || '',
      workLocation: data.work_location || data.workLocation || '',
      bio: data.bio || data.about || data.description || '',
      images,
      matchScore: Number(data.match_score ?? data.matchScore ?? data.compatibility_score ?? data.score) || 0,
      profileId: data.profile_id || data.profileId || data.id || data._id || String(this.profileId),
      createdBy: data.created_by || data.createdBy || data.profileFor || data.profile_for || data.who_uses || data.whoUses || data.relationship || 'Self',
      dateOfBirth: data.date_of_birth || data.dateOfBirth || data.dob || '',
      maritalStatus: data.marital_status || data.maritalStatus || '',
      email: data.email || '',
      phone: data.phone || data.mobile || data.phoneNumber || '',
      country: data.country || 'India',
      state: data.state || '',
      city: data.city || '',
      address: data.address || data.current_address || data.currentAddress || '',
      haveChildren: data.have_children || data.haveChildren || 'No',
      smoke: data.smoke || data.smoking || 'No',
      drinks: data.drinks || data.drinking || 'No',
      diet: data.diet || data.food_preference || data.foodPreference || '',
      familyStatus: data.family_status || data.familyStatus || '',
      familyValues: data.family_values || data.familyValues || '',
      familyType: data.family_type || data.familyType || '',
      familyIncome: data.family_income || data.familyIncome || '',
      fatherOccupation: data.father_occupation || data.fatherOccupation || '',
      motherOccupation: data.mother_occupation || data.motherOccupation || '',
      livingWith: data.living_with || data.livingWith || '',
      brothers: typeof data.brothers === 'number' ? data.brothers : 0,
      sisters: typeof data.sisters === 'number' ? data.sisters : 0
    };
  }

  onBack() {
    this.viewChange.emit('dashboard');
    this.backToDashboard.emit();
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
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.reportModalOpen) {
        this.closeReportModal();
      }
      if (this.blockModalOpen) {
        this.closeBlockModal();
      }
    }
  }

  onHeaderMenuSelect(action: 'report' | 'block'): void {
    this.headerMenuOpen = false;
    if (action === 'report') {
      this.openReportModal();
      return;
    }
    this.openBlockModal();
  }

  openReportModal(): void {
    this.selectedReportReason = this.reportReasons[0];
    this.reportDetails = '';
    this.reportModalOpen = true;
    this.updateBodyScrollLock();
  }

  closeReportModal(): void {
    this.reportModalOpen = false;
    this.updateBodyScrollLock();
  }

  setReportReason(reason: string): void {
    this.selectedReportReason = reason;
  }

  onReportDetailsInput(value: string): void {
    this.reportDetails = value.slice(0, this.reportDetailsMaxLength);
  }

  submitReport(): void {
    if (!this.selectedReportReason || this.reportSubmitting) {
      return;
    }

    const reporterId = this.resolveCurrentUserId();
    if (!reporterId) {
      window.alert('Please login again to submit report.');
      return;
    }

    const reportedUserId = this.profile?.id != null ? String(this.profile.id) : String(this.profileId);
    const payload = {
      userId: reporterId,
      reportedUserId,
      reason: this.mapReportReason(this.selectedReportReason),
      details: this.reportDetails.trim() || undefined
    };

    this.reportSubmitting = true;
    this.apiService.submitUserReport(payload).subscribe({
      next: (res: any) => {
        this.reportSubmitting = false;
        this.profileMenuAction.emit('report');
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
    this.updateBodyScrollLock();
  }

  closeBlockModal(): void {
    this.blockModalOpen = false;
    this.updateBodyScrollLock();
  }

  onBlockReasonInput(value: string): void {
    this.blockReason = value.slice(0, this.blockReasonMaxLength);
  }

  submitBlock(): void {
    if (this.blockSubmitting) {
      return;
    }

    const userId = this.resolveCurrentUserId();
    if (!userId) {
      window.alert('Please login again to block user.');
      return;
    }

    const blockedUserId = this.profile?.id != null ? String(this.profile.id) : String(this.profileId);
    const payload = {
      userId,
      blockedUserId,
      reason: this.blockReason.trim() || undefined
    };

    this.blockSubmitting = true;
    this.apiService.blockUser(payload).subscribe({
      next: (res: any) => {
        this.blockSubmitting = false;
        this.profileMenuAction.emit('block');
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

  private updateBodyScrollLock(): void {
    document.body.style.overflow = this.reportModalOpen || this.blockModalOpen ? 'hidden' : '';
  }

  private mapReportReason(reason: string): string {
    const normalized = reason.trim().toLowerCase();
    switch (normalized) {
      case 'fake profile':
        return 'fake_profile';
      case 'inappropriate content':
        return 'inappropriate_content';
      case 'child safety concerns':
        return 'child_safety_concerns';
      default:
        return normalized.replace(/\s+/g, '_');
    }
  }

  nextImage() {
    if (this.currentImageIndex < this.profile.images.length - 1) {
      this.currentImageIndex++;
    }
  }

  prevImage() {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    }
  }

  goToDashboard() {
    this.viewChange.emit('dashboard');
  }
}
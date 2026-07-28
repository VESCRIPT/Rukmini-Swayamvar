import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewState } from '../types';
import { backToDashboardView } from '../core/constants/dashboard-sidebar-views';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-marriage-profile-pdf',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './marriage-profile-pdf.component.html',
  styleUrls: ['./marriage-profile-pdf.component.css']
})
export class MarriageProfilePdfComponent implements OnInit {
  @Input() previousView: ViewState = 'dashboard';
  @Output() viewChange = new EventEmitter<ViewState>();

  biodata: string | null = null;
  isSaving = false;
  errorMessage: string | null = null;

  constructor(private apiService: ApiService) {}

  private resolveUserId(): string | null {
    const profileUserId = localStorage.getItem('profile_user_id');
    if (profileUserId) return profileUserId;
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    try {
      const user = JSON.parse(stored) as { id?: string | number; userId?: string | number; _id?: string | number };
      const userId = user.id || user.userId || user._id;
      return userId ? String(userId) : null;
    } catch {
      return null;
    }
  }

  ngOnInit(): void {
    const userId = this.resolveUserId();
    if (!userId) return;
    this.apiService.getMyPdf(userId).subscribe({
      next: (res: any) => {
        const fromPdfApi = this.extractPdfReferenceFromAny(res);
        if (fromPdfApi) {
          this.biodata = fromPdfApi;
          return;
        }
        this.loadBiodataFromProfileDetails(userId);
      },
      error: () => {
        this.loadBiodataFromProfileDetails(userId);
      }
    });
  }

  private loadBiodataFromProfileDetails(userId: string): void {
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
          const raw =
            (data as any).biodata ??
            (data as any).biodata_pdf ??
            (data as any).biodataPDF ??
            (data as any).biodataFile ??
            (data as any).biodata_file ??
            (data as any).biodataFilename ??
            (data as any).biodata_filename ??
            (data as any).biodataName ??
            (data as any).biodata_name ??
            (data as any).biodataDoc ??
            (data as any).biodata_doc ??
            (data as any).marriageProfile ??
            (data as any).marriage_profile ??
            (data as any).marriage_profile_pdf ??
            (data as any).biodataUrl ??
            (data as any).biodata_url ??
            (data as any).bio_pdf;

          const normalize = (val: any): string | null => {
            if (!val) return null;
            if (typeof val === 'string') {
              const trimmed = val.trim();
              return trimmed ? trimmed : null;
            }
            if (Array.isArray(val) && val.length > 0) {
              return normalize(val[0]);
            }
            if (typeof val === 'object') {
              const candidate = val.url || val.path || val.src || val.href;
              return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
            }
            return null;
          };

          const normalized = normalize(raw);
          if (normalized) {
            this.biodata = normalized;
          }
        }
      },
      error: () => {}
    });
  }

  onBiodataSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.errorMessage = null;
    if (file && file.type === 'application/pdf') {
      if (file.size <= 10 * 1024 * 1024) {
        this.saveBiodata(file, false);
      } else {
        this.errorMessage = 'PDF size should be less than 10MB';
      }
    } else {
      this.errorMessage = 'Please select a PDF file';
    }
    input.value = '';
  }

  removeBiodata(): void {
    this.saveBiodata(null, true);
  }

  private saveBiodata(file: File | null, remove: boolean): void {
    const userId = this.resolveUserId();
    if (!userId) return;
    this.isSaving = true;
    this.errorMessage = null;

    const request$ = remove
      ? this.apiService.deleteMyPdf(userId)
      : null;

    if (!remove && file) {
      this.uploadPdfWithReplace(userId, file);
      return;
    }
    if (!request$) {
      this.isSaving = false;
      return;
    }

    request$.subscribe({
      next: (response: any) => {
        this.isSaving = false;
        const isSuccess =
          response?.success === true ||
          response?.status === 'success' ||
          !!response?.message;
        if (isSuccess) {
          if (remove) {
            this.biodata = null;
          } else if (file) {
            this.biodata = this.extractPdfReferenceFromResponse(response) || file.name;
          }
        } else {
          this.errorMessage =
            response?.message || 'Failed to update. Please try again.';
        }
      },
      error: (err: any) => {
        this.isSaving = false;
        const backendMsg = err?.error?.message || err?.error?.error || err?.message;
        this.errorMessage =
          backendMsg ||
          'An error occurred while updating. Please try again.';
      }
    });
  }

  private uploadPdfWithReplace(userId: string, file: File): void {
    this.apiService.uploadProfilePdf(userId, file).subscribe({
      next: (response: any) => {
        this.isSaving = false;
        const isSuccess =
          response?.success === true ||
          response?.status === 'success' ||
          !!response?.message;
        if (isSuccess) {
          this.biodata = this.extractPdfReferenceFromResponse(response) || file.name;
        } else {
          this.errorMessage = response?.message || 'Failed to update. Please try again.';
        }
      },
      error: (err: any) => {
        if (!this.isPdfReplaceRequiredError(err)) {
          this.isSaving = false;
          const backendMsg = err?.error?.message || err?.error?.error || err?.message;
          this.errorMessage = backendMsg || 'An error occurred while updating. Please try again.';
          return;
        }
        this.apiService.deleteMyPdf(userId).subscribe({
          next: () => {
            this.apiService.uploadProfilePdf(userId, file).subscribe({
              next: (response: any) => {
                this.isSaving = false;
                const isSuccess =
                  response?.success === true ||
                  response?.status === 'success' ||
                  !!response?.message;
                if (isSuccess) {
                  this.biodata = this.extractPdfReferenceFromResponse(response) || file.name;
                } else {
                  this.errorMessage = response?.message || 'Failed to update. Please try again.';
                }
              },
              error: (retryErr: any) => {
                this.isSaving = false;
                const backendMsg = retryErr?.error?.message || retryErr?.error?.error || retryErr?.message;
                this.errorMessage = backendMsg || 'An error occurred while updating. Please try again.';
              }
            });
          },
          error: (deleteErr: any) => {
            this.isSaving = false;
            const backendMsg = deleteErr?.error?.message || deleteErr?.error?.error || deleteErr?.message;
            this.errorMessage = backendMsg || 'An error occurred while updating. Please try again.';
          }
        });
      }
    });
  }

  private isPdfReplaceRequiredError(err: any): boolean {
    const msg = String(err?.error?.message || err?.error?.error || err?.message || '').toLowerCase();
    return msg.includes('only one pdf per user allowed');
  }

  private extractPdfReferenceFromResponse(res: any): string | null {
    return this.extractPdfReferenceFromAny(res);
  }

  private extractPdfReferenceFromAny(res: any): string | null {
    const normalize = (val: any): string | null => {
      if (!val) return null;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed ? trimmed : null;
      }
      if (Array.isArray(val) && val.length > 0) {
        return normalize(val[0]);
      }
      if (typeof val === 'object') {
        const candidate =
          val.pdfUrl ??
          val.url ??
          val.path ??
          val.file ??
          val.document ??
          val.biodata ??
          val.biodataUrl ??
          val.marriageProfile ??
          val.marriage_profile ??
          val.marriage_profile_pdf ??
          val.src ??
          val.href;
        if (candidate !== undefined) {
          return normalize(candidate);
        }
      }
      return null;
    };

    return (
      normalize(res?.data?.pdfUrl) ||
      normalize(res?.data?.url) ||
      normalize(res?.data?.path) ||
      normalize(res?.data?.pdf) ||
      normalize(res?.data?.file) ||
      normalize(res?.data?.document) ||
      normalize(res?.data?.biodata) ||
      normalize(res?.data?.biodataUrl) ||
      normalize(res?.data?.marriageProfile) ||
      normalize(res?.data?.marriage_profile) ||
      normalize(res?.data?.marriage_profile_pdf) ||
      normalize(res?.pdfUrl) ||
      normalize(res?.url) ||
      normalize(res?.path) ||
      normalize(res?.pdf) ||
      normalize(res?.file) ||
      normalize(res?.document) ||
      normalize(res?.biodata) ||
      normalize(res?.biodataUrl) ||
      normalize(res?.marriageProfile) ||
      normalize(res?.marriage_profile) ||
      normalize(res?.marriage_profile_pdf)
    );
  }

  goBack(): void {
    this.viewChange.emit(backToDashboardView());
  }
}

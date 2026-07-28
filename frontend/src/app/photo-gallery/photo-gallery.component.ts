import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ViewState } from '../types';
import { backToDashboardView } from '../core/constants/dashboard-sidebar-views';
import { ApiService } from '../services/api.service';
import { normalizeProfileImageUrl } from '../core/utils/profile-image-url';

export interface GalleryPhoto {
  id?: string;
  url: string;
  sortOrder?: number;
}

@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './photo-gallery.component.html',
  styleUrls: ['./photo-gallery.component.css']
})
export class PhotoGalleryComponent implements OnInit {
  @Input() previousView: ViewState = 'dashboard';
  @Output() viewChange = new EventEmitter<ViewState>();

  photos: GalleryPhoto[] = [];
  pendingPhotos: GalleryPhoto[] = [];
  uploading = false;
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
    this.loadPhotos();
  }

  goBack(): void {
    this.viewChange.emit(backToDashboardView());
  }

  loadPhotos(): void {
    const userId = this.resolveUserId();
    if (!userId) return;

    this.apiService.listMyPhotos(userId).subscribe({
      next: (res: any) => {
        const rawPhotos = res?.photos ?? res?.data?.photos ?? res?.Photos ?? res?.data?.Photos;
        const list = Array.isArray(rawPhotos) ? rawPhotos : [];

        this.photos = [...list]
          .sort((a, b) => ((a as any)?.sortOrder ?? 0) - ((b as any)?.sortOrder ?? 0))
          .map((p): GalleryPhoto => {
            if (typeof p === 'string') {
              return { url: normalizeProfileImageUrl(p), sortOrder: 0 };
            }
            const url = (p as any)?.url ?? (p as any)?.imageUrl ?? (p as any)?.path;
            const rawId = (p as any)?.id ?? (p as any)?._id ?? (p as any)?.photoId ?? (p as any)?.photo_id;
            return {
              id: rawId != null ? String(rawId) : undefined,
              url: normalizeProfileImageUrl(url || ''),
              sortOrder: Number((p as any)?.sortOrder ?? 0)
            };
          })
          .filter((p) => p.url.length > 0);

        this.normalizePreferredPhotoOrder();

        const rawPending = res?.pendingPhotos ?? res?.data?.pendingPhotos ?? res?.pending_photos ?? res?.data?.pending_photos ?? [];
        const pendingList = Array.isArray(rawPending) ? rawPending : [];
        this.pendingPhotos = [...pendingList]
          .sort((a, b) => ((a as any)?.sortOrder ?? 0) - ((b as any)?.sortOrder ?? 0))
          .map((p): GalleryPhoto => {
            if (typeof p === 'string') {
              return { url: normalizeProfileImageUrl(p) };
            }
            const url = (p as any)?.url ?? (p as any)?.imageUrl ?? (p as any)?.path;
            const rawId = (p as any)?.id ?? (p as any)?._id ?? (p as any)?.photoId ?? (p as any)?.photo_id;
            return {
              id: rawId != null ? String(rawId) : undefined,
              url: normalizeProfileImageUrl(url || ''),
              sortOrder: Number((p as any)?.sortOrder ?? 0)
            };
          })
          .filter((p) => p.url.length > 0);
      },
      error: () => {}
    });
  }

  isPreferredPhoto(photo: GalleryPhoto): boolean {
    return this.photos.length > 0 && this.photos[0].url === photo.url;
  }

  canSetAsProfilePhoto(photo: GalleryPhoto): boolean {
    return !this.isPreferredPhoto(photo);
  }

  setAsProfilePhoto(index: number): void {
    if (index < 0 || index >= this.photos.length) return;

    const originalPhotos = [...this.photos];
    const [selected] = this.photos.splice(index, 1);
    this.photos = [
      { ...selected, sortOrder: 0 },
      ...this.photos.map((photo, idx) => ({ ...photo, sortOrder: idx + 1 }))
    ];

    localStorage.setItem('primary_profile_photo_url', selected.url);
    if (selected.id) {
      localStorage.setItem('primary_profile_photo_id', selected.id);
    } else {
      localStorage.removeItem('primary_profile_photo_id');
    }

    const userId = this.resolveUserId();
    if (userId) {
      const photoNames = this.photos.map(p => {
        const cleanUrl = p.url.split('?')[0];
        return cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
      });

      this.errorMessage = null;
      this.apiService.reorderProfilePhotos(userId, photoNames).subscribe({
        next: () => {
          this.loadPhotos();
        },
        error: (err: any) => {
          this.photos = originalPhotos;
          this.normalizePreferredPhotoOrder();
          this.errorMessage = err?.error?.message || 'Failed to update profile photo order on the server.';
        }
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const userId = this.resolveUserId();
    if (!userId) return;

    const toUpload: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.match('image.*')) toUpload.push(file);
    }
    if (toUpload.length === 0) return;

    this.uploading = true;
    this.errorMessage = null;
    forkJoin(toUpload.map((file) => this.apiService.uploadProfilePhoto(userId, file))).subscribe({
      next: () => {
        this.uploading = false;
        this.loadPhotos();
        input.value = '';
      },
      error: (err: any) => {
        this.uploading = false;
        this.errorMessage = err?.error?.message || 'Failed to upload photo(s).';
        input.value = '';
      }
    });
  }

  removePendingPhoto(index: number): void {
    const photo = this.pendingPhotos[index];
    if (photo?.id) {
      this.pendingPhotos.splice(index, 1);
    }
  }

  removePhoto(index: number): void {
    const userId = this.resolveUserId();
    const photo = this.photos[index];
    if (!photo) return;
    const removed = { ...photo };
    this.photos = this.photos.filter((_, i) => i !== index);
    this.errorMessage = null;

    if (this.isPreferredPhoto(removed)) {
      this.normalizePreferredPhotoOrder();
    }

    if (!userId) return;
    const idToSend = photo.id || photo.url;
    if (!idToSend) return;

    const restore = () => {
      this.photos = [...this.photos.slice(0, index), removed, ...this.photos.slice(index)];
      this.errorMessage = 'Failed to remove photo.';
    };

    this.apiService.deleteProfilePhoto(userId, idToSend).subscribe({
      next: () => {},
      error: () => {
        this.apiService.deleteProfilePhotoByPath(userId, idToSend).subscribe({
          next: () => {},
          error: () => {
            this.apiService.removeProfilePhoto(userId, idToSend).subscribe({
              next: () => {},
              error: restore
            });
          }
        });
      }
    });
  }

  private normalizePreferredPhotoOrder(): void {
    if (this.photos.length === 0) return;

    const preferredUrl = localStorage.getItem('primary_profile_photo_url');
    const preferredId = localStorage.getItem('primary_profile_photo_id');

    let preferredIndex = -1;
    if (preferredUrl) {
      preferredIndex = this.photos.findIndex((photo) => photo.url === preferredUrl);
    }
    if (preferredIndex === -1 && preferredId) {
      preferredIndex = this.photos.findIndex((photo) => photo.id === preferredId);
    }

    if (preferredIndex > 0) {
      const [selected] = this.photos.splice(preferredIndex, 1);
      this.photos = [
        { ...selected, sortOrder: 0 },
        ...this.photos.map((photo, idx) => ({ ...photo, sortOrder: idx + 1 }))
      ];
    }

    const primary = this.photos[0];
    if (primary) {
      localStorage.setItem('primary_profile_photo_url', primary.url);
      localStorage.setItem('primary_profile_photo_id', primary.id || '');
    }
  }
}

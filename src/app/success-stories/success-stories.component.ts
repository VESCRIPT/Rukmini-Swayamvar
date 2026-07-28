import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { extractMediaUrl } from '../core/utils/profile-image-url';

export type SuccessStoriesTab = 'gallery' | 'mine' | 'share';

export interface GalleryStory {
  displayName: string;
  weddingDate: string;
  image: string;
  caption: string;
  story: string;
}

@Component({
  selector: 'app-success-stories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './success-stories.component.html',
  styleUrl: './success-stories.component.css'
})
export class SuccessStoriesComponent implements OnInit {
  @Input() t: any;
  @Input() origin: string | null = null;
  @Output() viewChange = new EventEmitter<string>();

  activeTab: SuccessStoriesTab = 'gallery';
  selectedStory: GalleryStory | null = null;

  galleryStories: GalleryStory[] = [];

  /** User submissions from API */
  mySubmissions: GalleryStory[] = [];

  shareStory = '';
  shareSpouseName = '';
  shareSpouseId = '';
  shareWeddingDate = '';
  sharePhotoFiles: File[] = [];
  sharePhotoPreviews: string[] = [];
  shareError = '';
  shareSuccess = '';
  isSubmittingShare = false;
  isLoadingGallery = false;
  galleryError = '';
  isLoadingMine = false;
  mineError = '';

  constructor(private apiService: ApiService) {}

  /** Mine / Share only when opened from Settings. Footer / public entry = Gallery only. */
  get showMemberTabs(): boolean {
    return this.origin === 'settings';
  }

  ngOnInit(): void {
    if (!this.showMemberTabs) {
      this.activeTab = 'gallery';
    }
    this.loadGalleryStories();
  }

  setTab(tab: SuccessStoriesTab): void {
    if (!this.showMemberTabs && tab !== 'gallery') {
      this.activeTab = 'gallery';
      return;
    }
    this.activeTab = tab;
    this.shareError = '';
    this.shareSuccess = '';
    if (tab === 'mine') {
      this.loadMyStories();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToShareFromMine(): void {
    this.setTab('share');
  }

  goBack(): void {
    this.viewChange.emit(this.origin || 'home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openStory(story: GalleryStory): void {
    this.selectedStory = story;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.selectedStory = null;
    document.body.style.overflow = '';
  }

  onPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) {
      return;
    }
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        continue;
      }
      this.sharePhotoFiles.push(file);
      const url = URL.createObjectURL(file);
      this.sharePhotoPreviews.push(url);
    }
    input.value = '';
    this.shareError = '';
  }

  removePhotoAt(index: number): void {
    const url = this.sharePhotoPreviews[index];
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.sharePhotoPreviews.splice(index, 1);
    this.sharePhotoFiles.splice(index, 1);
  }

  submitShare(): void {
    this.shareError = '';
    this.shareSuccess = '';

    if (this.isSubmittingShare) {
      return;
    }

    if (this.sharePhotoFiles.length === 0) {
      this.shareError = 'Please add at least one photo. Stories require photos for review.';
      return;
    }

    const userId = this.resolveUserId();
    if (!userId) {
      this.shareError = 'User not found. Please login again.';
      return;
    }

    this.isSubmittingShare = true;

    const caption =
      this.shareStory.trim().slice(0, 200) ||
      'Thank you for sharing your journey with Rukmini Swayamvar.';
    const displayName = this.shareSpouseName.trim()
      ? `You & ${this.shareSpouseName.trim()}`
      : 'Our story';
    const wedding = this.shareWeddingDate.trim() || new Date().toISOString().slice(0, 10);

    this.apiService.submitSuccessStory(userId, {
      photos: this.sharePhotoFiles,
      story: this.shareStory,
      weddingDate: this.shareWeddingDate,
      spouseName: this.shareSpouseName,
      spouseUserId: this.shareSpouseId
    }).subscribe({
      next: () => {
        this.isSubmittingShare = false;
        this.shareSuccess = 'Story submitted successfully. It will appear after admin approval.';

        this.mySubmissions.unshift({
          displayName,
          weddingDate: wedding,
          image: this.sharePhotoPreviews[0],
          caption,
          story: this.shareStory.trim() || caption
        });

        this.shareStory = '';
        this.shareSpouseName = '';
        this.shareSpouseId = '';
        this.shareWeddingDate = '';
        this.clearSharePhotos();
        this.loadMyStories();
        this.setTab('mine');
      },
      error: (error: any) => {
        this.isSubmittingShare = false;
        this.shareError = error?.error?.error || error?.error?.message || 'Failed to submit story.';
      }
    });
  }

  private resolveUserId(): string | null {
    const profileUserId = localStorage.getItem('profile_user_id');
    if (profileUserId) return profileUserId;

    const storedUser = localStorage.getItem('user');
    if (!storedUser) return null;

    try {
      const user = JSON.parse(storedUser) as { id?: string | number; userId?: string | number; _id?: string | number };
      const userId = user.id || user.userId || user._id;
      return userId != null ? String(userId) : null;
    } catch {
      return null;
    }
  }

  private clearSharePhotos(): void {
    this.sharePhotoPreviews.forEach((u) => URL.revokeObjectURL(u));
    this.sharePhotoPreviews = [];
    this.sharePhotoFiles = [];
  }

  private loadMyStories(page = 1, limit = 20): void {
    const userId = this.resolveUserId();
    if (!userId) {
      this.mySubmissions = [];
      this.mineError = 'User not found. Please login again.';
      return;
    }

    this.isLoadingMine = true;
    this.mineError = '';

    this.apiService.listMySuccessStories({ userId, page, limit }).subscribe({
      next: (response: any) => {
        this.isLoadingMine = false;
        if (response?.success === false) {
          this.mineError = response?.error || response?.message || 'Failed to load your submissions.';
          this.mySubmissions = [];
          return;
        }

        const stories = this.extractStoriesList(response);
        this.mySubmissions = stories.map((item: any) => this.mapStoryItem(item));
      },
      error: (error: any) => {
        this.isLoadingMine = false;
        this.mineError = error?.error?.message || 'Failed to load your submissions.';
        this.mySubmissions = [];
      }
    });
  }

  private loadGalleryStories(page = 1, limit = 12): void {
    this.isLoadingGallery = true;
    this.galleryError = '';

    this.apiService.listSuccessStories({ page, limit }).subscribe({
      next: (response: any) => {
        this.isLoadingGallery = false;
        if (response?.success === false) {
          this.galleryError = response?.error || response?.message || 'Failed to load stories.';
          this.galleryStories = [];
          return;
        }

        const stories = this.extractStoriesList(response);
        this.galleryError = '';
        this.galleryStories = stories.map((item: any) => this.mapStoryItem(item));
      },
      error: (error: any) => {
        this.isLoadingGallery = false;
        this.galleryError = error?.error?.message || 'Failed to load stories.';
        this.galleryStories = [];
      }
    });
  }

  private extractStoriesList(response: any): any[] {
    if (!response || typeof response !== 'object') return [];
    const data = response.data ?? response;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.stories)) return data.stories;
    if (Array.isArray(data?.list)) return data.list;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(response?.stories)) return response.stories;
    return [];
  }

  private mapStoryItem(item: any): GalleryStory {
    const displayName =
      item?.displayName ||
      item?.coupleName ||
      item?.names ||
      [item?.userName, item?.spouseName].filter(Boolean).join(' & ') ||
      'Success Story';

    const weddingDate =
      item?.weddingDate ||
      item?.wedding_date ||
      item?.date ||
      '';

    const story =
      item?.story ||
      item?.description ||
      item?.narrative ||
      '';

    return {
      displayName: String(displayName),
      weddingDate: String(weddingDate),
      image: this.resolveStoryImage(item),
      caption: story ? String(story).slice(0, 80) : 'Shared a success story.',
      story: String(story || 'Success story submitted.')
    } as GalleryStory;
  }

  private resolveStoryImage(item: any): string {
    const directFields = [
      'image',
      'imageUrl',
      'image_url',
      'photo',
      'photoUrl',
      'photo_url',
      'coverPhoto',
      'cover_photo',
      'thumbnail',
      'thumbnailUrl'
    ];

    for (const field of directFields) {
      const url = extractMediaUrl(item?.[field]);
      if (url) return url;
    }

    const arrayFields = ['photos', 'photoUrls', 'photo_urls', 'images', 'gallery', 'media'];
    for (const field of arrayFields) {
      const arr = item?.[field];
      if (!Array.isArray(arr) || arr.length === 0) continue;
      const url = extractMediaUrl(arr[0]);
      if (url) return url;
    }

    return '';
  }

  onStoryImageError(item: GalleryStory): void {
    item.image = '';
  }
}

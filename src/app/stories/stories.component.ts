import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { extractMediaUrl } from '../core/utils/profile-image-url';

export interface LoveStory {
  couple: string;
  location: string;
  image: string;
  quote: string;
  story: string;
}

@Component({
  selector: 'app-stories',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stories.component.html',
  styleUrl: './stories.component.css'
})
export class StoriesComponent implements OnInit, OnDestroy {
  @Input() t: any;
  @Input() standalonePage = false;
  @Output() viewChange = new EventEmitter<string>();
  @ViewChild('scrollWrapper') scrollWrapper!: ElementRef<HTMLElement>;
  @ViewChild('modalBody') modalBody!: ElementRef<HTMLElement>;

  selectedStory: LoveStory | null = null;
  isLoading = false;
  loadError = '';
  loveStories: LoveStory[] = [];

  private autoScrollTimer: ReturnType<typeof setInterval> | null = null;
  private modalScrollTimer: ReturnType<typeof setInterval> | null = null;
  private modalScrollTimeout: ReturnType<typeof setTimeout> | null = null;
  private isHoveringCarousel = false;
  private readonly AUTO_SCROLL_MS = 4000;
  private readonly MODAL_SCROLL_MS = 40;
  private readonly MODAL_SCROLL_STEP = 1;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadStories();
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
    this.stopModalAutoScroll();
    document.body.style.overflow = 'auto';
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.hidden) {
      this.stopAutoScroll();
      this.stopModalAutoScroll();
    } else if (!this.selectedStory && !this.isHoveringCarousel) {
      this.startAutoScroll();
    } else if (this.selectedStory) {
      this.startModalAutoScroll();
    }
  }

  onCarouselEnter(): void {
    this.isHoveringCarousel = true;
    this.stopAutoScroll();
  }

  onCarouselLeave(): void {
    this.isHoveringCarousel = false;
    if (!this.selectedStory) {
      this.startAutoScroll();
    }
  }

  pauseModalAutoScroll(): void {
    this.stopModalAutoScroll();
  }

  resumeModalAutoScroll(): void {
    if (this.selectedStory) {
      this.startModalAutoScroll();
    }
  }

  scrollNext(): void {
    const wrapper = this.scrollWrapper?.nativeElement;
    if (!wrapper) return;

    const card = wrapper.querySelector('.story-card') as HTMLElement | null;
    const gap = this.getCardGap();
    const cardWidth = card ? card.offsetWidth + gap : 382;
    const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;

    if (wrapper.scrollLeft >= maxScroll - 8) {
      wrapper.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      wrapper.scrollBy({ left: cardWidth, behavior: 'smooth' });
    }
  }

  scrollPrev(): void {
    const wrapper = this.scrollWrapper?.nativeElement;
    if (!wrapper) return;

    const card = wrapper.querySelector('.story-card') as HTMLElement | null;
    const gap = this.getCardGap();
    const cardWidth = card ? card.offsetWidth + gap : 382;

    if (wrapper.scrollLeft <= 8) {
      wrapper.scrollTo({ left: wrapper.scrollWidth, behavior: 'smooth' });
    } else {
      wrapper.scrollBy({ left: -cardWidth, behavior: 'smooth' });
    }
  }

  openStory(index: number): void {
    this.selectedStory = this.loveStories[index];
    document.body.style.overflow = 'hidden';
    this.stopAutoScroll();
    this.scheduleModalAutoScroll();
  }

  closeModal(): void {
    this.selectedStory = null;
    document.body.style.overflow = 'auto';
    this.stopModalAutoScroll();
    if (!this.isHoveringCarousel) {
      this.startAutoScroll();
    }
  }

  goBack(): void {
    this.viewChange.emit('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onStoryImageError(story: LoveStory): void {
    story.image = '';
  }

  private getCardGap(): number {
    const container = this.scrollWrapper?.nativeElement?.querySelector('.stories-track') as HTMLElement | null;
    if (!container) return 40;
    const style = getComputedStyle(container);
    const gap = parseFloat(style.columnGap || style.gap || '40');
    return Number.isFinite(gap) ? gap : 40;
  }

  private startAutoScroll(): void {
    if (this.standalonePage || this.loveStories.length <= 1 || this.selectedStory) {
      return;
    }
    this.stopAutoScroll();
    this.autoScrollTimer = setInterval(() => {
      if (this.isHoveringCarousel || this.selectedStory || document.hidden) return;
      this.scrollNext();
    }, this.AUTO_SCROLL_MS);
  }

  private stopAutoScroll(): void {
    if (this.autoScrollTimer) {
      clearInterval(this.autoScrollTimer);
      this.autoScrollTimer = null;
    }
  }

  private scheduleModalAutoScroll(): void {
    this.stopModalAutoScroll();
    this.modalScrollTimeout = setTimeout(() => this.startModalAutoScroll(), 800);
  }

  private startModalAutoScroll(): void {
    this.stopModalAutoScroll();
    this.modalScrollTimer = setInterval(() => {
      const body = this.modalBody?.nativeElement;
      if (!body || !this.selectedStory) {
        this.stopModalAutoScroll();
        return;
      }

      const maxScroll = body.scrollHeight - body.clientHeight;
      if (maxScroll <= 4) {
        this.stopModalAutoScroll();
        return;
      }

      if (body.scrollTop >= maxScroll - 2) {
        body.scrollTop = 0;
      } else {
        body.scrollTop += this.MODAL_SCROLL_STEP;
      }
    }, this.MODAL_SCROLL_MS);
  }

  private stopModalAutoScroll(): void {
    if (this.modalScrollTimer) {
      clearInterval(this.modalScrollTimer);
      this.modalScrollTimer = null;
    }
    if (this.modalScrollTimeout) {
      clearTimeout(this.modalScrollTimeout);
      this.modalScrollTimeout = null;
    }
  }

  private loadStories(): void {
    this.isLoading = true;
    this.loadError = '';
    this.apiService.listSuccessStories({ page: 1, limit: 12 }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response?.success === false) {
          this.loadError = response?.error || response?.message || 'Failed to load stories.';
          this.loveStories = [];
          return;
        }
        const items = this.extractStoriesList(response);
        this.loveStories = items.map((item) => this.mapStoryItem(item)).filter((s) => !!s.couple);
        this.preloadStoryImages(this.loveStories.slice(0, 3));
        setTimeout(() => this.startAutoScroll(), 500);
      },
      error: (error: any) => {
        this.isLoading = false;
        this.loadError = error?.error?.message || 'Failed to load stories.';
        this.loveStories = [];
      }
    });
  }

  private preloadStoryImages(stories: LoveStory[]): void {
    for (const story of stories) {
      if (!story.image) continue;
      const img = new Image();
      img.src = story.image;
    }
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

  private mapStoryItem(item: any): LoveStory {
    const couple =
      item?.displayName ||
      item?.coupleName ||
      item?.couple ||
      item?.names ||
      [item?.userName, item?.spouseName].filter(Boolean).join(' & ') ||
      'Success Story';

    const storyText =
      item?.story ||
      item?.description ||
      item?.narrative ||
      item?.caption ||
      '';

    const rawQuote =
      item?.quote ||
      item?.caption ||
      (storyText ? String(storyText) : 'A blessed union through Rukmini Swayamvar.');

    const location =
      item?.location ||
      item?.city ||
      item?.place ||
      item?.hometown ||
      '';

    return {
      couple: String(couple),
      location: String(location),
      image: this.resolveStoryImage(item),
      quote: this.truncateAtWord(String(rawQuote), 140),
      story: String(storyText || rawQuote)
    };
  }

  private truncateAtWord(text: string, maxLen: number): string {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLen) return cleaned;
    const sliced = cleaned.slice(0, maxLen);
    const lastSpace = sliced.lastIndexOf(' ');
    const cut = lastSpace > maxLen * 0.6 ? sliced.slice(0, lastSpace) : sliced;
    return `${cut.trim()}…`;
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
}

import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { extractMediaUrl } from '../core/utils/profile-image-url';

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string[];
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
}

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blog.component.html',
  styleUrl: './blog.component.css'
})
export class BlogComponent implements OnInit {
  @Output() viewChange = new EventEmitter<string>();
  @Input() origin: string | null = null;

  selectedPost: BlogPost | null = null;
  posts: BlogPost[] = [];
  isLoading = false;
  loadError = '';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadPosts();
  }

  private loadPosts(page = 1, limit = 24): void {
    this.isLoading = true;
    this.loadError = '';

    this.apiService.listSuccessStories({ page, limit }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response?.success === false) {
          this.loadError = response?.error || response?.message || 'Failed to load blog posts.';
          this.posts = [];
          return;
        }

        const stories = this.extractStoriesList(response);
        this.posts = stories.map((item: any, index: number) => this.mapStoryToPost(item, index));
      },
      error: (error: any) => {
        this.isLoading = false;
        this.loadError = error?.error?.message || 'Failed to load blog posts.';
        this.posts = [];
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

  private mapStoryToPost(item: any, index: number): BlogPost {
    const displayName =
      item?.displayName ||
      item?.coupleName ||
      item?.names ||
      [item?.userName, item?.spouseName].filter(Boolean).join(' & ') ||
      'Success Story';

    const storyText = String(
      item?.story || item?.description || item?.narrative || item?.caption || ''
    ).trim();

    const weddingDate = String(
      item?.weddingDate || item?.wedding_date || item?.date || item?.createdAt || ''
    ).trim();

    const formattedDate = this.formatDate(weddingDate);
    const excerpt =
      storyText.slice(0, 140) ||
      'A blessed journey shared by a couple from our community.';
    const paragraphs = storyText
      ? storyText.split(/\n+/).map((p) => p.trim()).filter(Boolean)
      : [
          `${displayName} shared their sacred journey on Rukmini Swayamvar.`,
          'May their union continue to be blessed with love, faith, and family harmony.'
        ];

    const id = String(item?.id || item?._id || item?.storyId || `story-${index}`);

    return {
      id,
      title: String(displayName),
      excerpt,
      content: paragraphs,
      category: 'Stories',
      author: 'Community',
      date: formattedDate || 'Recently shared',
      readTime: this.estimateReadTime(paragraphs.join(' ')),
      image: this.resolveStoryImage(item)
    };
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

  private formatDate(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  private estimateReadTime(text: string): string {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 180));
    return `${minutes} min read`;
  }

  onCardImageError(post: BlogPost): void {
    post.image = '';
  }

  openPost(post: BlogPost): void {
    this.selectedPost = post;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closePost(): void {
    this.selectedPost = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBack(): void {
    if (this.selectedPost) {
      this.closePost();
      return;
    }
    if (this.origin === 'settings') {
      this.viewChange.emit('settings');
    } else {
      this.viewChange.emit('home');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

import { Component, Output, EventEmitter, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { extractMediaUrl } from '../core/utils/profile-image-url';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  category: string;
  categoryKey: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  featured?: boolean;
}

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blog.component.html',
  styleUrl: './blog.component.css'
})
export class BlogComponent implements OnInit, OnDestroy {
  @Output() viewChange = new EventEmitter<string>();
  @Input() origin: string | null = null;

  selectedPost: BlogPost | null = null;
  activeCategory = 'All';
  categories: string[] = ['All'];
  posts: BlogPost[] = [];
  isLoading = false;
  isDetailLoading = false;
  loadError = '';
  detailError = '';

  private loadSub: Subscription | null = null;
  private detailSub: Subscription | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadCategoriesAndPosts();
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
    this.detailSub?.unsubscribe();
  }

  get featuredPost(): BlogPost | null {
    if (this.activeCategory !== 'All') return null;
    return this.posts.find((p) => p.featured) ?? this.posts[0] ?? null;
  }

  get visiblePosts(): BlogPost[] {
    const featuredId = this.featuredPost?.id;
    if (featuredId && this.activeCategory === 'All') {
      return this.posts.filter((p) => p.id !== featuredId);
    }
    return this.posts;
  }

  setCategory(category: string): void {
    if (this.activeCategory === category) return;
    this.activeCategory = category;
    this.selectedPost = null;
    this.loadPosts();
  }

  onCardImageError(post: BlogPost): void {
    post.image = '';
  }

  openPost(post: BlogPost): void {
    this.detailError = '';
    this.isDetailLoading = true;
    this.selectedPost = { ...post };
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.detailSub?.unsubscribe();
    this.detailSub = this.apiService
      .getBlogDetail(
        post.id
          ? { blogId: post.id }
          : { slug: post.slug }
      )
      .subscribe({
        next: (response: any) => {
          this.isDetailLoading = false;
          if (response?.success === false) {
            this.detailError = response?.error || response?.message || 'Blog not found';
            return;
          }
          const raw = this.extractBlogItem(response);
          if (!raw) {
            this.detailError = 'Blog not found';
            return;
          }
          this.selectedPost = this.mapBlogToPost(raw, true);
        },
        error: (error: any) => {
          this.isDetailLoading = false;
          this.detailError =
            error?.error?.error || error?.error?.message || 'Failed to load article.';
        }
      });
  }

  closePost(): void {
    this.detailSub?.unsubscribe();
    this.selectedPost = null;
    this.detailError = '';
    this.isDetailLoading = false;
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

  formatCategoryLabel(key: string): string {
    if (!key || key === 'All') return 'All';
    return key
      .split(/[_-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private loadCategoriesAndPosts(): void {
    this.isLoading = true;
    this.loadError = '';

    this.loadSub?.unsubscribe();
    this.loadSub = forkJoin({
      categories: this.apiService.listBlogCategories().pipe(
        catchError(() => of({ success: true, categories: [] }))
      ),
      list: this.apiService.listBlogs({ page: 1, limit: 20, search: '' }).pipe(
        catchError((error) => of({ success: false, error, data: [] }))
      )
    }).subscribe({
      next: ({ categories, list }) => {
        this.categories = this.mapCategories(categories);
        this.applyListResponse(list);
      },
      error: (error: any) => {
        this.isLoading = false;
        this.loadError = error?.error?.message || 'Failed to load blogs.';
        this.posts = [];
      }
    });
  }

  private loadPosts(): void {
    this.isLoading = true;
    this.loadError = '';
    this.posts = [];

    const categoryKey =
      this.activeCategory === 'All' ? '' : this.toCategoryKey(this.activeCategory);

    this.loadSub?.unsubscribe();
    this.loadSub = this.apiService
      .listBlogs({
        page: 1,
        limit: 20,
        category: categoryKey,
        search: ''
      })
      .subscribe({
        next: (response: any) => this.applyListResponse(response),
        error: (error: any) => {
          this.isLoading = false;
          this.loadError = error?.error?.message || 'Failed to load blogs.';
          this.posts = [];
        }
      });
  }

  private applyListResponse(response: any): void {
    this.isLoading = false;
    if (response?.success === false) {
      this.loadError = response?.error || response?.message || 'Failed to load blogs.';
      this.posts = [];
      return;
    }

    const items = this.extractBlogList(response);
    this.posts = items.map((item, index) => this.mapBlogToPost(item, index === 0));
    this.loadError = '';
  }

  private mapCategories(response: any): string[] {
    const raw: unknown[] =
      (Array.isArray(response?.categories) && response.categories) ||
      (Array.isArray(response?.data?.categories) && response.data.categories) ||
      (Array.isArray(response?.data) && response.data) ||
      [];

    const labels: string[] = raw
      .map((c: unknown) => {
        if (typeof c === 'string') return this.formatCategoryLabel(c);
        if (c && typeof c === 'object') {
          const obj = c as Record<string, unknown>;
          return this.formatCategoryLabel(
            String(obj['key'] || obj['slug'] || obj['name'] || obj['category'] || '')
          );
        }
        return '';
      })
      .filter((label): label is string => !!label);

    return ['All', ...Array.from(new Set<string>(labels))];
  }

  private toCategoryKey(label: string): string {
    const known: Record<string, string> = {
      Traditions: 'traditions',
      'Marriage Tips': 'marriage_tips',
      'Relationship Advice': 'relationship_advice',
      'Community News': 'community_news',
      'Wedding Planning': 'wedding_planning',
      Inspiration: 'inspiration'
    };
    if (known[label]) return known[label];
    return label.trim().toLowerCase().replace(/\s+/g, '_');
  }

  private extractBlogList(response: any): any[] {
    if (!response || typeof response !== 'object') return [];
    const data = response.data ?? response;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.blogs)) return data.blogs;
    if (Array.isArray(data?.list)) return data.list;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(response?.blogs)) return response.blogs;
    return [];
  }

  private extractBlogItem(response: any): any | null {
    if (!response || typeof response !== 'object') return null;
    if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
      return response.data.blog || response.data.item || response.data;
    }
    if (response.blog && typeof response.blog === 'object') return response.blog;
    if (response.id || response.blogId || response.title || response.slug) return response;
    return null;
  }

  private mapBlogToPost(item: any, featured = false): BlogPost {
    const categoryKey = String(
      item?.category || item?.categoryKey || item?.category_slug || ''
    ).trim();

    const title = String(item?.title || item?.name || 'Untitled article').trim();
    const storyText = String(
      item?.content || item?.body || item?.description || item?.story || ''
    ).trim();
    const excerpt = String(
      item?.excerpt || item?.summary || item?.shortDescription || ''
    ).trim() || this.truncateAtWord(storyText, 145) || 'Read this article from Rukmini Swayamvar.';

    const paragraphs = this.toParagraphs(storyText || excerpt);
    const dateRaw = String(
      item?.publishedAt || item?.published_at || item?.createdAt || item?.date || ''
    ).trim();

    return {
      id: String(item?.id || item?.blogId || item?._id || item?.slug || title),
      slug: String(item?.slug || '').trim(),
      title,
      excerpt,
      content: paragraphs,
      category: this.formatCategoryLabel(categoryKey || 'Blog'),
      categoryKey,
      author: String(item?.author || item?.authorName || item?.writer || 'Rukmini Editorial').trim(),
      date: this.formatDate(dateRaw) || 'Recently published',
      readTime:
        String(item?.readTime || item?.readingTime || '').trim() ||
        this.estimateReadTime(paragraphs.join(' ')),
      image: this.resolveBlogImage(item),
      featured
    };
  }

  private toParagraphs(text: string): string[] {
    const parts = text
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.length ? parts : [text || 'Article content will appear here soon.'];
  }

  private resolveBlogImage(item: any): string {
    const fields = [
      'coverImage',
      'coverImageUrl',
      'cover_image',
      'image',
      'imageUrl',
      'image_url',
      'thumbnail',
      'thumbnailUrl',
      'photo',
      'banner'
    ];
    for (const field of fields) {
      const url = extractMediaUrl(item?.[field]);
      if (url) return url;
    }
    if (Array.isArray(item?.images) && item.images.length) {
      const url = extractMediaUrl(item.images[0]);
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

  private truncateAtWord(text: string, maxLen: number): string {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLen) return cleaned;
    const sliced = cleaned.slice(0, maxLen);
    const lastSpace = sliced.lastIndexOf(' ');
    const cut = lastSpace > maxLen * 0.6 ? sliced.slice(0, lastSpace) : sliced;
    return `${cut.trim()}…`;
  }
}

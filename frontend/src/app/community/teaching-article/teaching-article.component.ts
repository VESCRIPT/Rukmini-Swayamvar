import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ViewState } from '../../types';
import { ApiService } from '../../services/api.service';
import { CommunityService } from '../community.service';
import { TeachingArticle } from '../community.models';

@Component({
  selector: 'app-teaching-article',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teaching-article.component.html',
  styleUrl: './teaching-article.component.css'
})
export class TeachingArticleComponent implements OnChanges, OnDestroy {
  @Input() articleId: string | null = null;
  @Output() viewChange = new EventEmitter<ViewState>();

  article: TeachingArticle | null = null;
  paragraphs: string[] = [];
  isLoading = false;
  loadError = '';

  private loadSub: Subscription | null = null;

  constructor(
    private communityService: CommunityService,
    private apiService: ApiService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['articleId']) {
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
  }

  goBack(): void {
    this.viewChange.emit('teachings');
  }

  onCoverError(): void {
    if (this.article) {
      this.article.coverImageUrl = '';
    }
  }

  get categoryLabel(): string {
    if (!this.article) {
      return '';
    }
    if (this.article.category === 'marriage-guidelines') {
      return 'Marriage Guidelines';
    }
    if (this.article.category === 'traditions') {
      return 'Traditions';
    }
    return 'History';
  }

  private load(): void {
    this.loadSub?.unsubscribe();

    if (!this.articleId) {
      this.article = null;
      this.paragraphs = [];
      this.loadError = 'Article not found.';
      return;
    }

    const looksLikeSlug = /[a-zA-Z-]/.test(this.articleId) && Number.isNaN(Number(this.articleId));

    this.isLoading = true;
    this.loadError = '';
    this.article = null;
    this.paragraphs = [];

    this.loadSub = this.apiService
      .getTeachingDetail(
        looksLikeSlug
          ? { slug: this.articleId }
          : { articleId: this.articleId }
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response?.success === false) {
            this.loadError = response?.error || response?.message || 'Article not found.';
            return;
          }
          const raw = this.communityService.extractTeachingDetail(response);
          if (!raw || (!raw.id && !raw.title)) {
            this.loadError = 'Article not found.';
            return;
          }
          this.article = this.communityService.mapApiTeaching(raw);
          this.paragraphs = this.communityService.splitArticleBody(this.article.body);
        },
        error: (error) => {
          this.isLoading = false;
          this.loadError =
            error?.error?.error ||
            error?.error?.message ||
            error?.message ||
            'Failed to load article.';
        }
      });
  }
}

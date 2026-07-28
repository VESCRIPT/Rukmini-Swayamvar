import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ViewState } from '../../types';
import { ApiService } from '../../services/api.service';
import { CommunityService } from '../community.service';
import {
  TeachingArticle,
  TeachingCategory,
  TeachingCategoryCard,
  toApiTeachingCategory
} from '../community.models';

@Component({
  selector: 'app-teachings-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teachings-list.component.html',
  styleUrl: './teachings-list.component.css'
})
export class TeachingsListComponent implements OnInit, OnChanges, OnDestroy {
  @Input() initialCategory: TeachingCategory | null = null;
  @Output() viewChange = new EventEmitter<ViewState>();
  @Output() openArticle = new EventEmitter<string>();

  category: TeachingCategory | null = null;
  categories: TeachingCategoryCard[] = [];
  articles: TeachingArticle[] = [];
  isLoading = false;
  loadError = '';

  private loadSub: Subscription | null = null;

  constructor(
    private communityService: CommunityService,
    private apiService: ApiService
  ) {
    this.categories = this.communityService.getTeachingCategories();
  }

  ngOnInit(): void {
    this.category = this.initialCategory;
    this.refresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialCategory'] && !changes['initialCategory'].firstChange) {
      this.category = this.initialCategory;
      this.refresh();
    }
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
  }

  get pageTitle(): string {
    if (!this.category) {
      return 'Teachings';
    }
    const match = this.categories.find((c) => c.id === this.category);
    return match?.title || 'Teachings';
  }

  get pageSubtitle(): string {
    if (!this.category) {
      return 'Learn about our community';
    }
    const match = this.categories.find((c) => c.id === this.category);
    return match?.subtitle || '';
  }

  goBack(): void {
    this.viewChange.emit('community');
  }

  open(id: string): void {
    this.openArticle.emit(id);
  }

  onCoverError(article: TeachingArticle): void {
    article.coverImageUrl = '';
  }

  private refresh(): void {
    this.loadSub?.unsubscribe();
    this.isLoading = true;
    this.loadError = '';
    this.articles = [];

    const categoriesToLoad: TeachingCategory[] = this.category
      ? [this.category]
      : ['history', 'traditions', 'marriage-guidelines'];

    this.loadSub = forkJoin(
      categoriesToLoad.map((cat) =>
        this.apiService
          .listTeachings({
            page: 1,
            limit: 20,
            category: toApiTeachingCategory(cat)
          })
          .pipe(
            catchError((error) =>
              of({
                success: false,
                message: error?.error?.message || error?.message || 'Failed to load teachings.',
                __category: cat
              })
            )
          )
      )
    ).subscribe({
      next: (responses) => {
        this.isLoading = false;
        const mapped: TeachingArticle[] = [];
        let firstError = '';

        for (const response of responses) {
          if (response?.success === false) {
            if (!firstError) {
              firstError = response?.message || response?.error || 'Failed to load teachings.';
            }
            continue;
          }
          const list = this.communityService.extractTeachingsList(response);
          for (const item of list) {
            const article = this.communityService.mapApiTeaching(item);
            if (article.id) {
              mapped.push(article);
            }
          }
        }

        mapped.sort((a, b) => {
          if (a.featured !== b.featured) {
            return a.featured ? -1 : 1;
          }
          return a.sortOrder - b.sortOrder;
        });

        this.articles = mapped;
        if (!mapped.length && firstError) {
          this.loadError = firstError;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.loadError =
          error?.error?.message || error?.message || 'Failed to load teachings.';
        this.articles = [];
      }
    });
  }
}

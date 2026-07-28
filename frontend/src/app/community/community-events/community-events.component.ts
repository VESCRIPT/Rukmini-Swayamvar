import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ViewState } from '../../types';
import { ApiService } from '../../services/api.service';
import { CommunityService } from '../community.service';
import { CommunityEvent, EventCategory, EventTimeFilter, toApiEventCategory } from '../community.models';

@Component({
  selector: 'app-community-events',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './community-events.component.html',
  styleUrl: './community-events.component.css'
})
export class CommunityEventsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() initialCategory: EventCategory | null = 'marriage';
  @Output() viewChange = new EventEmitter<ViewState>();
  @Output() openEvent = new EventEmitter<string>();

  activeCategory: EventCategory = 'marriage';
  timeFilter: EventTimeFilter = 'upcoming';
  events: CommunityEvent[] = [];
  isLoading = false;
  loadError = '';

  private loadSub: Subscription | null = null;

  constructor(
    private communityService: CommunityService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    if (this.initialCategory) {
      this.activeCategory = this.initialCategory;
    }
    this.refresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialCategory'] && !changes['initialCategory'].firstChange && this.initialCategory) {
      this.activeCategory = this.initialCategory;
      this.refresh();
    }
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
  }

  setCategory(category: EventCategory): void {
    this.activeCategory = category;
    this.refresh();
  }

  setTimeFilter(filter: EventTimeFilter): void {
    this.timeFilter = filter;
    this.refresh();
  }

  goBack(): void {
    this.viewChange.emit('community');
  }

  openDetail(id: string): void {
    this.openEvent.emit(id);
  }

  formatDate(value: string): string {
    return this.communityService.formatShortDate(value);
  }

  onCoverError(event: CommunityEvent): void {
    event.coverImageUrl = '';
  }

  private refresh(): void {
    this.loadSub?.unsubscribe();
    this.isLoading = true;
    this.loadError = '';
    this.events = [];

    this.loadSub = this.apiService
      .listCommunityEvents({
        page: 1,
        limit: 20,
        category: toApiEventCategory(this.activeCategory),
        upcomingOnly: this.timeFilter === 'upcoming'
      })
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response?.success === false) {
            this.loadError = response?.message || response?.error || 'Failed to load events.';
            this.events = [];
            return;
          }
          const list = this.communityService.extractEventsList(response);
          this.events = list.map((item) => this.communityService.mapApiEvent(item)).filter((e) => !!e.id);
        },
        error: (error) => {
          this.isLoading = false;
          this.loadError =
            error?.error?.message || error?.message || 'Failed to load community events.';
          this.events = [];
        }
      });
  }
}

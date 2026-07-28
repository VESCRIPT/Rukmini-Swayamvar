import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ViewState } from '../../types';
import { ApiService } from '../../services/api.service';
import { CommunityService } from '../community.service';
import { CommunityEvent, RsvpStatus, normalizeRsvpStatus } from '../community.models';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-detail.component.html',
  styleUrl: './event-detail.component.css'
})
export class EventDetailComponent implements OnChanges, OnDestroy {
  @Input() eventId: string | null = null;
  @Output() viewChange = new EventEmitter<ViewState>();

  event: CommunityEvent | null = null;
  rsvp: RsvpStatus = 'none';
  isLoading = false;
  loadError = '';
  isSavingRsvp = false;
  rsvpMessage = '';
  rsvpError = '';

  private loadSub: Subscription | null = null;
  private rsvpSub: Subscription | null = null;

  constructor(
    private communityService: CommunityService,
    private apiService: ApiService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId']) {
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
    this.rsvpSub?.unsubscribe();
  }

  goBack(): void {
    this.viewChange.emit('community-events');
  }

  setRsvp(status: RsvpStatus): void {
    if (!this.event || status === 'none' || this.isSavingRsvp) {
      return;
    }
    this.submitRsvp(status);
  }

  cancelRsvp(): void {
    if (!this.event || this.isSavingRsvp) {
      return;
    }
    this.submitRsvp('none');
  }

  formatDate(value: string): string {
    return this.communityService.formatEventDate(value);
  }

  onCoverError(): void {
    if (this.event) {
      this.event.coverImageUrl = '';
    }
  }

  get responseLabel(): string {
    if (this.rsvp === 'going') {
      return 'Your response: Going';
    }
    if (this.rsvp === 'interested') {
      return 'Your response: Interested';
    }
    return 'Your response: Not set';
  }

  private load(): void {
    this.loadSub?.unsubscribe();
    this.rsvpMessage = '';
    this.rsvpError = '';

    if (!this.eventId) {
      this.event = null;
      this.rsvp = 'none';
      this.loadError = 'Event not found.';
      return;
    }

    const userId = this.apiService.getAccountUserId();
    if (!userId) {
      this.event = null;
      this.loadError = 'Please log in to view this event.';
      return;
    }

    this.isLoading = true;
    this.loadError = '';
    this.event = null;

    this.loadSub = this.apiService
      .getCommunityEventDetail({
        eventId: this.eventId,
        userId
      })
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response?.success === false) {
            this.loadError = response?.message || response?.error || 'Failed to load event.';
            return;
          }
          const raw = this.communityService.extractEventDetail(response);
          if (!raw) {
            this.loadError = 'Event not found.';
            return;
          }
          this.event = this.communityService.mapApiEvent(raw);
          this.rsvp = normalizeRsvpStatus(raw?.myRsvpStatus ?? this.event.myRsvpStatus);
        },
        error: (error) => {
          this.isLoading = false;
          this.loadError =
            error?.error?.message || error?.message || 'Failed to load event details.';
        }
      });
  }

  private submitRsvp(status: RsvpStatus): void {
    if (!this.event) {
      return;
    }

    const userId = this.apiService.getAccountUserId();
    if (!userId) {
      this.rsvpError = 'Please log in to RSVP.';
      return;
    }

    this.rsvpSub?.unsubscribe();
    this.isSavingRsvp = true;
    this.rsvpError = '';
    this.rsvpMessage = '';

    this.rsvpSub = this.apiService
      .rsvpCommunityEvent({
        eventId: this.event.id,
        userId,
        status
      })
      .subscribe({
        next: (response) => {
          this.isSavingRsvp = false;
          if (response?.success === false) {
            this.rsvpError = response?.message || response?.error || 'Failed to update RSVP.';
            return;
          }
          this.rsvp = normalizeRsvpStatus(response?.myRsvpStatus ?? status);
          this.rsvpMessage =
            response?.message ||
            (this.rsvp === 'going'
              ? 'You are going to this event'
              : this.rsvp === 'interested'
                ? 'Marked as interested'
                : 'RSVP cancelled');
          // Refresh counts / status from detail for accuracy
          this.reloadCountsQuietly(userId);
        },
        error: (error) => {
          this.isSavingRsvp = false;
          this.rsvpError =
            error?.error?.message || error?.message || 'Failed to update RSVP.';
        }
      });
  }

  private reloadCountsQuietly(userId: string): void {
    if (!this.eventId) {
      return;
    }
    this.apiService
      .getCommunityEventDetail({
        eventId: this.eventId,
        userId
      })
      .subscribe({
        next: (response) => {
          const raw = this.communityService.extractEventDetail(response);
          if (!raw) return;
          const mapped = this.communityService.mapApiEvent(raw);
          this.event = mapped;
          this.rsvp = normalizeRsvpStatus(raw?.myRsvpStatus ?? mapped.myRsvpStatus);
        },
        error: () => {}
      });
  }
}

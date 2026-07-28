import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewState } from '../../types';
import { CommunityService } from '../community.service';
import { EventCategory, TeachingCategory, TeachingCategoryCard } from '../community.models';
import { backToDashboardView } from '../../core/constants/dashboard-sidebar-views';

@Component({
  selector: 'app-community-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './community-home.component.html',
  styleUrl: './community-home.component.css'
})
export class CommunityHomeComponent {
  @Input() username = 'Member';
  @Input() previousView: ViewState = 'dashboard';
  @Output() viewChange = new EventEmitter<ViewState>();
  @Output() openEvents = new EventEmitter<EventCategory | null>();
  @Output() openTeachings = new EventEmitter<TeachingCategory | null>();

  teachingCards: TeachingCategoryCard[] = [];

  constructor(private communityService: CommunityService) {
    this.teachingCards = this.communityService.getTeachingCategories();
  }

  goBack(): void {
    this.viewChange.emit(backToDashboardView());
  }

  seeAllEvents(): void {
    this.openEvents.emit(null);
  }

  openEventCategory(category: EventCategory): void {
    this.openEvents.emit(category);
  }

  seeAllTeachings(): void {
    this.openTeachings.emit(null);
  }

  openTeachingCategory(category: TeachingCategory): void {
    this.openTeachings.emit(category);
  }

  openSuccessStories(): void {
    this.viewChange.emit('success-stories');
  }
}

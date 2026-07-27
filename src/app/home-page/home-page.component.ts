import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewState } from '../types';
import { HeroComponent } from '../hero/hero.component';
import { StatsComponent } from '../stats/stats.component';
import { HowSectionComponent } from '../how-section/how-section.component';
import { SearchComponent } from '../search/search.component';
import { PromisesComponent } from '../promises/promises.component';
import { HowWorksComponent } from '../how-works/how-works.component';
import { StoriesComponent } from '../stories/stories.component';
import { DivineMatchComponent } from '../divine-match/divine-match.component';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    HeroComponent,
    StatsComponent,
    HowSectionComponent,
    SearchComponent,
    PromisesComponent,
    HowWorksComponent,
    StoriesComponent,
    DivineMatchComponent
  ],
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePageComponent implements OnInit {
  @Input({ required: true }) t!: any;
  @Output() viewChange = new EventEmitter<ViewState>();

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    // Start API fetch immediately with home render (before stories section paints).
    this.apiService.prefetchSuccessStories();
  }

  setView(view: ViewState): void {
    this.viewChange.emit(view);
  }
}

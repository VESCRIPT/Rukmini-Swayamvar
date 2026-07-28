import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewState } from '../types';

@Component({
  selector: 'app-premium',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './premium.component.html',
  styleUrls: ['./premium.component.css']
})
export class PremiumComponent {
  @Input() t: any;
  @Output() viewChange = new EventEmitter<ViewState>();

  sidebarOpen = false;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  onBack() {
    this.viewChange.emit('dashboard');
  }

  setView(view: ViewState) {
    this.viewChange.emit(view);
  }
}

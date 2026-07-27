import { Component, ChangeDetectionStrategy, signal, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewState, Language } from '../types'

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  /** Generated from `src/assets/logo_navbar.png` (transparent) → `public/navbar-logo.png` */
  readonly brandLogoSrc = '/navbar-logo.png';

  // Input from parent to get current translations and view state
  @Input() t!: any;
  @Input() currentLang!: Language;
  @Input() currentView!: ViewState;

  // Outputs to tell parent to change language or view
  @Output() langChange = new EventEmitter<Language>();
  @Output() viewChange = new EventEmitter<ViewState>();

  isScrolled = signal(false);

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled.set(window.scrollY > 50);
  }

  setLanguage(lang: Language) {
    this.langChange.emit(lang);
  }

  setView(view: ViewState) {
    this.viewChange.emit(view);
  }
}
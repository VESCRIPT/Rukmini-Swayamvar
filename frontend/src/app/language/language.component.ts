import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewState } from '../types';

interface Language {
  code: 'en' | 'hi' | 'mr';
  name: string;
  nativeName: string;
}

@Component({
  selector: 'app-language',
  imports: [CommonModule, FormsModule],
  templateUrl: './language.component.html',
  styleUrl: './language.component.css'
})
export class LanguageComponent {
  @Input() currentLang: 'en' | 'hi' | 'mr' = 'en';
  @Output() viewChange = new EventEmitter<ViewState>();
  @Output() langChange = new EventEmitter<'en' | 'hi' | 'mr'>();

  searchQuery: string = '';
  selectedLanguage: 'en' | 'hi' | 'mr' = 'en';

  languages: Language[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' }
  ];

  ngOnInit() {
    this.selectedLanguage = this.currentLang;
  }

  get filteredLanguages(): Language[] {
    if (!this.searchQuery.trim()) {
      return this.languages;
    }
    const query = this.searchQuery.toLowerCase();
    return this.languages.filter(lang =>
      lang.name.toLowerCase().includes(query) ||
      lang.nativeName.toLowerCase().includes(query)
    );
  }

  selectLanguage(code: 'en' | 'hi' | 'mr'): void {
    this.selectedLanguage = code;
  }

  updateLanguage(): void {
    console.log('Language updated to:', this.selectedLanguage);
    this.langChange.emit(this.selectedLanguage);
    this.goBack();
  }

  goBack(): void {
    this.viewChange.emit('settings');
  }
}

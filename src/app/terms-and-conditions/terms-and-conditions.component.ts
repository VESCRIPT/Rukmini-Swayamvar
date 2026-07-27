import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-terms-and-conditions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terms-and-conditions.component.html',
  styleUrls: ['./terms-and-conditions.component.css']
})
export class TermsAndConditionsComponent {
  @Input() origin: string | null = null;
  @Output() viewChange = new EventEmitter<string>();

  goBack() {
    // If opened from an internal page (settings etc.), go back there; otherwise return home.
    if (this.origin === 'settings') {
      this.viewChange.emit('settings');
    } else {
      this.viewChange.emit('home');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}


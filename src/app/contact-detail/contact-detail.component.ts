import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-contact-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact-detail.component.html',
  styleUrls: ['./contact-detail.component.css']
})
export class ContactDetailComponent {
  @Input() origin: string | null = null;
  @Output() viewChange = new EventEmitter<string>();

  goBack() {
    // Most pages send back to the previous view; fallback to home.
    if (this.origin === 'settings') {
      this.viewChange.emit('settings');
    } else {
      this.viewChange.emit('home');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goHelpCenter() {
    this.viewChange.emit('help-center');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}


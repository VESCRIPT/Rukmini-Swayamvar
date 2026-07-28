import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about-us.component.html',
  styleUrl: './about-us.component.css'
})
export class AboutUsComponent {
  @Output() viewChange = new EventEmitter<string>();
  @Input() origin: string | null = null;

  goBack() {
    if (this.origin === 'settings') {
      this.viewChange.emit('settings');
    } else {
      this.viewChange.emit('home');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

import { Component, Output, EventEmitter, Input } from '@angular/core';

@Component({
  selector: 'app-privacy-policy',
  imports: [],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.css'
})
export class PrivacyPolicyComponent {
  @Output() viewChange = new EventEmitter<string>();
  @Input() origin: string | null = null;

  navigate(view: string) {
    this.viewChange.emit(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBack() {
    this.navigate(this.origin || 'home');
  }
}

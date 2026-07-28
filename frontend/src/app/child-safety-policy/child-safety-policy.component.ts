import { Component, Output, EventEmitter, Input } from '@angular/core';

@Component({
  selector: 'app-child-safety-policy',
  standalone: true,
  imports: [],
  templateUrl: './child-safety-policy.component.html',
  styleUrl: './child-safety-policy.component.css'
})
export class ChildSafetyPolicyComponent {
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

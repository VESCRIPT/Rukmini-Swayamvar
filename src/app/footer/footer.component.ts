import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  @Input() t: any;
  @Output() viewChange = new EventEmitter<string>();

  navigate(view: string, event: Event) {
    event.preventDefault();
    this.viewChange.emit(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

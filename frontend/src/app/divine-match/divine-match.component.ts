import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-divine-match',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './divine-match.component.html',
  styleUrl: './divine-match.component.css'
})
export class DivineMatchComponent {
  @Input() t: any;
}

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SplashComponent {
  backgroundImageUrl = 'https://i.pinimg.com/1200x/b3/84/44/b3844461c499f0959464c1870586b776.jpg';
}

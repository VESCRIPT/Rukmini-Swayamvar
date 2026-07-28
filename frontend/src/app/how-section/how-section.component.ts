import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StaticProfileComponent } from '../static-profile/static-profile.component';

@Component({
  selector: 'app-how-section',
  standalone: true,
  imports: [CommonModule, StaticProfileComponent],
  templateUrl: './how-section.component.html',
  styleUrls: ['./how-section.component.css']
})
export class HowSectionComponent {}

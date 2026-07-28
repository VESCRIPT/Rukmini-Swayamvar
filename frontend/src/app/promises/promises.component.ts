import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-promises',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './promises.component.html',
    styleUrls: ['./promises.component.css']
})
export class PromisesComponent {
    promises = [
        'Our Rukmini Swayamvar site allows thousands of verified profiles',
        'Find a perfect life partner from one of the leading Rukmini Swayamvar Sites',
        'Rukmini Swayamvar site that is dedicated to matchmaking',
        'Rukmini Swayamvar site with a blend of Tradition and Technology',
        'Rukmini Swayamvar site with filters to find your perfect match',
        'Rukmini Swayamvar Website with 100% Data Security and Privacy',
        'Help Center and Online Support'
    ];
}

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewState } from '../types';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit {
  @Input() t!: any;
  @Output() viewChange = new EventEmitter<ViewState>();

  username: string = 'User';

  constructor(private apiService: ApiService) { }

  ngOnInit() {
    const user = this.apiService.getUser();
    if (user) {
      const firstName = user.firstName || (user.name && (user.name + '').trim().split(/\s+/)[0]);
      if (firstName && firstName.trim()) {
        this.username = firstName.trim();
      }
      const userId = user.id || user.userId;
      if (userId) {
        this.apiService.getMyProfileDetails(String(userId)).subscribe({
          next: (res: any) => {
            const data = res?.data?.profile ?? res?.data?.user ?? res?.profile ?? res?.user ?? res?.data ?? null;
            if (data && typeof data === 'object') {
              const name = data.firstName ?? data.first_name ?? data.name ?? data.full_name ?? data.fullName;
              const first = name ? (String(name).trim().split(/\s+/)[0] || '').trim() : '';
              if (first) {
                this.username = first.charAt(0).toUpperCase() + first.slice(1);
                this.apiService.setUser({ ...user, firstName: first, name: data.name ?? data.full_name ?? data.fullName ?? user.name });
              }
            }
          },
          error: () => {}
        });
      }
    }
  }

  goBack() {
    this.viewChange.emit('login');
  }

  continue() {
    this.apiService.clearSignupSessionCredentials();
    this.viewChange.emit('dashboard');
  }
}

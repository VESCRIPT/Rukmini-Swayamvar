import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewState } from '../types';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordComponent {
  @Input() t!: any;
  @Output() viewChange = new EventEmitter<ViewState>();

  email = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

  onSendOtp() {
    if (!this.email) {
      this.errorMessage = 'Please enter your email address';
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.apiService.forgotPassword({ email: this.email }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success !== false) {
          this.successMessage = response.message || 'Password reset OTP sent to your email';
          // Store email for verify-otp step
          localStorage.setItem('signup_email', this.email);
          sessionStorage.setItem('signup_email', this.email);
          sessionStorage.setItem('otp_previous_view', 'forgot-password');
          
          setTimeout(() => {
            this.viewChange.emit('email-otp');
          }, 1500);
        } else {
          this.errorMessage = response.message || 'Failed to send password reset OTP';
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Failed to send password reset OTP. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }

  onBack() {
    this.viewChange.emit('login');
  }
}

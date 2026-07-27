import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewState } from '../types';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignupComponent {
  @Input() t!: any;
  @Output() viewChange = new EventEmitter<ViewState>();

  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  onRegister() {
    if (!this.email) {
      this.errorMessage = 'Please enter your email';
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    // First send OTP to email
    this.apiService.sendOtp({ email: this.email }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          // Store email temporarily for after OTP verification
          sessionStorage.setItem('signup_email', this.email);
          localStorage.setItem('signup_email', this.email);
          sessionStorage.setItem('otp_previous_view', 'register');
          // Navigate to OTP verification
          this.viewChange.emit('email-otp');
        } else {
          this.errorMessage = response.message || 'Failed to send OTP';
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoading = false;
        // Detailed error logging
        console.error('Send OTP error:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.message,
          error: error.error,
          url: error.url
        });
        // User-friendly error messages based on error type
        if (error.status === 0) {
          this.errorMessage = 'Cannot connect to server. Please ensure backend is running.';
        } else if (error.status === 404) {
          this.errorMessage = 'API endpoint not found. Please check backend configuration.';
        } else if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Invalid request. Please check your input.';
        } else if (error.status === 500) {
          this.errorMessage = 'Server error. Please contact support.';
        } else {
          this.errorMessage = error.error?.message || `Failed to send OTP (Error ${error.status}). Please try again.`;
        }
        this.cdr.markForCheck();
      }
    });
  }

  onBack() {
    this.viewChange.emit('home');
  }
}
import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewState } from '../types';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './set-password.component.html',
  styleUrls: ['./set-password.component.css']
})
export class SetPasswordComponent {
  @Input() t!: any;
  @Input() previousView!: string;
  @Output() viewChange = new EventEmitter<ViewState>();

  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  isSubmitting = false;
  errorMessage = '';
  showSuccessPopup = false;
  successMessage = '';
  nextViewAfterSuccess: ViewState = 'login';

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit() {
    if (!this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in both password fields';
      this.cdr.markForCheck();
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match!';
      this.cdr.markForCheck();
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters';
      this.cdr.markForCheck();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    // Get signup data from sessionStorage
    const email = (sessionStorage.getItem('signup_email') || localStorage.getItem('signup_email') || '').trim();

    if (!email) {
      this.errorMessage = 'Email not found. Please start registration again.';
      this.isSubmitting = false;
      this.cdr.markForCheck();
      return;
    }

    if (this.getFlowOrigin() === 'forgot-password') {
      const otp = (sessionStorage.getItem('reset_otp') || '').trim();
      if (!otp) {
        this.errorMessage = 'OTP not found. Please verify OTP again.';
        this.isSubmitting = false;
        this.cdr.markForCheck();
        return;
      }

      this.apiService.resetPassword({
        email,
        otp,
        newPassword: this.password
      }).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          const isSuccess = response.success !== false;
          if (isSuccess) {
            this.completeRegistrationFlow();
          } else {
            this.errorMessage = response.message || 'Reset password failed';
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          this.errorMessage = error.error?.message || 'Reset password failed. Please try again.';
          console.error('Reset password error:', error);
          this.cdr.markForCheck();
        }
      });
      return;
    }

    // Set password after OTP verification (signup flow)
    this.apiService.setPassword({
      email: email,
      password: this.password,
      confirmPassword: this.confirmPassword
    }).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        const isSuccess = response.success === true || response.status === 'success';
        if (isSuccess) {
          const hasAuthContext = !!(
            response.token ||
            response.user ||
            response.data?.user ||
            response.data?.userId ||
            response.data?.id
          );

          // If backend returns auth/user info from set-password, continue directly.
          // Otherwise, complete registration using the register endpoint.
          if (hasAuthContext) {
            this.completeRegistrationFlow();
          } else {
            this.apiService.register({
              email,
              password: this.password
            }).subscribe({
              next: (registerResponse) => {
                const registerSuccess = registerResponse.success === true || registerResponse.status === 'success';
                if (registerSuccess) {
                  this.completeRegistrationFlow();
                } else {
                  this.errorMessage = registerResponse.message || 'Registration failed after setting password.';
                  this.cdr.markForCheck();
                }
              },
              error: (registerError) => {
                this.errorMessage = registerError.error?.message || 'Registration failed after setting password.';
                console.error('Register fallback error:', registerError);
                this.cdr.markForCheck();
              }
            });
          }
        } else {
          this.errorMessage = response.message || 'Registration failed';
          this.cdr.markForCheck();
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.message || 'Set password failed. Please try again.';
        console.error('Set password error:', error);
        this.cdr.markForCheck();
      }
    });
  }

  private completeRegistrationFlow() {
    const flowOrigin = this.getFlowOrigin();

    sessionStorage.removeItem('reset_otp');
    sessionStorage.removeItem('otp_previous_view');

    if (flowOrigin === 'forgot-password') {
      sessionStorage.removeItem('signup_password');
      sessionStorage.removeItem('onboarding_after_signup');
      this.nextViewAfterSuccess = 'login';
      this.successMessage = 'Password reset successful. Please login with your new password.';
      this.showSuccessPopup = true;
      this.cdr.markForCheck();
      return;
    }

    sessionStorage.setItem('signup_password', this.password);
    sessionStorage.setItem('onboarding_after_signup', '1');

    this.nextViewAfterSuccess = 'profile-form';
    this.successMessage = 'Password set successfully. Continue to create your profile.';

    this.apiService.ensureSessionAuth().subscribe({
      next: () => {
        this.showSuccessPopup = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.showSuccessPopup = true;
        this.cdr.markForCheck();
      }
    });
  }

  closeSuccessPopup() {
    this.showSuccessPopup = false;
    this.viewChange.emit(this.nextViewAfterSuccess);
    this.cdr.markForCheck();
  }

  private getFlowOrigin(): string {
    return (sessionStorage.getItem('otp_previous_view') || this.previousView || '').trim();
  }

  onBack() {
    this.viewChange.emit('email-otp');
  }
}

import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, ViewChild, ViewChildren, QueryList, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewState } from '../types';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-email-otp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './email-otp.component.html',
  styleUrls: ['./email-otp.component.css'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class EmailOtpComponent {
  @Input() t!: any;
  @Input() previousView!: string;
  @Output() viewChange = new EventEmitter<ViewState>();
  @ViewChild('hiddenInput') hiddenInput!: ElementRef;

  otp = ['', '', '', '', '', ''];
  otpString = '';
  isVerifying = false;
  errorMessage = '';

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  onHiddenInput(event: Event) {
    const input = event.target as HTMLInputElement;
    // Remove non-alphanumeric characters
    let value = input.value.replace(/[^a-zA-Z0-9]/g, '');
    
    // Enforce max length 6
    if (value.length > 6) {
      value = value.slice(0, 6);
    }
    
    this.otpString = value;
    // Update the original otp array for compatibility with the rest of the component
    const chars = value.split('');
    this.otp = Array.from({ length: 6 }, (_, i) => chars[i] || '');
    
    // Force caret to the end of the input string to prevent editing middle characters
    setTimeout(() => {
      input.setSelectionRange(value.length, value.length);
    }, 0);
    
    this.cdr.markForCheck();
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') || '').replace(/\s+/g, '').slice(0, 6);
    if (!/^[a-zA-Z0-9]{1,6}$/.test(pasted)) {
      return;
    }
    this.otpString = pasted;
    const chars = pasted.split('');
    this.otp = Array.from({ length: 6 }, (_, i) => chars[i] || '');
    this.cdr.markForCheck();
  }

  verifyOtp() {
    const otpString = this.otp.join('').trim();
    if (otpString.length === 6) {
      this.isVerifying = true;
      this.errorMessage = '';
      
      // Get email from sessionStorage (stored during signup)
      const email = (sessionStorage.getItem('signup_email') || localStorage.getItem('signup_email') || '').trim();
      
      if (!email) {
        this.errorMessage = 'Email not found. Please try again.';
        this.isVerifying = false;
        this.cdr.markForCheck();
        return;
      }

      // Forgot-password flow: do not verify via /auth/verify-otp
      // Reset API expects the OTP directly and may treat pre-verified OTP as invalid/used.
      if (this.getOtpPreviousView() === 'forgot-password') {
        this.isVerifying = false;
        sessionStorage.setItem('reset_otp', otpString);
        this.viewChange.emit('set-password');
        this.cdr.markForCheck();
        return;
      }

      // Call API to verify OTP
      this.apiService.verifyOtp({ 
        email: email, 
        otp: otpString 
      }).subscribe({
        next: (response) => {
          this.isVerifying = false;
          const isExplicitFailure = response.success === false ||
            response.data?.verified === false ||
            response.data?.status === 'failed' ||
            response.status === 'failed';
          if (!isExplicitFailure) {
            // OTP verified successfully
            if (this.getOtpPreviousView() === 'forgot-password') {
              sessionStorage.setItem('reset_otp', otpString);
              this.viewChange.emit('set-password');
            } else {
              sessionStorage.setItem('onboarding_after_signup', '1');
              this.viewChange.emit('profile-form');
            }
          } else {
            this.errorMessage = response.message || 'Invalid OTP';
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isVerifying = false;
          this.errorMessage = error.error?.message || 'OTP verification failed. Please try again.';
          console.error('OTP verification error:', error);
          this.cdr.markForCheck();
        }
      });
    }
  }

  resendOtp() {
    this.otp = ['', '', '', '', '', ''];
    this.otpString = '';
    this.errorMessage = '';
    
    // Get email from sessionStorage
    const email = (sessionStorage.getItem('signup_email') || localStorage.getItem('signup_email') || '').trim();
    
    if (!email) {
      this.errorMessage = 'Email not found. Please try again.';
      this.cdr.markForCheck();
      return;
    }

    // Forgot-password flow should resend using /auth/forgot-password only.
    if (this.getOtpPreviousView() === 'forgot-password') {
      this.apiService.forgotPassword({ email }).subscribe({
        next: (response) => {
          if (response.success === false) {
            this.errorMessage = response.message || 'Failed to resend OTP';
          } else {
            if (this.hiddenInput) {
              this.hiddenInput.nativeElement.value = '';
              setTimeout(() => this.hiddenInput.nativeElement.focus(), 0);
            }
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Failed to resend OTP';
          console.error('Forgot password resend OTP error:', error);
          this.cdr.markForCheck();
        }
      });
      return;
    }

    // Call API to resend OTP
    this.apiService.resendOtp({ email }).subscribe({
      next: (response) => {
        if (response.success) {
          // Clear input and focus
          if (this.hiddenInput) {
            this.hiddenInput.nativeElement.value = '';
            setTimeout(() => this.hiddenInput.nativeElement.focus(), 0);
          }
        } else {
          this.errorMessage = response.message || 'Failed to resend OTP';
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        // Fallback for backends that use /auth/send-otp for resend as well.
        if (error?.status === 404 || error?.status === 405) {
          this.apiService.sendOtp({ email }).subscribe({
            next: (response) => {
              if (response.success) {
                if (this.hiddenInput) {
                  this.hiddenInput.nativeElement.value = '';
                  setTimeout(() => this.hiddenInput.nativeElement.focus(), 0);
                }
              } else {
                this.errorMessage = response.message || 'Failed to resend OTP';
              }
              this.cdr.markForCheck();
            },
            error: (fallbackError) => {
              this.errorMessage = fallbackError.error?.message || 'Failed to resend OTP';
              console.error('Resend OTP fallback error:', fallbackError);
              this.cdr.markForCheck();
            }
          });
          return;
        }

        this.errorMessage = error.error?.message || 'Failed to resend OTP';
        console.error('Resend OTP error:', error);
        this.cdr.markForCheck();
      }
    });
  }

  onBack() {
    const otpPreviousView = this.getOtpPreviousView();
    if (otpPreviousView === 'forgot-password') {
      this.viewChange.emit('forgot-password');
      return;
    }
    if (otpPreviousView === 'register') {
      this.viewChange.emit('register');
      return;
    }
    this.viewChange.emit((this.previousView || 'home') as any);
  }

  private getOtpPreviousView(): string {
    return (sessionStorage.getItem('otp_previous_view') || this.previousView || '').trim();
  }
}
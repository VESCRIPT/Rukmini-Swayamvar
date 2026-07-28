import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewState } from '../types';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserProfileComponent implements OnInit {
  @Input() t!: any;
  @Output() viewChange = new EventEmitter<ViewState>();

  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  showPassword = false;


  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const signupEmail = (
      sessionStorage.getItem('signup_email') ||
      localStorage.getItem('signup_email') ||
      ''
    ).trim();
    if (signupEmail) {
      this.email = signupEmail;
    }
  }

  onLogin() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter email and password';
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.apiService.login({
      email: this.email,
      password: this.password
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        const token = this.apiService.getToken() || this.apiService.extractToken(response);
        const isSuccess = response.success !== false && !!token;
        if (isSuccess) {
          sessionStorage.removeItem('pending_login_after_signup');
          this.apiService.clearSignupSessionCredentials();
          if (this.isAdminLogin(response)) {
            const adminUser = this.getLoginUser(response);
            localStorage.setItem('admin_auth', 'true');
            localStorage.setItem('admin_token', token);
            localStorage.setItem('admin_role', this.getAdminRole(adminUser));
            if (adminUser) {
              localStorage.setItem('admin_user', JSON.stringify(adminUser));
            }
            window.location.href = `${window.location.origin}/admin/`;
            return;
          }
          this.viewChange.emit('welcome');
        } else {
          this.errorMessage =
            response.message ||
            (response as { data?: { message?: string } }).data?.message ||
            'Login failed. Please check your email and password.';
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoading = false;
        const status = error?.status;
        const apiMsg =
          error?.error?.message ||
          (typeof error?.error === 'string' ? error.error : null);
        if (status === 404) {
          this.errorMessage =
            apiMsg || 'Login service not found. Please use the latest build of this app.';
        } else if (status === 401 || status === 403) {
          this.errorMessage = apiMsg || 'Invalid email or password.';
        } else if (status === 0) {
          this.errorMessage =
            'Cannot reach the API from this website (browser blocked the request). The API server must allow your site origin in CORS.';
        } else {
          this.errorMessage = apiMsg || 'Login failed. Please try again.';
        }
        console.error('Login error:', error);
        this.cdr.markForCheck();
      }
    });
  }

  onBack() {
    this.viewChange.emit('home');
  }

  onGoToRegister() {
    this.viewChange.emit('register');
  }

  onForgotPassword() {
    this.viewChange.emit('forgot-password');
  }

  private isAdminLogin(response: any): boolean {
    const data = response?.data;
    const user = this.getLoginUser(response);
    const roleValues = [
      response?.role,
      response?.userType,
      response?.user_type,
      data?.role,
      data?.userType,
      data?.user_type,
      user?.role,
      user?.userType,
      user?.user_type,
      user?.type,
      ...(Array.isArray(user?.roles) ? user.roles : [])
    ];

    return roleValues.some(role => {
      const normalizedRole = String(role || '').trim().toLowerCase();
      return ['admin', 'administrator', 'super_admin', 'superadmin'].includes(normalizedRole);
    });
  }

  private getLoginUser(response: any): any {
    const data = response?.data;
    return response?.user || data?.user || data;
  }

  private getAdminRole(user: any): string {
    const normalizedRole = String(user?.user_type || user?.userType || user?.role || '').trim().toLowerCase();
    return normalizedRole === 'super_admin' || normalizedRole === 'superadmin' ? 'super-admin' : 'admin';
  }
}
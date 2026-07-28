import { HttpInterceptorFn } from '@angular/common/http';

/** Auth endpoints that must not send a stored Bearer token (e.g. login). */
const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/send-otp',
  '/auth/resend-otp',
  '/auth/verify-otp',
  '/auth/set-password',
  '/auth/create-profile',
  '/auth/forgot-password',
  '/auth/reset-password'
];

function isPublicAuthRequest(url: string): boolean {
  const path = url.split('?')[0].toLowerCase();
  return PUBLIC_AUTH_PATHS.some((segment) => path.includes(segment));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (isPublicAuthRequest(req.url)) {
    return next(req);
  }

  const token = localStorage.getItem('auth_token');
  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
  );
};

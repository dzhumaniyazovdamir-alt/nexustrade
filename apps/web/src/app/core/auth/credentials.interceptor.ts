import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  type HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import type { AuthResponse } from '@nexustrade/contracts';
import { catchError, finalize, Observable, shareReplay, switchMap, throwError } from 'rxjs';

let refreshInFlight: Observable<AuthResponse> | null = null;

const authEndpoints = [
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
  '/api/v1/auth/refresh',
  '/api/v1/auth/register',
  '/api/v1/auth/session',
];

export const credentialsInterceptor: HttpInterceptorFn = (request, next) => {
  const backend = inject(HttpBackend);
  const authenticatedRequest = request.clone({ withCredentials: true });

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        authEndpoints.some((endpoint) => request.url.endsWith(endpoint))
      ) {
        return throwError(() => error);
      }

      refreshInFlight ??= new HttpClient(backend)
        .post<AuthResponse>('/api/v1/auth/refresh', {}, { withCredentials: true })
        .pipe(
          finalize(() => {
            refreshInFlight = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );

      return refreshInFlight.pipe(switchMap(() => next(authenticatedRequest)));
    }),
  );
};

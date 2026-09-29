import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  SessionResponse,
} from '@nexustrade/contracts';
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  session(): Observable<SessionResponse> {
    return this.http.get<SessionResponse>('/api/v1/auth/session');
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/v1/auth/register', request);
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/v1/auth/login', request);
  }

  refresh(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/v1/auth/refresh', {});
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/v1/auth/logout', {});
  }
}

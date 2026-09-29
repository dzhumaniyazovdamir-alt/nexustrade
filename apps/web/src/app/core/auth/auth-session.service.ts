import { computed, inject, Injectable, signal } from '@angular/core';
import type { LoginRequest, RegisterRequest, SessionDto } from '@nexustrade/contracts';
import { catchError, firstValueFrom, of, tap } from 'rxjs';
import { AuthApiService } from './auth-api.service';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly api = inject(AuthApiService);
  private readonly sessionState = signal<SessionDto | null>(null);
  private initialized = false;

  readonly session = this.sessionState.asReadonly();
  readonly user = computed(() => this.sessionState()?.user ?? null);
  readonly isAuthenticated = computed(() => this.sessionState() !== null);

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const probe = await firstValueFrom(
      this.api.session().pipe(catchError(() => of({ session: null }))),
    );
    if (probe.session) {
      this.sessionState.set(probe.session);
    } else {
      const refreshed = await firstValueFrom(this.api.refresh().pipe(catchError(() => of(null))));
      this.sessionState.set(refreshed?.session ?? null);
    }
    this.initialized = true;
  }

  async login(request: LoginRequest): Promise<void> {
    const response = await firstValueFrom(this.api.login(request));
    this.sessionState.set(response.session);
    this.initialized = true;
  }

  async register(request: RegisterRequest): Promise<void> {
    const response = await firstValueFrom(this.api.register(request));
    this.sessionState.set(response.session);
    this.initialized = true;
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.api.logout().pipe(catchError(() => of(undefined))));
    this.sessionState.set(null);
  }

  refreshSession() {
    return this.api.session().pipe(tap((response) => this.sessionState.set(response.session)));
  }
}

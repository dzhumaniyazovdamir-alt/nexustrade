import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { AuthSessionService } from './auth-session.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  await session.initialize();
  return session.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const guestGuard: CanActivateFn = async () => {
  const session = inject(AuthSessionService);
  const router = inject(Router);
  await session.initialize();
  return session.isAuthenticated() ? router.createUrlTree(['/']) : true;
};

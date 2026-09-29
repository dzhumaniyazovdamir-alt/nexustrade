import { Route } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((module) => module.LoginComponent),
    title: 'Вход | NexusTrade',
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (module) => module.RegisterComponent,
      ),
    title: 'Регистрация | NexusTrade',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/system-status/system-status.component').then(
        (module) => module.SystemStatusComponent,
      ),
    title: 'System status | NexusTrade',
  },
  {
    path: 'organizations',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/organizations/organizations.component').then(
        (module) => module.OrganizationsComponent,
      ),
    title: 'Организации | NexusTrade',
  },
  {
    path: 'invite/:token',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/organizations/accept-invitation.component').then(
        (module) => module.AcceptInvitationComponent,
      ),
    title: 'Приглашение | NexusTrade',
  },
  {
    path: '**',
    redirectTo: '',
  },
];

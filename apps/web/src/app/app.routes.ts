import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./features/system-status/system-status.component').then(
        (module) => module.SystemStatusComponent,
      ),
    title: 'System status | NexusTrade',
  },
  {
    path: '**',
    redirectTo: '',
  },
];

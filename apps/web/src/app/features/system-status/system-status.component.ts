import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import type { HealthResponse } from '@nexustrade/contracts';
import { catchError, EMPTY } from 'rxjs';
import { SystemStatusApiService } from './system-status-api.service';

type ViewState =
  | { state: 'loading' }
  | { state: 'ready'; health: HealthResponse }
  | { state: 'error'; message: string };

@Component({
  selector: 'app-system-status',
  imports: [MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './system-status.component.html',
  styleUrl: './system-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemStatusComponent {
  private readonly api = inject(SystemStatusApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly viewState = signal<ViewState>({ state: 'loading' });

  constructor() {
    this.refresh();
  }

  protected refresh(): void {
    this.viewState.set({ state: 'loading' });
    this.api
      .getReadiness()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.viewState.set({
            state: 'error',
            message: 'API или PostgreSQL недоступны. Проверьте инфраструктуру и повторите запрос.',
          });
          return EMPTY;
        }),
      )
      .subscribe((health) => this.viewState.set({ state: 'ready', health }));
  }
}

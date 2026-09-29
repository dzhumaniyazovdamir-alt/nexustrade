import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { ApiErrorResponse } from '@nexustrade/contracts';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { OrganizationsApiService } from '../../core/organizations/organizations-api.service';

@Component({
  selector: 'app-accept-invitation',
  imports: [MatButtonModule, MatCardModule, RouterLink],
  templateUrl: './accept-invitation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcceptInvitationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(OrganizationsApiService);
  private readonly auth = inject(AuthSessionService);
  readonly status = signal<'loading' | 'accepted' | 'error'>('loading');
  readonly message = signal('Принимаем приглашение…');

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.status.set('error');
      this.message.set('Некорректная ссылка приглашения');
      return;
    }
    try {
      const response = await firstValueFrom(this.api.accept({ token }));
      await firstValueFrom(this.auth.refreshSession());
      this.status.set('accepted');
      this.message.set(`Вы присоединились к организации «${response.organization.name}»`);
    } catch (error) {
      this.status.set('error');
      this.message.set(
        error instanceof HttpErrorResponse
          ? ((error.error as ApiErrorResponse | undefined)?.error?.message ??
              'Не удалось принять приглашение')
          : 'Не удалось принять приглашение',
      );
    }
  }
}

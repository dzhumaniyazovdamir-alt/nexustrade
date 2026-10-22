import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type {
  ApiErrorResponse,
  InvitationDto,
  MembershipDto,
  OrganizationDto,
  OrganizationRole,
} from '@nexustrade/contracts';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { OrganizationContextService } from '../../core/organizations/organization-context.service';
import { OrganizationsApiService } from '../../core/organizations/organizations-api.service';

type OrganizationWithRole = OrganizationDto & { role: OrganizationRole };

@Component({
  selector: 'app-organizations',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './organizations.component.html',
  styleUrl: './organizations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationsComponent implements OnInit {
  private readonly api = inject(OrganizationsApiService);
  private readonly auth = inject(AuthSessionService);
  private readonly organizationContext = inject(OrganizationContextService);
  readonly organizations = signal<OrganizationWithRole[]>([]);
  readonly activeOrganizationId = this.organizationContext.activeOrganizationId;
  readonly members = signal<MembershipDto[]>([]);
  readonly invitationLink = signal<string | null>(null);
  readonly invitations = signal<InvitationDto[]>([]);
  readonly error = signal<string | null>(null);
  readonly activeOrganization = computed(() =>
    this.organizations().find((organization) => organization.id === this.activeOrganizationId()),
  );
  readonly canManage = this.organizationContext.canManage;
  readonly isOwner = computed(() => this.activeOrganization()?.role === 'owner');

  readonly createForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
  });
  readonly inviteForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    role: new FormControl<'admin' | 'member'>('member', { nonNullable: true }),
  });
  readonly renameForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
  });

  async ngOnInit(): Promise<void> {
    await this.reloadOrganizations();
  }

  async selectOrganization(organizationId: string): Promise<void> {
    if (!this.organizationContext.select(organizationId)) return;
    this.invitationLink.set(null);
    this.renameForm.setValue({ name: this.activeOrganization()?.name ?? '' });
    await this.reloadOrganizationData();
  }

  async renameOrganization(): Promise<void> {
    const organizationId = this.activeOrganizationId();
    if (!organizationId || this.renameForm.invalid || !this.canManage()) return;
    try {
      await firstValueFrom(this.api.update(organizationId, this.renameForm.getRawValue()));
      await firstValueFrom(this.auth.refreshSession());
      await this.reloadOrganizations(organizationId);
    } catch (error) {
      this.setError(error);
    }
  }

  async createOrganization(): Promise<void> {
    if (this.createForm.invalid) return;
    try {
      const response = await firstValueFrom(this.api.create(this.createForm.getRawValue()));
      this.createForm.reset({ name: '' });
      await firstValueFrom(this.auth.refreshSession());
      await this.reloadOrganizations(response.organization.id);
    } catch (error) {
      this.setError(error);
    }
  }

  async invite(): Promise<void> {
    const organizationId = this.activeOrganizationId();
    if (!organizationId || this.inviteForm.invalid) return;
    try {
      const response = await firstValueFrom(
        this.api.invite(organizationId, this.inviteForm.getRawValue()),
      );
      this.invitationLink.set(`${window.location.origin}/invite/${response.token}`);
      this.inviteForm.reset({ email: '', role: 'member' });
      await this.reloadInvitations();
    } catch (error) {
      this.setError(error);
    }
  }

  async revokeInvitation(invitationId: string): Promise<void> {
    const organizationId = this.activeOrganizationId();
    if (!organizationId) return;
    try {
      await firstValueFrom(this.api.revokeInvitation(organizationId, invitationId));
      await this.reloadInvitations();
    } catch (error) {
      this.setError(error);
    }
  }

  async changeRole(userId: string, role: OrganizationRole): Promise<void> {
    const organizationId = this.activeOrganizationId();
    if (!organizationId) return;
    try {
      await firstValueFrom(this.api.changeRole(organizationId, userId, { role }));
      await this.reloadMembers();
    } catch (error) {
      this.setError(error);
    }
  }

  async removeMember(userId: string): Promise<void> {
    const organizationId = this.activeOrganizationId();
    if (!organizationId) return;
    try {
      await firstValueFrom(this.api.removeMember(organizationId, userId));
      await this.reloadMembers();
    } catch (error) {
      this.setError(error);
    }
  }

  async copyInvitation(): Promise<void> {
    const link = this.invitationLink();
    if (link) await navigator.clipboard.writeText(link);
  }

  private async reloadOrganizations(preferredId?: string): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.list());
      this.organizations.set(response.organizations);
      const organizationId =
        preferredId ?? this.activeOrganizationId() ?? response.organizations[0]?.id ?? null;
      if (organizationId) this.organizationContext.select(organizationId);
      this.renameForm.setValue({ name: this.activeOrganization()?.name ?? '' });
      if (organizationId) await this.reloadOrganizationData();
    } catch (error) {
      this.setError(error);
    }
  }

  private async reloadOrganizationData(): Promise<void> {
    await this.reloadMembers();
    if (this.canManage()) {
      await this.reloadInvitations();
    } else {
      this.invitations.set([]);
    }
  }

  private async reloadMembers(): Promise<void> {
    const organizationId = this.activeOrganizationId();
    if (!organizationId) {
      this.members.set([]);
      return;
    }
    const response = await firstValueFrom(this.api.members(organizationId));
    this.members.set(response.memberships);
  }

  private async reloadInvitations(): Promise<void> {
    const organizationId = this.activeOrganizationId();
    if (!organizationId) {
      this.invitations.set([]);
      return;
    }
    const response = await firstValueFrom(this.api.invitations(organizationId));
    this.invitations.set(response.invitations);
  }

  private setError(error: unknown): void {
    this.error.set(
      error instanceof HttpErrorResponse
        ? ((error.error as ApiErrorResponse | undefined)?.error?.message ?? 'Операция не выполнена')
        : 'Операция не выполнена',
    );
  }
}

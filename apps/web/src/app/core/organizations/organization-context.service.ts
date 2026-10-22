import { computed, effect, inject, Injectable, signal } from '@angular/core';
import type { OrganizationDto, OrganizationRole } from '@nexustrade/contracts';
import { AuthSessionService } from '../auth/auth-session.service';

type OrganizationWithRole = OrganizationDto & { role: OrganizationRole };

const STORAGE_KEY = 'nexustrade.activeOrganizationId';

@Injectable({ providedIn: 'root' })
export class OrganizationContextService {
  private readonly auth = inject(AuthSessionService);
  private readonly selectedId = signal<string | null>(localStorage.getItem(STORAGE_KEY));

  readonly organizations = computed<OrganizationWithRole[]>(() =>
    (this.auth.session()?.memberships ?? []).map(({ organization, role }) => ({
      ...organization,
      role,
    })),
  );
  readonly activeOrganizationId = this.selectedId.asReadonly();
  readonly activeOrganization = computed(
    () => this.organizations().find(({ id }) => id === this.selectedId()) ?? null,
  );
  readonly canManage = computed(() => {
    const role = this.activeOrganization()?.role;
    return role === 'owner' || role === 'admin';
  });

  constructor() {
    effect(() => {
      const organizations = this.organizations();
      const selected = this.selectedId();
      if (selected && organizations.some(({ id }) => id === selected)) return;
      this.setSelection(organizations[0]?.id ?? null);
    });
  }

  select(organizationId: string): boolean {
    if (!this.organizations().some(({ id }) => id === organizationId)) return false;
    this.setSelection(organizationId);
    return true;
  }

  private setSelection(organizationId: string | null): void {
    this.selectedId.set(organizationId);
    if (organizationId) localStorage.setItem(STORAGE_KEY, organizationId);
    else localStorage.removeItem(STORAGE_KEY);
  }
}

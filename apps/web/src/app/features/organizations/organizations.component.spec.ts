import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { OrganizationsApiService } from '../../core/organizations/organizations-api.service';
import { OrganizationsComponent } from './organizations.component';

describe('OrganizationsComponent', () => {
  const organization = {
    id: 'organization-1',
    name: 'Organization',
    slug: 'organization',
    defaultCurrency: 'USD',
    createdAt: new Date().toISOString(),
    role: 'owner' as const,
  };
  const invitation = {
    id: 'invitation-1',
    organizationId: organization.id,
    email: 'member@example.com',
    role: 'member' as const,
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  };
  const api = {
    list: vi.fn(() => of({ organizations: [organization] })),
    members: vi.fn(() => of({ memberships: [] })),
    invitations: vi.fn(() => of({ invitations: [invitation] })),
    update: vi.fn(() => of({ organization: { ...organization, name: 'Renamed' } })),
    revokeInvitation: vi.fn(() => of(undefined)),
  };
  const auth = {
    session: signal({
      user: { id: 'user-1', email: 'owner@example.com', displayName: 'Owner' },
      memberships: [{ organization, role: 'owner' as const }],
    }),
    refreshSession: vi.fn(() => of({ session: null })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [OrganizationsComponent],
      providers: [
        { provide: OrganizationsApiService, useValue: api },
        { provide: AuthSessionService, useValue: auth },
      ],
    });
  });

  it('loads active invitations for an owner and revokes one', async () => {
    const fixture = TestBed.createComponent(OrganizationsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.componentInstance.selectOrganization(organization.id);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('member@example.com');
    await fixture.componentInstance.revokeInvitation(invitation.id);
    expect(api.revokeInvitation).toHaveBeenCalledWith(organization.id, invitation.id);
  });

  it('renames the active organization and refreshes session data', async () => {
    const fixture = TestBed.createComponent(OrganizationsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.renameForm.setValue({ name: 'Renamed' });

    await fixture.componentInstance.renameOrganization();

    expect(api.update).toHaveBeenCalledWith(organization.id, { name: 'Renamed' });
    expect(auth.refreshSession).toHaveBeenCalled();
  });
});

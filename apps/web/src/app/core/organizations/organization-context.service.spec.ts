import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthSessionService } from '../auth/auth-session.service';
import { OrganizationContextService } from './organization-context.service';

describe('OrganizationContextService', () => {
  const first = {
    id: 'organization-1',
    name: 'First',
    slug: 'first',
    defaultCurrency: 'USD',
    createdAt: new Date().toISOString(),
  };
  const second = { ...first, id: 'organization-2', name: 'Second', slug: 'second' };
  const session = signal({
    user: { id: 'user-1', email: 'user@example.com', displayName: 'User' },
    memberships: [
      { organization: first, role: 'owner' as const },
      { organization: second, role: 'member' as const },
    ],
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthSessionService, useValue: { session } }],
    });
  });

  it('persists only a valid organization and derives permissions', () => {
    const service = TestBed.inject(OrganizationContextService);
    TestBed.flushEffects();

    expect(service.activeOrganizationId()).toBe(first.id);
    expect(service.canManage()).toBe(true);
    expect(service.select('unknown')).toBe(false);
    expect(service.select(second.id)).toBe(true);
    expect(service.canManage()).toBe(false);
    expect(localStorage.getItem('nexustrade.activeOrganizationId')).toBe(second.id);
  });
});

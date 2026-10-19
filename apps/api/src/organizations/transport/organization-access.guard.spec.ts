import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Repository } from 'typeorm';
import { OrganizationMembershipEntity } from '../infrastructure/organization-membership.entity';
import { OrganizationAccessGuard } from './organization-access.guard';

describe('OrganizationAccessGuard', () => {
  const request = {
    params: { organizationId: 'organization-1' },
    user: { userId: 'user-1', email: 'user@example.com' },
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () =>
      function handler() {
        return undefined;
      },
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
  let memberships: jest.Mocked<Pick<Repository<OrganizationMembershipEntity>, 'findOneBy'>>;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let guard: OrganizationAccessGuard;

  beforeEach(() => {
    memberships = { findOneBy: jest.fn() };
    reflector = { getAllAndOverride: jest.fn() };
    guard = new OrganizationAccessGuard(
      memberships as unknown as Repository<OrganizationMembershipEntity>,
      reflector as unknown as Reflector,
    );
  });

  it('allows a member when an endpoint has no narrower role metadata', async () => {
    memberships.findOneBy.mockResolvedValue({
      organizationId: 'organization-1',
      userId: 'user-1',
      role: 'member',
    } as OrganizationMembershipEntity);
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('denies a member when an endpoint requires owner', async () => {
    memberships.findOneBy.mockResolvedValue({
      organizationId: 'organization-1',
      userId: 'user-1',
      role: 'member',
    } as OrganizationMembershipEntity);
    reflector.getAllAndOverride.mockReturnValue(['owner']);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns the same denial when membership does not exist', async () => {
    memberships.findOneBy.mockResolvedValue(null);
    reflector.getAllAndOverride.mockReturnValue(['owner', 'admin', 'member']);

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ORGANIZATION_ACCESS_DENIED' }),
    });
  });
});

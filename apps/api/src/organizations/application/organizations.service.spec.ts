import type { ConfigService } from '@nestjs/config';
import type { InvitationDto } from '@nexustrade/contracts';
import type { OrganizationsRepository } from './organizations.ports';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let repository: jest.Mocked<OrganizationsRepository>;
  let service: OrganizationsService;

  beforeEach(() => {
    repository = {
      listForUser: jest.fn(),
      create: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      listMembers: jest.fn(),
      membershipExistsByEmail: jest.fn().mockResolvedValue(false),
      createInvitation: jest.fn(),
      listInvitations: jest.fn(),
      revokeInvitation: jest.fn(),
      acceptInvitation: jest.fn(),
      changeRole: jest.fn(),
      removeMember: jest.fn(),
    };
    const config = {
      getOrThrow: jest.fn().mockReturnValue(72),
    } as unknown as ConfigService;
    service = new OrganizationsService(repository, config);
  });

  it('stores only the invitation token hash', async () => {
    const invitation: InvitationDto = {
      id: 'invitation-1',
      organizationId: 'organization-1',
      email: 'member@example.com',
      role: 'member',
      expiresAt: new Date(Date.now() + 1_000).toISOString(),
    };
    repository.createInvitation.mockResolvedValue(invitation);

    const result = await service.createInvitation(
      invitation.organizationId,
      'owner-1',
      invitation.email,
      invitation.role,
    );

    const persistenceInput = repository.createInvitation.mock.calls[0]?.[0];
    expect(persistenceInput?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(persistenceInput?.tokenHash).not.toBe(result.token);
    expect(result.invitation).toEqual(invitation);
  });

  it('maps an invalid invitation result to a domain-facing API error', async () => {
    repository.acceptInvitation.mockResolvedValue({ status: 'invalid' });

    await expect(
      service.acceptInvitation('user-1', 'member@example.com', 'invalid-token'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_INVITATION' }),
    });
  });

  it.each([
    ['changeRole', () => service.changeRole('organization-1', 'owner-1', 'member')],
    ['removeMember', () => service.removeMember('organization-1', 'owner-1')],
  ])('protects the last owner during %s', async (method, action) => {
    repository[method as 'changeRole' | 'removeMember'].mockResolvedValue('last-owner');

    await expect(action()).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'LAST_OWNER_REQUIRED' }),
    });
  });
});

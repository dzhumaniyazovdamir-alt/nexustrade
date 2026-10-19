import type { ConfigService } from '@nestjs/config';
import type { SessionDto } from '@nexustrade/contracts';
import type { TokenService } from '../../common/auth/token.service';
import type { IdentityRepository, IdentityUser, PasswordHasher } from './identity.ports';
import { IdentityService } from './identity.service';

describe('IdentityService', () => {
  const user: IdentityUser = {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'password-hash',
    displayName: 'User',
  };
  const session: SessionDto = {
    user: { id: user.id, email: user.email, displayName: user.displayName },
    memberships: [],
  };
  let repository: jest.Mocked<IdentityRepository>;
  let passwordHasher: jest.Mocked<PasswordHasher>;
  let tokenService: jest.Mocked<TokenService>;
  let service: IdentityService;

  beforeEach(() => {
    repository = {
      createRegistration: jest.fn(),
      findUserByEmail: jest.fn(),
      getSession: jest.fn().mockResolvedValue(session),
      createRefreshFamily: jest.fn(),
      rotateRefreshFamily: jest.fn(),
      revokeRefreshFamily: jest.fn(),
    };
    passwordHasher = {
      hash: jest.fn().mockResolvedValue('password-hash'),
      verify: jest.fn(),
    };
    tokenService = {
      signAccess: jest.fn().mockReturnValue('access-token'),
      signRefresh: jest.fn().mockReturnValue('refresh-token'),
      verifyAccess: jest.fn(),
      verifyRefresh: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;
    const config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'PASSWORD_HASH_MEMORY_COST') return 19_456;
        if (key === 'JWT_REFRESH_TTL_SECONDS') return 2_592_000;
        throw new Error(`Unexpected config key: ${key}`);
      }),
    } as unknown as ConfigService;
    service = new IdentityService(repository, passwordHasher, tokenService, config);
  });

  it('maps duplicate registration to a stable conflict error', async () => {
    repository.createRegistration.mockResolvedValue({ status: 'email-exists' });

    await expect(
      service.register({
        email: user.email,
        password: 'SecurePassword123',
        displayName: user.displayName,
        organizationName: 'Organization',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'EMAIL_ALREADY_REGISTERED' }),
    });
    expect(repository.createRefreshFamily).not.toHaveBeenCalled();
  });

  it('returns the same generic error for an unknown user and a wrong password', async () => {
    repository.findUserByEmail.mockResolvedValueOnce(null).mockResolvedValueOnce(user);
    passwordHasher.verify.mockResolvedValue(false);

    await expect(service.login(user.email, 'wrong')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_CREDENTIALS' }),
    });
    await expect(service.login(user.email, 'wrong')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_CREDENTIALS' }),
    });
  });

  it('rejects a reused refresh token after the repository revokes its family', async () => {
    tokenService.verifyRefresh.mockReturnValue({
      sub: user.id,
      familyId: 'family-1',
      type: 'refresh',
      jti: 'token-1',
    });
    repository.rotateRefreshFamily.mockResolvedValue({ status: 'reused' });

    await expect(service.refresh('old-refresh-token')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_REFRESH_TOKEN' }),
    });
  });
});

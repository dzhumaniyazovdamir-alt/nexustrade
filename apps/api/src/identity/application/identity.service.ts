import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SessionDto } from '@nexustrade/contracts';
import { createHash, randomUUID } from 'node:crypto';
import { TokenService } from '../../common/auth/token.service';
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
  type IdentityUser,
  PASSWORD_HASHER,
  type PasswordHasher,
  type TokenPair,
} from './identity.ports';

interface RefreshPayload {
  sub: string;
  familyId: string;
  type: 'refresh';
  jti: string;
}

@Injectable()
export class IdentityService {
  constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    displayName: string;
    organizationName: string;
  }): Promise<{ session: SessionDto; tokens: TokenPair }> {
    const passwordHash = await this.passwordHasher.hash(
      input.password,
      this.configService.getOrThrow<number>('PASSWORD_HASH_MEMORY_COST'),
    );
    const registration = await this.repository.createRegistration({
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      organizationName: input.organizationName,
    });
    if (registration.status === 'email-exists') {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'Email is already registered',
      });
    }

    return {
      session: await this.getSession(registration.user.id),
      tokens: await this.issueTokenFamily(registration.user),
    };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ session: SessionDto; tokens: TokenPair }> {
    const user = await this.repository.findUserByEmail(email);
    if (!user || !(await this.passwordHasher.verify(user.passwordHash, password))) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }
    return { session: await this.getSession(user.id), tokens: await this.issueTokenFamily(user) };
  }

  async refresh(refreshToken: string): Promise<{ session: SessionDto; tokens: TokenPair }> {
    let payload: RefreshPayload;
    try {
      payload = this.tokenService.verifyRefresh<RefreshPayload>(refreshToken);
      if (payload.type !== 'refresh') throw new Error('Unexpected token type');
    } catch {
      throw this.invalidRefresh();
    }

    const rotation = await this.repository.rotateRefreshFamily({
      familyId: payload.familyId,
      userId: payload.sub,
      presentedTokenHash: this.sha256(refreshToken),
      expiresAt: this.refreshExpiry(),
      createTokens: (user) => this.signTokens(user, payload.familyId),
    });

    if (rotation.status !== 'rotated') throw this.invalidRefresh();
    return {
      session: await this.getSession(rotation.user.id),
      tokens: rotation.tokens,
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = this.tokenService.verifyRefresh<RefreshPayload>(refreshToken, true);
      await this.repository.revokeRefreshFamily(payload.familyId, payload.sub);
    } catch {
      // Logout is intentionally idempotent.
    }
  }

  async getSession(userId: string): Promise<SessionDto> {
    return this.repository.getSession(userId);
  }

  private issueTokenFamily(user: IdentityUser): Promise<TokenPair> {
    return this.repository.createRefreshFamily(user.id, this.refreshExpiry(), (familyId) =>
      this.signTokens(user, familyId),
    );
  }

  private signTokens(user: IdentityUser, familyId: string): TokenPair {
    const accessToken = this.tokenService.signAccess({
      sub: user.id,
      email: user.email,
      type: 'access',
    });
    const refreshToken = this.tokenService.signRefresh({
      sub: user.id,
      familyId,
      type: 'refresh',
      jti: randomUUID(),
    });
    return { accessToken, refreshToken };
  }

  private refreshExpiry(): Date {
    return new Date(
      Date.now() + this.configService.getOrThrow<number>('JWT_REFRESH_TTL_SECONDS') * 1000,
    );
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private invalidRefresh(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Session cannot be refreshed',
    });
  }
}

import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SessionDto } from '@nexustrade/contracts';
import { hash, verify } from '@node-rs/argon2';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { TokenService } from '../../common/auth/token.service';
import { OrganizationMembershipEntity } from '../../organizations/infrastructure/organization-membership.entity';
import { OrganizationEntity } from '../../organizations/infrastructure/organization.entity';
import { RefreshTokenFamilyEntity } from '../infrastructure/refresh-token-family.entity';
import { UserEntity } from '../infrastructure/user.entity';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RefreshPayload {
  sub: string;
  familyId: string;
  type: 'refresh';
  jti: string;
}

@Injectable()
export class IdentityService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    displayName: string;
    organizationName: string;
  }): Promise<{ session: SessionDto; tokens: TokenPair }> {
    const passwordHash = await hash(input.password, {
      memoryCost: this.configService.getOrThrow<number>('PASSWORD_HASH_MEMORY_COST'),
    });

    const user = await this.dataSource.transaction(async (manager) => {
      if (await manager.getRepository(UserEntity).existsBy({ email: input.email })) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'Email is already registered',
        });
      }
      const savedUser = await manager.getRepository(UserEntity).save(
        manager.getRepository(UserEntity).create({
          email: input.email,
          passwordHash,
          displayName: input.displayName,
        }),
      );
      const organization = await manager.getRepository(OrganizationEntity).save(
        manager.getRepository(OrganizationEntity).create({
          name: input.organizationName,
          slug: await this.uniqueSlug(manager, input.organizationName),
        }),
      );
      await manager.getRepository(OrganizationMembershipEntity).save(
        manager.getRepository(OrganizationMembershipEntity).create({
          organizationId: organization.id,
          userId: savedUser.id,
          role: 'owner',
        }),
      );
      return savedUser;
    });

    return { session: await this.getSession(user.id), tokens: await this.issueTokenFamily(user) };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ session: SessionDto; tokens: TokenPair }> {
    const user = await this.dataSource.getRepository(UserEntity).findOneBy({ email });
    if (!user || !(await verify(user.passwordHash, password))) {
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

    const tokenHash = this.sha256(refreshToken);
    const user = await this.dataSource.transaction(async (manager) => {
      const family = await manager
        .getRepository(RefreshTokenFamilyEntity)
        .createQueryBuilder('family')
        .setLock('pessimistic_write')
        .where('family.id = :id', { id: payload.familyId })
        .getOne();
      if (
        !family ||
        family.revokedAt ||
        family.expiresAt <= new Date() ||
        family.userId !== payload.sub
      ) {
        throw this.invalidRefresh();
      }
      if (family.tokenHash !== tokenHash) {
        family.revokedAt = new Date();
        await manager.getRepository(RefreshTokenFamilyEntity).save(family);
        return null;
      }
      const foundUser = await manager
        .getRepository(UserEntity)
        .findOneByOrFail({ id: family.userId });
      const tokens = await this.signTokens(foundUser, family.id);
      family.tokenHash = this.sha256(tokens.refreshToken);
      family.expiresAt = this.refreshExpiry();
      await manager.getRepository(RefreshTokenFamilyEntity).save(family);
      return { foundUser, tokens };
    });

    if (!user) throw this.invalidRefresh();
    return { session: await this.getSession(user.foundUser.id), tokens: user.tokens };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = this.tokenService.verifyRefresh<RefreshPayload>(refreshToken, true);
      await this.dataSource
        .getRepository(RefreshTokenFamilyEntity)
        .update({ id: payload.familyId, userId: payload.sub }, { revokedAt: new Date() });
    } catch {
      // Logout is intentionally idempotent.
    }
  }

  async getSession(userId: string): Promise<SessionDto> {
    const user = await this.dataSource.getRepository(UserEntity).findOneByOrFail({ id: userId });
    const rows = await this.dataSource
      .getRepository(OrganizationMembershipEntity)
      .createQueryBuilder('membership')
      .innerJoin(OrganizationEntity, 'organization', 'organization.id = membership.organization_id')
      .select([
        'membership.role AS role',
        'organization.id AS id',
        'organization.name AS name',
        'organization.slug AS slug',
        'organization.created_at AS "createdAt"',
      ])
      .where('membership.user_id = :userId', { userId })
      .orderBy('organization.name', 'ASC')
      .getRawMany<{
        role: 'owner' | 'admin' | 'member';
        id: string;
        name: string;
        slug: string;
        createdAt: Date;
      }>();
    return {
      user: { id: user.id, email: user.email, displayName: user.displayName },
      memberships: rows.map((row) => ({
        role: row.role,
        organization: {
          id: row.id,
          name: row.name,
          slug: row.slug,
          createdAt: new Date(row.createdAt).toISOString(),
        },
      })),
    };
  }

  private async issueTokenFamily(user: UserEntity): Promise<TokenPair> {
    const family = await this.dataSource.getRepository(RefreshTokenFamilyEntity).save(
      this.dataSource.getRepository(RefreshTokenFamilyEntity).create({
        userId: user.id,
        tokenHash: 'pending',
        expiresAt: this.refreshExpiry(),
        revokedAt: null,
      }),
    );
    const tokens = await this.signTokens(user, family.id);
    family.tokenHash = this.sha256(tokens.refreshToken);
    await this.dataSource.getRepository(RefreshTokenFamilyEntity).save(family);
    return tokens;
  }

  private async signTokens(user: UserEntity, familyId: string): Promise<TokenPair> {
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

  private async uniqueSlug(manager: EntityManager, name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
        .replace(/^-|-$/g, '') || 'organization';
    let slug = base;
    while (await manager.getRepository(OrganizationEntity).existsBy({ slug })) {
      slug = `${base}-${randomUUID().slice(0, 8)}`;
    }
    return slug;
  }

  private invalidRefresh(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Session cannot be refreshed',
    });
  }
}

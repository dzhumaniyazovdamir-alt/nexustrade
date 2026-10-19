import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import { OrganizationMembershipEntity } from '../../organizations/infrastructure/organization-membership.entity';
import { OrganizationEntity } from '../../organizations/infrastructure/organization.entity';
import type {
  IdentityRepository,
  IdentityUser,
  RefreshRotationResult,
  TokenPair,
} from '../application/identity.ports';
import { RefreshTokenFamilyEntity } from './refresh-token-family.entity';
import { UserEntity } from './user.entity';

@Injectable()
export class TypeOrmIdentityRepository implements IdentityRepository {
  constructor(private readonly dataSource: DataSource) {}

  async createRegistration(input: {
    email: string;
    passwordHash: string;
    displayName: string;
    organizationName: string;
  }): Promise<{ status: 'created'; user: IdentityUser } | { status: 'email-exists' }> {
    return this.dataSource.transaction(async (manager) => {
      if (await manager.getRepository(UserEntity).existsBy({ email: input.email })) {
        return { status: 'email-exists' };
      }
      const user = await manager.getRepository(UserEntity).save(
        manager.getRepository(UserEntity).create({
          email: input.email,
          passwordHash: input.passwordHash,
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
          userId: user.id,
          role: 'owner',
        }),
      );
      return { status: 'created', user: this.toUser(user) };
    });
  }

  async findUserByEmail(email: string): Promise<IdentityUser | null> {
    const user = await this.dataSource.getRepository(UserEntity).findOneBy({ email });
    return user ? this.toUser(user) : null;
  }

  async getSession(userId: string) {
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

  async createRefreshFamily(
    userId: string,
    expiresAt: Date,
    createTokens: (familyId: string) => TokenPair,
  ): Promise<TokenPair> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(RefreshTokenFamilyEntity);
      const family = await repository.save(
        repository.create({ userId, tokenHash: 'pending', expiresAt, revokedAt: null }),
      );
      const tokens = createTokens(family.id);
      family.tokenHash = this.sha256(tokens.refreshToken);
      await repository.save(family);
      return tokens;
    });
  }

  async rotateRefreshFamily(input: {
    familyId: string;
    userId: string;
    presentedTokenHash: string;
    expiresAt: Date;
    createTokens: (user: IdentityUser) => TokenPair;
  }): Promise<RefreshRotationResult> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(RefreshTokenFamilyEntity);
      const family = await repository
        .createQueryBuilder('family')
        .setLock('pessimistic_write')
        .where('family.id = :id', { id: input.familyId })
        .getOne();
      if (
        !family ||
        family.revokedAt ||
        family.expiresAt <= new Date() ||
        family.userId !== input.userId
      ) {
        return { status: 'invalid' };
      }
      if (family.tokenHash !== input.presentedTokenHash) {
        family.revokedAt = new Date();
        await repository.save(family);
        return { status: 'reused' };
      }
      const entity = await manager.getRepository(UserEntity).findOneByOrFail({ id: family.userId });
      const user = this.toUser(entity);
      const tokens = input.createTokens(user);
      family.tokenHash = this.sha256(tokens.refreshToken);
      family.expiresAt = input.expiresAt;
      await repository.save(family);
      return { status: 'rotated', user, tokens };
    });
  }

  async revokeRefreshFamily(familyId: string, userId: string): Promise<void> {
    await this.dataSource
      .getRepository(RefreshTokenFamilyEntity)
      .update({ id: familyId, userId }, { revokedAt: new Date() });
  }

  private toUser(user: UserEntity): IdentityUser {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      displayName: user.displayName,
    };
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
}

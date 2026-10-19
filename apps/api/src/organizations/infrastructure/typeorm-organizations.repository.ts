import { Injectable } from '@nestjs/common';
import type {
  InvitationDto,
  MembershipDto,
  OrganizationDto,
  OrganizationRole,
} from '@nexustrade/contracts';
import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import { UserEntity } from '../../identity/infrastructure/user.entity';
import type { OrganizationsRepository } from '../application/organizations.ports';
import { OrganizationInvitationEntity } from './organization-invitation.entity';
import { OrganizationMembershipEntity } from './organization-membership.entity';
import { OrganizationEntity } from './organization.entity';

@Injectable()
export class TypeOrmOrganizationsRepository implements OrganizationsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async listForUser(userId: string): Promise<Array<OrganizationDto & { role: OrganizationRole }>> {
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
      .getRawMany<OrganizationDto & { role: OrganizationRole; createdAt: Date }>();
    return rows.map((row) => ({ ...row, createdAt: new Date(row.createdAt).toISOString() }));
  }

  async create(userId: string, name: string): Promise<OrganizationDto> {
    return this.dataSource.transaction(async (manager) => {
      const organization = await manager.getRepository(OrganizationEntity).save(
        manager.getRepository(OrganizationEntity).create({
          name,
          slug: await this.uniqueSlug(manager, name),
        }),
      );
      await manager.getRepository(OrganizationMembershipEntity).save(
        manager.getRepository(OrganizationMembershipEntity).create({
          organizationId: organization.id,
          userId,
          role: 'owner',
        }),
      );
      return this.toOrganizationDto(organization);
    });
  }

  async get(organizationId: string): Promise<OrganizationDto | null> {
    const organization = await this.dataSource
      .getRepository(OrganizationEntity)
      .findOneBy({ id: organizationId });
    return organization ? this.toOrganizationDto(organization) : null;
  }

  async update(organizationId: string, name: string): Promise<OrganizationDto | null> {
    const repository = this.dataSource.getRepository(OrganizationEntity);
    const organization = await repository.findOneBy({ id: organizationId });
    if (!organization) return null;
    organization.name = name;
    return this.toOrganizationDto(await repository.save(organization));
  }

  async listMembers(organizationId: string): Promise<MembershipDto[]> {
    const rows = await this.dataSource
      .getRepository(OrganizationMembershipEntity)
      .createQueryBuilder('membership')
      .innerJoin(UserEntity, 'user', 'user.id = membership.user_id')
      .select([
        'membership.organization_id AS "organizationId"',
        'membership.role AS role',
        'membership.created_at AS "createdAt"',
        'user.id AS "userId"',
        'user.email AS email',
        'user.display_name AS "displayName"',
      ])
      .where('membership.organization_id = :organizationId', { organizationId })
      .orderBy('user.display_name', 'ASC')
      .getRawMany<{
        organizationId: string;
        role: OrganizationRole;
        createdAt: Date;
        userId: string;
        email: string;
        displayName: string;
      }>();
    return rows.map((row) => ({
      organizationId: row.organizationId,
      role: row.role,
      createdAt: new Date(row.createdAt).toISOString(),
      user: { id: row.userId, email: row.email, displayName: row.displayName },
    }));
  }

  async membershipExistsByEmail(organizationId: string, email: string): Promise<boolean> {
    return this.dataSource
      .getRepository(OrganizationMembershipEntity)
      .createQueryBuilder('membership')
      .innerJoin(UserEntity, 'user', 'user.id = membership.user_id')
      .where('membership.organization_id = :organizationId', { organizationId })
      .andWhere('user.email = :email', { email })
      .getExists();
  }

  async createInvitation(input: {
    organizationId: string;
    invitedByUserId: string;
    email: string;
    role: 'admin' | 'member';
    tokenHash: string;
    expiresAt: Date;
  }): Promise<InvitationDto> {
    const repository = this.dataSource.getRepository(OrganizationInvitationEntity);
    const invitation = await repository.save(
      repository.create({ ...input, acceptedAt: null, revokedAt: null }),
    );
    return this.toInvitationDto(invitation);
  }

  async listInvitations(organizationId: string): Promise<InvitationDto[]> {
    const invitations = await this.dataSource
      .getRepository(OrganizationInvitationEntity)
      .createQueryBuilder('invitation')
      .where('invitation.organization_id = :organizationId', { organizationId })
      .andWhere('invitation.accepted_at IS NULL')
      .andWhere('invitation.revoked_at IS NULL')
      .andWhere('invitation.expires_at > :now', { now: new Date() })
      .orderBy('invitation.created_at', 'DESC')
      .getMany();
    return invitations.map((invitation) => this.toInvitationDto(invitation));
  }

  async revokeInvitation(organizationId: string, invitationId: string): Promise<boolean> {
    const invitation = await this.dataSource
      .getRepository(OrganizationInvitationEntity)
      .findOneBy({ id: invitationId, organizationId });
    if (!invitation) return false;
    invitation.revokedAt = new Date();
    await this.dataSource.getRepository(OrganizationInvitationEntity).save(invitation);
    return true;
  }

  async acceptInvitation(input: {
    userId: string;
    userEmail: string;
    tokenHash: string;
  }): Promise<
    | { status: 'accepted'; organization: OrganizationDto }
    | { status: 'invalid' }
    | { status: 'already-member' }
  > {
    return this.dataSource.transaction(async (manager) => {
      const invitation = await manager
        .getRepository(OrganizationInvitationEntity)
        .createQueryBuilder('invitation')
        .setLock('pessimistic_write')
        .where('invitation.token_hash = :tokenHash', { tokenHash: input.tokenHash })
        .getOne();
      if (
        !invitation ||
        invitation.acceptedAt ||
        invitation.revokedAt ||
        invitation.expiresAt <= new Date() ||
        invitation.email !== input.userEmail
      ) {
        return { status: 'invalid' };
      }
      if (
        await manager
          .getRepository(OrganizationMembershipEntity)
          .existsBy({ organizationId: invitation.organizationId, userId: input.userId })
      ) {
        return { status: 'already-member' };
      }
      await manager.getRepository(OrganizationMembershipEntity).save(
        manager.getRepository(OrganizationMembershipEntity).create({
          organizationId: invitation.organizationId,
          userId: input.userId,
          role: invitation.role,
        }),
      );
      invitation.acceptedAt = new Date();
      await manager.getRepository(OrganizationInvitationEntity).save(invitation);
      const organization = await manager
        .getRepository(OrganizationEntity)
        .findOneByOrFail({ id: invitation.organizationId });
      return { status: 'accepted', organization: this.toOrganizationDto(organization) };
    });
  }

  async changeRole(
    organizationId: string,
    userId: string,
    role: OrganizationRole,
  ): Promise<'updated' | 'not-found' | 'last-owner'> {
    return this.dataSource.transaction(async (manager) => {
      const membership = await this.lockMembership(manager, organizationId, userId);
      if (!membership) return 'not-found';
      if (
        membership.role === 'owner' &&
        role !== 'owner' &&
        (await this.ownerCount(manager, organizationId)) <= 1
      ) {
        return 'last-owner';
      }
      membership.role = role;
      await manager.getRepository(OrganizationMembershipEntity).save(membership);
      return 'updated';
    });
  }

  async removeMember(
    organizationId: string,
    userId: string,
  ): Promise<'removed' | 'not-found' | 'last-owner'> {
    return this.dataSource.transaction(async (manager) => {
      const membership = await this.lockMembership(manager, organizationId, userId);
      if (!membership) return 'not-found';
      if (membership.role === 'owner' && (await this.ownerCount(manager, organizationId)) <= 1) {
        return 'last-owner';
      }
      await manager.getRepository(OrganizationMembershipEntity).remove(membership);
      return 'removed';
    });
  }

  private lockMembership(
    manager: EntityManager,
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMembershipEntity | null> {
    return manager
      .getRepository(OrganizationMembershipEntity)
      .createQueryBuilder('membership')
      .setLock('pessimistic_write')
      .where('membership.organization_id = :organizationId AND membership.user_id = :userId', {
        organizationId,
        userId,
      })
      .getOne();
  }

  private ownerCount(manager: EntityManager, organizationId: string): Promise<number> {
    return manager
      .getRepository(OrganizationMembershipEntity)
      .countBy({ organizationId, role: 'owner' });
  }

  private toOrganizationDto(entity: OrganizationEntity): OrganizationDto {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  private toInvitationDto(entity: OrganizationInvitationEntity): InvitationDto {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      email: entity.email,
      role: entity.role,
      expiresAt: entity.expiresAt.toISOString(),
    };
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

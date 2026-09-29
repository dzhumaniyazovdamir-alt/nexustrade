import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CreateInvitationResponse,
  MembershipDto,
  OrganizationDto,
  OrganizationRole,
} from '@nexustrade/contracts';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { UserEntity } from '../../identity/infrastructure/user.entity';
import { OrganizationInvitationEntity } from '../infrastructure/organization-invitation.entity';
import { OrganizationMembershipEntity } from '../infrastructure/organization-membership.entity';
import { OrganizationEntity } from '../infrastructure/organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

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
      const organization = await manager
        .getRepository(OrganizationEntity)
        .save(
          manager
            .getRepository(OrganizationEntity)
            .create({ name, slug: await this.uniqueSlug(manager, name) }),
        );
      await manager.getRepository(OrganizationMembershipEntity).save(
        manager.getRepository(OrganizationMembershipEntity).create({
          organizationId: organization.id,
          userId,
          role: 'owner',
        }),
      );
      return this.toDto(organization);
    });
  }

  async get(organizationId: string): Promise<OrganizationDto> {
    const organization = await this.dataSource
      .getRepository(OrganizationEntity)
      .findOneBy({ id: organizationId });
    if (!organization)
      throw new NotFoundException({
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found',
      });
    return this.toDto(organization);
  }

  async update(organizationId: string, name: string): Promise<OrganizationDto> {
    const repository = this.dataSource.getRepository(OrganizationEntity);
    const organization = await repository.findOneBy({ id: organizationId });
    if (!organization)
      throw new NotFoundException({
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found',
      });
    organization.name = name;
    return this.toDto(await repository.save(organization));
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

  async createInvitation(
    organizationId: string,
    invitedByUserId: string,
    email: string,
    role: 'admin' | 'member',
  ): Promise<CreateInvitationResponse> {
    const existingUser = await this.dataSource.getRepository(UserEntity).findOneBy({ email });
    if (
      existingUser &&
      (await this.dataSource
        .getRepository(OrganizationMembershipEntity)
        .existsBy({ organizationId, userId: existingUser.id }))
    ) {
      throw new ConflictException({
        code: 'MEMBERSHIP_ALREADY_EXISTS',
        message: 'User is already a member',
      });
    }
    const token = randomBytes(32).toString('base64url');
    const invitation = await this.dataSource.getRepository(OrganizationInvitationEntity).save(
      this.dataSource.getRepository(OrganizationInvitationEntity).create({
        organizationId,
        invitedByUserId,
        email,
        role,
        tokenHash: this.sha256(token),
        expiresAt: new Date(
          Date.now() + this.configService.getOrThrow<number>('INVITATION_TTL_HOURS') * 3_600_000,
        ),
        acceptedAt: null,
        revokedAt: null,
      }),
    );
    return {
      token,
      invitation: {
        id: invitation.id,
        organizationId,
        email,
        role,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    };
  }

  async revokeInvitation(organizationId: string, invitationId: string): Promise<void> {
    const invitation = await this.dataSource
      .getRepository(OrganizationInvitationEntity)
      .findOneBy({ id: invitationId, organizationId });
    if (!invitation)
      throw new NotFoundException({
        code: 'INVITATION_NOT_FOUND',
        message: 'Invitation not found',
      });
    invitation.revokedAt = new Date();
    await this.dataSource.getRepository(OrganizationInvitationEntity).save(invitation);
  }

  async acceptInvitation(
    userId: string,
    userEmail: string,
    token: string,
  ): Promise<OrganizationDto> {
    return this.dataSource.transaction(async (manager) => {
      const invitation = await manager
        .getRepository(OrganizationInvitationEntity)
        .createQueryBuilder('invitation')
        .setLock('pessimistic_write')
        .where('invitation.token_hash = :tokenHash', { tokenHash: this.sha256(token) })
        .getOne();
      if (
        !invitation ||
        invitation.acceptedAt ||
        invitation.revokedAt ||
        invitation.expiresAt <= new Date() ||
        invitation.email !== userEmail
      ) {
        throw new BadRequestException({
          code: 'INVALID_INVITATION',
          message: 'Invitation is invalid or expired',
        });
      }
      if (
        await manager
          .getRepository(OrganizationMembershipEntity)
          .existsBy({ organizationId: invitation.organizationId, userId })
      ) {
        throw new ConflictException({
          code: 'MEMBERSHIP_ALREADY_EXISTS',
          message: 'User is already a member',
        });
      }
      await manager.getRepository(OrganizationMembershipEntity).save(
        manager.getRepository(OrganizationMembershipEntity).create({
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
        }),
      );
      invitation.acceptedAt = new Date();
      await manager.getRepository(OrganizationInvitationEntity).save(invitation);
      const organization = await manager
        .getRepository(OrganizationEntity)
        .findOneByOrFail({ id: invitation.organizationId });
      return this.toDto(organization);
    });
  }

  async changeRole(organizationId: string, userId: string, role: OrganizationRole): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const membership = await this.lockMembership(manager, organizationId, userId);
      if (membership.role === 'owner' && role !== 'owner')
        await this.assertAnotherOwner(manager, organizationId, userId);
      membership.role = role;
      await manager.getRepository(OrganizationMembershipEntity).save(membership);
    });
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const membership = await this.lockMembership(manager, organizationId, userId);
      if (membership.role === 'owner')
        await this.assertAnotherOwner(manager, organizationId, userId);
      await manager.getRepository(OrganizationMembershipEntity).remove(membership);
    });
  }

  private async lockMembership(manager: EntityManager, organizationId: string, userId: string) {
    const membership = await manager
      .getRepository(OrganizationMembershipEntity)
      .createQueryBuilder('membership')
      .setLock('pessimistic_write')
      .where('membership.organization_id = :organizationId AND membership.user_id = :userId', {
        organizationId,
        userId,
      })
      .getOne();
    if (!membership)
      throw new NotFoundException({
        code: 'MEMBERSHIP_NOT_FOUND',
        message: 'Membership not found',
      });
    return membership;
  }

  private async assertAnotherOwner(
    manager: EntityManager,
    organizationId: string,
    excludedUserId: string,
  ): Promise<void> {
    const count = await manager
      .getRepository(OrganizationMembershipEntity)
      .countBy({ organizationId, role: 'owner' });
    if (count <= 1) {
      throw new ConflictException({
        code: 'LAST_OWNER_REQUIRED',
        message: 'The last owner cannot be removed or demoted',
      });
    }
    void excludedUserId;
  }

  private toDto(entity: OrganizationEntity): OrganizationDto {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      createdAt: entity.createdAt.toISOString(),
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
    while (await manager.getRepository(OrganizationEntity).existsBy({ slug }))
      slug = `${base}-${randomUUID().slice(0, 8)}`;
    return slug;
  }
}

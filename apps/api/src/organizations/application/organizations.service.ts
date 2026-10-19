import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CreateInvitationResponse,
  InvitationDto,
  MembershipDto,
  OrganizationDto,
  OrganizationRole,
} from '@nexustrade/contracts';
import { createHash, randomBytes } from 'node:crypto';
import { ORGANIZATIONS_REPOSITORY, type OrganizationsRepository } from './organizations.ports';

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly repository: OrganizationsRepository,
    private readonly configService: ConfigService,
  ) {}

  async listForUser(userId: string): Promise<Array<OrganizationDto & { role: OrganizationRole }>> {
    return this.repository.listForUser(userId);
  }

  async create(userId: string, name: string): Promise<OrganizationDto> {
    return this.repository.create(userId, name);
  }

  async get(organizationId: string): Promise<OrganizationDto> {
    const organization = await this.repository.get(organizationId);
    if (!organization)
      throw new NotFoundException({
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found',
      });
    return organization;
  }

  async update(organizationId: string, name: string): Promise<OrganizationDto> {
    const organization = await this.repository.update(organizationId, name);
    if (!organization)
      throw new NotFoundException({
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found',
      });
    return organization;
  }

  async listMembers(organizationId: string): Promise<MembershipDto[]> {
    return this.repository.listMembers(organizationId);
  }

  async createInvitation(
    organizationId: string,
    invitedByUserId: string,
    email: string,
    role: 'admin' | 'member',
  ): Promise<CreateInvitationResponse> {
    if (await this.repository.membershipExistsByEmail(organizationId, email)) {
      throw new ConflictException({
        code: 'MEMBERSHIP_ALREADY_EXISTS',
        message: 'User is already a member',
      });
    }
    const token = randomBytes(32).toString('base64url');
    const invitation = await this.repository.createInvitation({
      organizationId,
      invitedByUserId,
      email,
      role,
      tokenHash: this.sha256(token),
      expiresAt: new Date(
        Date.now() + this.configService.getOrThrow<number>('INVITATION_TTL_HOURS') * 3_600_000,
      ),
    });
    return { token, invitation };
  }

  listInvitations(organizationId: string): Promise<InvitationDto[]> {
    return this.repository.listInvitations(organizationId);
  }

  async revokeInvitation(organizationId: string, invitationId: string): Promise<void> {
    if (!(await this.repository.revokeInvitation(organizationId, invitationId))) {
      throw new NotFoundException({
        code: 'INVITATION_NOT_FOUND',
        message: 'Invitation not found',
      });
    }
  }

  async acceptInvitation(
    userId: string,
    userEmail: string,
    token: string,
  ): Promise<OrganizationDto> {
    const result = await this.repository.acceptInvitation({
      userId,
      userEmail,
      tokenHash: this.sha256(token),
    });
    if (result.status === 'invalid') {
      throw new BadRequestException({
        code: 'INVALID_INVITATION',
        message: 'Invitation is invalid or expired',
      });
    }
    if (result.status === 'already-member') {
      throw new ConflictException({
        code: 'MEMBERSHIP_ALREADY_EXISTS',
        message: 'User is already a member',
      });
    }
    return result.organization;
  }

  async changeRole(organizationId: string, userId: string, role: OrganizationRole): Promise<void> {
    const result = await this.repository.changeRole(organizationId, userId, role);
    this.assertMembershipMutation(result);
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    const result = await this.repository.removeMember(organizationId, userId);
    this.assertMembershipMutation(result);
  }

  private assertMembershipMutation(
    result: 'updated' | 'removed' | 'not-found' | 'last-owner',
  ): void {
    if (result === 'not-found') {
      throw new NotFoundException({
        code: 'MEMBERSHIP_NOT_FOUND',
        message: 'Membership not found',
      });
    }
    if (result === 'last-owner') {
      throw new ConflictException({
        code: 'LAST_OWNER_REQUIRED',
        message: 'The last owner cannot be removed or demoted',
      });
    }
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}

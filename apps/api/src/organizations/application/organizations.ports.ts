import type {
  InvitationDto,
  MembershipDto,
  OrganizationDto,
  OrganizationRole,
} from '@nexustrade/contracts';

export const ORGANIZATIONS_REPOSITORY = Symbol('ORGANIZATIONS_REPOSITORY');

export interface OrganizationsRepository {
  listForUser(userId: string): Promise<Array<OrganizationDto & { role: OrganizationRole }>>;
  create(userId: string, name: string, defaultCurrency?: string): Promise<OrganizationDto>;
  get(organizationId: string): Promise<OrganizationDto | null>;
  update(organizationId: string, name: string): Promise<OrganizationDto | null>;
  listMembers(organizationId: string): Promise<MembershipDto[]>;
  membershipExistsByEmail(organizationId: string, email: string): Promise<boolean>;
  createInvitation(input: {
    organizationId: string;
    invitedByUserId: string;
    email: string;
    role: 'admin' | 'member';
    tokenHash: string;
    expiresAt: Date;
  }): Promise<InvitationDto>;
  listInvitations(organizationId: string): Promise<InvitationDto[]>;
  revokeInvitation(organizationId: string, invitationId: string): Promise<boolean>;
  acceptInvitation(input: {
    userId: string;
    userEmail: string;
    tokenHash: string;
  }): Promise<
    | { status: 'accepted'; organization: OrganizationDto }
    | { status: 'invalid' }
    | { status: 'already-member' }
  >;
  changeRole(
    organizationId: string,
    userId: string,
    role: OrganizationRole,
  ): Promise<'updated' | 'not-found' | 'last-owner'>;
  removeMember(
    organizationId: string,
    userId: string,
  ): Promise<'removed' | 'not-found' | 'last-owner'>;
}

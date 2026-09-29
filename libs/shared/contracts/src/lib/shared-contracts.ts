export type HealthStatus = 'ok' | 'error';

export interface HealthCheck {
  status: HealthStatus;
}

export interface HealthResponse {
  status: HealthStatus;
  service: 'nexustrade-api';
  timestamp: string;
  checks?: {
    database: HealthCheck;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    correlationId: string;
    details?: unknown;
  };
}

export const organizationRoles = ['owner', 'admin', 'member'] as const;
export type OrganizationRole = (typeof organizationRoles)[number];

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
}

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface MembershipDto {
  user: UserDto;
  organizationId: string;
  role: OrganizationRole;
  createdAt: string;
}

export interface SessionDto {
  user: UserDto;
  memberships: Array<{
    organization: OrganizationDto;
    role: OrganizationRole;
  }>;
}

export interface SessionResponse {
  session: SessionDto | null;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  organizationName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  session: SessionDto;
}

export interface CreateOrganizationRequest {
  name: string;
}

export interface UpdateOrganizationRequest {
  name: string;
}

export interface OrganizationsResponse {
  organizations: Array<OrganizationDto & { role: OrganizationRole }>;
}

export interface OrganizationResponse {
  organization: OrganizationDto;
}

export interface MembershipsResponse {
  memberships: MembershipDto[];
}

export interface ChangeMembershipRoleRequest {
  role: OrganizationRole;
}

export interface CreateInvitationRequest {
  email: string;
  role: Exclude<OrganizationRole, 'owner'>;
}

export interface InvitationDto {
  id: string;
  organizationId: string;
  email: string;
  role: Exclude<OrganizationRole, 'owner'>;
  expiresAt: string;
}

export interface CreateInvitationResponse {
  invitation: InvitationDto;
  token: string;
}

export interface AcceptInvitationRequest {
  token: string;
}

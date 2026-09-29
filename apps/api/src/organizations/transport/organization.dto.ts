import type {
  AcceptInvitationRequest,
  ChangeMembershipRoleRequest,
  CreateInvitationRequest,
  CreateOrganizationRequest,
  OrganizationRole,
  UpdateOrganizationRequest,
} from '@nexustrade/contracts';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsString, IsUUID, Length } from 'class-validator';

export class CreateOrganizationDto implements CreateOrganizationRequest {
  @IsString()
  @Length(2, 160)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;
}

export class UpdateOrganizationDto implements UpdateOrganizationRequest {
  @IsString()
  @Length(2, 160)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;
}

export class CreateInvitationDto implements CreateInvitationRequest {
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @IsIn(['admin', 'member'])
  role!: 'admin' | 'member';
}

export class AcceptInvitationDto implements AcceptInvitationRequest {
  @IsString()
  @Length(32, 256)
  token!: string;
}

export class ChangeMembershipRoleDto implements ChangeMembershipRoleRequest {
  @IsIn(['owner', 'admin', 'member'])
  role!: OrganizationRole;
}

export class InvitationIdDto {
  @IsUUID()
  invitationId!: string;
}

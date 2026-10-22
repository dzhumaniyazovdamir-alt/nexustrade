import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type {
  CreateInvitationResponse,
  InvitationsResponse,
  MembershipsResponse,
  OrganizationResponse,
  OrganizationsResponse,
} from '@nexustrade/contracts';
import { AccessTokenGuard } from '../../common/auth/access-token.guard';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { OrganizationsService } from '../application/organizations.service';
import { OrganizationAccessGuard } from './organization-access.guard';
import { OrganizationRoles } from './organization-roles.decorator';
import {
  AcceptInvitationDto,
  ChangeMembershipRoleDto,
  CreateInvitationDto,
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './organization.dto';

@Controller({ path: 'organizations', version: '1' })
@UseGuards(AccessTokenGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser): Promise<OrganizationsResponse> {
    return { organizations: await this.organizationsService.listForUser(user.userId) };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateOrganizationDto,
  ): Promise<OrganizationResponse> {
    return {
      organization: await this.organizationsService.create(
        user.userId,
        body.name,
        body.defaultCurrency,
      ),
    };
  }

  @Post('invitations/accept')
  @HttpCode(200)
  async acceptInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AcceptInvitationDto,
  ): Promise<OrganizationResponse> {
    return {
      organization: await this.organizationsService.acceptInvitation(
        user.userId,
        user.email,
        body.token,
      ),
    };
  }

  @Get(':organizationId')
  @UseGuards(OrganizationAccessGuard)
  async get(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<OrganizationResponse> {
    return { organization: await this.organizationsService.get(organizationId) };
  }

  @Patch(':organizationId')
  @UseGuards(OrganizationAccessGuard)
  @OrganizationRoles('owner', 'admin')
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() body: UpdateOrganizationDto,
  ): Promise<OrganizationResponse> {
    return { organization: await this.organizationsService.update(organizationId, body.name) };
  }

  @Get(':organizationId/members')
  @UseGuards(OrganizationAccessGuard)
  async members(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<MembershipsResponse> {
    return { memberships: await this.organizationsService.listMembers(organizationId) };
  }

  @Post(':organizationId/invitations')
  @UseGuards(OrganizationAccessGuard)
  @OrganizationRoles('owner', 'admin')
  async invite(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateInvitationDto,
  ): Promise<CreateInvitationResponse> {
    return this.organizationsService.createInvitation(
      organizationId,
      user.userId,
      body.email,
      body.role,
    );
  }

  @Get(':organizationId/invitations')
  @UseGuards(OrganizationAccessGuard)
  @OrganizationRoles('owner', 'admin')
  async invitations(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<InvitationsResponse> {
    return { invitations: await this.organizationsService.listInvitations(organizationId) };
  }

  @Delete(':organizationId/invitations/:invitationId')
  @UseGuards(OrganizationAccessGuard)
  @OrganizationRoles('owner', 'admin')
  @HttpCode(204)
  async revokeInvitation(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ): Promise<void> {
    await this.organizationsService.revokeInvitation(organizationId, invitationId);
  }

  @Patch(':organizationId/members/:userId/role')
  @UseGuards(OrganizationAccessGuard)
  @OrganizationRoles('owner')
  @HttpCode(204)
  async changeRole(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: ChangeMembershipRoleDto,
  ): Promise<void> {
    await this.organizationsService.changeRole(organizationId, userId, body.role);
  }

  @Delete(':organizationId/members/:userId')
  @UseGuards(OrganizationAccessGuard)
  @OrganizationRoles('owner')
  @HttpCode(204)
  async removeMember(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.organizationsService.removeMember(organizationId, userId);
  }
}

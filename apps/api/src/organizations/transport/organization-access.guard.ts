import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { OrganizationRole } from '@nexustrade/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { OrganizationMembershipEntity } from '../infrastructure/organization-membership.entity';
import { ORGANIZATION_ROLES_KEY } from './organization-roles.decorator';

@Injectable()
export class OrganizationAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(OrganizationMembershipEntity)
    private readonly memberships: Repository<OrganizationMembershipEntity>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    const rawOrganizationId = request.params['organizationId'];
    const organizationId = Array.isArray(rawOrganizationId)
      ? rawOrganizationId[0]
      : rawOrganizationId;
    if (!organizationId) return false;
    const membership = await this.memberships.findOneBy({
      organizationId,
      userId: request.user.userId,
    });
    const allowed = this.reflector.getAllAndOverride<OrganizationRole[]>(ORGANIZATION_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? ['owner', 'admin', 'member'];
    if (!membership || !allowed.includes(membership.role)) {
      throw new ForbiddenException({
        code: 'ORGANIZATION_ACCESS_DENIED',
        message: 'You do not have permission to perform this action',
      });
    }
    return true;
  }
}

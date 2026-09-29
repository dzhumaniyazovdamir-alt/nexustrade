import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityModule } from '../identity/identity.module';
import { UserEntity } from '../identity/infrastructure/user.entity';
import { OrganizationsService } from './application/organizations.service';
import { OrganizationInvitationEntity } from './infrastructure/organization-invitation.entity';
import { OrganizationMembershipEntity } from './infrastructure/organization-membership.entity';
import { OrganizationEntity } from './infrastructure/organization.entity';
import { OrganizationAccessGuard } from './transport/organization-access.guard';
import { OrganizationsController } from './transport/organizations.controller';

@Module({
  imports: [
    IdentityModule,
    TypeOrmModule.forFeature([
      UserEntity,
      OrganizationEntity,
      OrganizationMembershipEntity,
      OrganizationInvitationEntity,
    ]),
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationAccessGuard],
})
export class OrganizationsModule {}

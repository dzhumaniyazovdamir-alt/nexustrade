import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityModule } from '../identity/identity.module';
import { UserEntity } from '../identity/infrastructure/user.entity';
import { OrganizationsService } from './application/organizations.service';
import { ORGANIZATIONS_REPOSITORY } from './application/organizations.ports';
import { OrganizationInvitationEntity } from './infrastructure/organization-invitation.entity';
import { OrganizationMembershipEntity } from './infrastructure/organization-membership.entity';
import { OrganizationEntity } from './infrastructure/organization.entity';
import { TypeOrmOrganizationsRepository } from './infrastructure/typeorm-organizations.repository';
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
  providers: [
    OrganizationsService,
    OrganizationAccessGuard,
    { provide: ORGANIZATIONS_REPOSITORY, useClass: TypeOrmOrganizationsRepository },
  ],
  exports: [OrganizationAccessGuard],
})
export class OrganizationsModule {}

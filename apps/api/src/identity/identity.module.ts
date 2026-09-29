import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessTokenGuard } from '../common/auth/access-token.guard';
import { OptionalAccessTokenGuard } from '../common/auth/optional-access-token.guard';
import { TokenService } from '../common/auth/token.service';
import { OrganizationInvitationEntity } from '../organizations/infrastructure/organization-invitation.entity';
import { OrganizationMembershipEntity } from '../organizations/infrastructure/organization-membership.entity';
import { OrganizationEntity } from '../organizations/infrastructure/organization.entity';
import { IdentityService } from './application/identity.service';
import { RefreshTokenFamilyEntity } from './infrastructure/refresh-token-family.entity';
import { UserEntity } from './infrastructure/user.entity';
import { AuthController } from './transport/auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RefreshTokenFamilyEntity,
      OrganizationEntity,
      OrganizationMembershipEntity,
      OrganizationInvitationEntity,
    ]),
  ],
  controllers: [AuthController],
  providers: [IdentityService, AccessTokenGuard, OptionalAccessTokenGuard, TokenService],
  exports: [IdentityService, AccessTokenGuard, TokenService],
})
export class IdentityModule {}

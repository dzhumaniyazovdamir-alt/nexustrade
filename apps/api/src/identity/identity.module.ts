import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessTokenGuard } from '../common/auth/access-token.guard';
import { OptionalAccessTokenGuard } from '../common/auth/optional-access-token.guard';
import { TokenService } from '../common/auth/token.service';
import { OrganizationInvitationEntity } from '../organizations/infrastructure/organization-invitation.entity';
import { OrganizationMembershipEntity } from '../organizations/infrastructure/organization-membership.entity';
import { OrganizationEntity } from '../organizations/infrastructure/organization.entity';
import { IdentityService } from './application/identity.service';
import { IDENTITY_REPOSITORY, PASSWORD_HASHER } from './application/identity.ports';
import { ArgonPasswordHasher } from './infrastructure/argon-password-hasher';
import { RefreshTokenFamilyEntity } from './infrastructure/refresh-token-family.entity';
import { UserEntity } from './infrastructure/user.entity';
import { TypeOrmIdentityRepository } from './infrastructure/typeorm-identity.repository';
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
  providers: [
    IdentityService,
    AccessTokenGuard,
    OptionalAccessTokenGuard,
    TokenService,
    { provide: IDENTITY_REPOSITORY, useClass: TypeOrmIdentityRepository },
    { provide: PASSWORD_HASHER, useClass: ArgonPasswordHasher },
  ],
  exports: [IdentityService, AccessTokenGuard, TokenService],
})
export class IdentityModule {}

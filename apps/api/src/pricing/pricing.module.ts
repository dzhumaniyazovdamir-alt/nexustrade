import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { OrganizationEntity } from '../organizations/infrastructure/organization.entity';
import { OrganizationMembershipEntity } from '../organizations/infrastructure/organization-membership.entity';
import { PRICING_REPOSITORY, PRICING_STATE_READER } from './application/pricing.ports';
import { PricingService } from './application/pricing.service';
import { TypeOrmPricingRepository } from './infrastructure/typeorm-pricing.repository';
import { VariantPriceEntity } from './infrastructure/variant-price.entity';
import { PricingController } from './transport/pricing.controller';

@Module({
  imports: [
    CatalogModule,
    OrganizationsModule,
    IdentityModule,
    TypeOrmModule.forFeature([
      VariantPriceEntity,
      OrganizationEntity,
      OrganizationMembershipEntity,
    ]),
  ],
  controllers: [PricingController],
  providers: [
    PricingService,
    { provide: PRICING_REPOSITORY, useClass: TypeOrmPricingRepository },
    { provide: PRICING_STATE_READER, useExisting: PRICING_REPOSITORY },
  ],
  exports: [PRICING_STATE_READER],
})
export class PricingModule {}

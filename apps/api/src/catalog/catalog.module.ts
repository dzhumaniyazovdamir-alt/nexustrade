import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { OrganizationMembershipEntity } from '../organizations/infrastructure/organization-membership.entity';
import { CatalogService } from './application/catalog.service';
import { CATALOG_REPOSITORY, CATALOG_VARIANT_READER } from './application/catalog.ports';
import { ProductCategoryEntity } from './infrastructure/product-category.entity';
import { ProductVariantEntity } from './infrastructure/product-variant.entity';
import { ProductEntity } from './infrastructure/product.entity';
import { TypeOrmCatalogRepository } from './infrastructure/typeorm-catalog.repository';
import { CatalogController } from './transport/catalog.controller';

@Module({
  imports: [
    OrganizationsModule,
    IdentityModule,
    TypeOrmModule.forFeature([
      OrganizationMembershipEntity,
      ProductCategoryEntity,
      ProductEntity,
      ProductVariantEntity,
    ]),
  ],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    { provide: CATALOG_REPOSITORY, useClass: TypeOrmCatalogRepository },
    { provide: CATALOG_VARIANT_READER, useExisting: CATALOG_REPOSITORY },
  ],
  exports: [CATALOG_VARIANT_READER],
})
export class CatalogModule {}

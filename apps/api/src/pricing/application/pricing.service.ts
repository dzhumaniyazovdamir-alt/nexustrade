import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { OrganizationDto, VariantPriceDto } from '@nexustrade/contracts';
import {
  CATALOG_VARIANT_READER,
  type CatalogVariantReader,
} from '../../catalog/application/catalog.ports';
import { PRICING_REPOSITORY, type PricingRepository } from './pricing.ports';

@Injectable()
export class PricingService {
  constructor(
    @Inject(PRICING_REPOSITORY)
    private readonly repository: PricingRepository,
    @Inject(CATALOG_VARIANT_READER)
    private readonly variants: CatalogVariantReader,
  ) {}

  async getPrice(organizationId: string, variantId: string): Promise<VariantPriceDto> {
    await this.requireVariant(organizationId, variantId);
    const price = await this.repository.findPrice(organizationId, variantId);
    if (!price) {
      throw new NotFoundException({ code: 'PRICE_NOT_FOUND', message: 'Price not found' });
    }
    return price;
  }

  async setPrice(
    organizationId: string,
    variantId: string,
    amount: string,
    version?: number,
  ): Promise<VariantPriceDto> {
    const variant = await this.requireVariant(organizationId, variantId);
    if (variant.status === 'archived') {
      throw new ConflictException({
        code: 'VARIANT_ARCHIVED',
        message: 'Archived variant cannot be priced',
      });
    }
    const result = await this.repository.setPrice({ organizationId, variantId, amount, version });
    if (result === 'version-conflict') {
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: 'Price was changed by another request',
      });
    }
    return result;
  }

  async deletePrice(organizationId: string, variantId: string): Promise<void> {
    await this.requireVariant(organizationId, variantId);
    await this.repository.deletePrice(organizationId, variantId);
  }

  async updateCurrency(organizationId: string, currency: string): Promise<OrganizationDto> {
    if (await this.repository.hasPrices(organizationId)) {
      throw new ConflictException({
        code: 'CURRENCY_LOCKED_BY_PRICES',
        message: 'Currency cannot be changed after prices are created',
      });
    }
    const organization = await this.repository.updateOrganizationCurrency(organizationId, currency);
    if (!organization) {
      throw new NotFoundException({
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found',
      });
    }
    return organization;
  }

  private async requireVariant(organizationId: string, variantId: string) {
    const variant = await this.variants.findVariant(organizationId, variantId);
    if (!variant) {
      throw new NotFoundException({ code: 'VARIANT_NOT_FOUND', message: 'Variant not found' });
    }
    return variant;
  }
}

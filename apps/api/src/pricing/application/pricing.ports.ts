import type { OrganizationDto, VariantPriceDto } from '@nexustrade/contracts';

export const PRICING_REPOSITORY = Symbol('PRICING_REPOSITORY');
export const PRICING_STATE_READER = Symbol('PRICING_STATE_READER');

export interface PricingStateReader {
  hasPrices(organizationId: string): Promise<boolean>;
}

export interface PricingRepository extends PricingStateReader {
  findPrice(organizationId: string, variantId: string): Promise<VariantPriceDto | null>;
  setPrice(input: {
    organizationId: string;
    variantId: string;
    amount: string;
    version?: number;
  }): Promise<'version-conflict' | VariantPriceDto>;
  deletePrice(organizationId: string, variantId: string): Promise<void>;
  updateOrganizationCurrency(
    organizationId: string,
    currency: string,
  ): Promise<OrganizationDto | null>;
}

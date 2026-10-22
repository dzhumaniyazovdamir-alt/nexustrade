import type { CatalogVariantReader } from '../../catalog/application/catalog.ports';
import type { PricingRepository } from './pricing.ports';
import { PricingService } from './pricing.service';

describe('PricingService', () => {
  let repository: jest.Mocked<PricingRepository>;
  let variants: jest.Mocked<CatalogVariantReader>;
  let service: PricingService;

  beforeEach(() => {
    repository = {
      findPrice: jest.fn(),
      setPrice: jest.fn(),
      deletePrice: jest.fn(),
      hasPrices: jest.fn(),
      updateOrganizationCurrency: jest.fn(),
    };
    variants = { findVariant: jest.fn() };
    service = new PricingService(repository, variants);
  });

  it('does not allow pricing an archived variant', async () => {
    variants.findVariant.mockResolvedValue({
      id: 'variant-1',
      organizationId: 'organization-1',
      status: 'archived',
    });

    await expect(service.setPrice('organization-1', 'variant-1', '10.0000')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'VARIANT_ARCHIVED' }),
    });
    expect(repository.setPrice).not.toHaveBeenCalled();
  });

  it('locks currency after the first price', async () => {
    repository.hasPrices.mockResolvedValue(true);

    await expect(service.updateCurrency('organization-1', 'EUR')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'CURRENCY_LOCKED_BY_PRICES' }),
    });
    expect(repository.updateOrganizationCurrency).not.toHaveBeenCalled();
  });

  it('maps optimistic conflicts to a stable API error', async () => {
    variants.findVariant.mockResolvedValue({
      id: 'variant-1',
      organizationId: 'organization-1',
      status: 'active',
    });
    repository.setPrice.mockResolvedValue('version-conflict');

    await expect(
      service.setPrice('organization-1', 'variant-1', '10.0000', 2),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'VERSION_CONFLICT' }),
    });
  });
});

import { Injectable } from '@nestjs/common';
import type { OrganizationDto, VariantPriceDto } from '@nexustrade/contracts';
import { DataSource } from 'typeorm';
import { OrganizationEntity } from '../../organizations/infrastructure/organization.entity';
import type { PricingRepository } from '../application/pricing.ports';
import { VariantPriceEntity } from './variant-price.entity';

@Injectable()
export class TypeOrmPricingRepository implements PricingRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findPrice(organizationId: string, variantId: string): Promise<VariantPriceDto | null> {
    const price = await this.dataSource
      .getRepository(VariantPriceEntity)
      .findOneBy({ organizationId, variantId });
    if (!price) return null;
    const currency = await this.organizationCurrency(organizationId);
    return this.toDto(price, currency);
  }

  async setPrice(input: {
    organizationId: string;
    variantId: string;
    amount: string;
    version?: number;
  }): Promise<'version-conflict' | VariantPriceDto> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(VariantPriceEntity);
      const existing = await repository
        .createQueryBuilder('price')
        .setLock('pessimistic_write')
        .where('price.variant_id = :variantId AND price.organization_id = :organizationId', input)
        .getOne();
      if (existing) {
        if (input.version !== undefined && input.version !== existing.version) {
          return 'version-conflict';
        }
        if (existing.amount !== input.amount) {
          existing.amount = input.amount;
          await repository.save(existing);
        }
        return this.toDto(existing, await this.organizationCurrency(input.organizationId, manager));
      }
      if (input.version !== undefined) return 'version-conflict';
      const price = await repository.save(
        repository.create({
          organizationId: input.organizationId,
          variantId: input.variantId,
          amount: input.amount,
          version: 1,
        }),
      );
      return this.toDto(price, await this.organizationCurrency(input.organizationId, manager));
    });
  }

  async deletePrice(organizationId: string, variantId: string): Promise<void> {
    await this.dataSource.getRepository(VariantPriceEntity).delete({ organizationId, variantId });
  }

  hasPrices(organizationId: string): Promise<boolean> {
    return this.dataSource.getRepository(VariantPriceEntity).existsBy({ organizationId });
  }

  async updateOrganizationCurrency(
    organizationId: string,
    currency: string,
  ): Promise<OrganizationDto | null> {
    const repository = this.dataSource.getRepository(OrganizationEntity);
    const organization = await repository.findOneBy({ id: organizationId });
    if (!organization) return null;
    organization.defaultCurrency = currency;
    return this.toOrganizationDto(await repository.save(organization));
  }

  private async organizationCurrency(
    organizationId: string,
    source: Pick<DataSource, 'getRepository'> = this.dataSource,
  ): Promise<string> {
    const organization = await source
      .getRepository(OrganizationEntity)
      .findOneByOrFail({ id: organizationId });
    return organization.defaultCurrency;
  }

  private toDto(entity: VariantPriceEntity, currency: string): VariantPriceDto {
    return {
      variantId: entity.variantId,
      organizationId: entity.organizationId,
      amount: entity.amount,
      currency,
      version: entity.version,
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private toOrganizationDto(entity: OrganizationEntity): OrganizationDto {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      defaultCurrency: entity.defaultCurrency,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}

import { Injectable } from '@nestjs/common';
import type {
  CatalogStatus,
  CategoryDto,
  ProductDetailsDto,
  ProductSummaryDto,
  ProductVariantDto,
} from '@nexustrade/contracts';
import { DataSource, QueryFailedError } from 'typeorm';
import {
  type CatalogRepository,
  CatalogPersistenceConflict,
  type CatalogVariantReference,
  type ProductListQuery,
} from '../application/catalog.ports';
import { ProductCategoryEntity } from './product-category.entity';
import { ProductVariantEntity } from './product-variant.entity';
import { ProductEntity } from './product.entity';

@Injectable()
export class TypeOrmCatalogRepository implements CatalogRepository {
  constructor(private readonly dataSource: DataSource) {}

  async listCategories(organizationId: string): Promise<CategoryDto[]> {
    const entities = await this.dataSource
      .getRepository(ProductCategoryEntity)
      .find({ where: { organizationId }, order: { name: 'ASC' } });
    return entities.map((entity) => this.toCategoryDto(entity));
  }

  async findCategory(organizationId: string, categoryId: string): Promise<CategoryDto | null> {
    const entity = await this.dataSource
      .getRepository(ProductCategoryEntity)
      .findOneBy({ id: categoryId, organizationId });
    return entity ? this.toCategoryDto(entity) : null;
  }

  async createCategory(input: {
    organizationId: string;
    parentId: string | null;
    name: string;
    slug: string;
  }): Promise<CategoryDto> {
    const repository = this.dataSource.getRepository(ProductCategoryEntity);
    try {
      return this.toCategoryDto(await repository.save(repository.create(input)));
    } catch (error) {
      this.rethrowUnique(error, 'category-slug');
    }
  }

  async updateCategory(input: {
    organizationId: string;
    categoryId: string;
    parentId?: string | null;
    name?: string;
    slug?: string;
  }): Promise<CategoryDto | null> {
    const repository = this.dataSource.getRepository(ProductCategoryEntity);
    const entity = await repository.findOneBy({
      id: input.categoryId,
      organizationId: input.organizationId,
    });
    if (!entity) return null;
    if (input.parentId !== undefined) entity.parentId = input.parentId;
    if (input.name !== undefined) entity.name = input.name;
    if (input.slug !== undefined) entity.slug = input.slug;
    try {
      return this.toCategoryDto(await repository.save(entity));
    } catch (error) {
      this.rethrowUnique(error, 'category-slug');
    }
  }

  async categoryContains(
    organizationId: string,
    ancestorId: string,
    possibleDescendantId: string,
  ): Promise<boolean> {
    const rows = await this.dataSource.query<Array<{ found: boolean }>>(
      `
        WITH RECURSIVE descendants AS (
          SELECT id FROM product_categories
          WHERE organization_id = $1 AND parent_id = $2
          UNION ALL
          SELECT child.id FROM product_categories child
          INNER JOIN descendants parent ON child.parent_id = parent.id
          WHERE child.organization_id = $1
        )
        SELECT EXISTS(SELECT 1 FROM descendants WHERE id = $3) AS found
      `,
      [organizationId, ancestorId, possibleDescendantId],
    );
    return rows[0]?.found ?? false;
  }

  async deleteCategory(
    organizationId: string,
    categoryId: string,
  ): Promise<'deleted' | 'not-found' | 'not-empty'> {
    return this.dataSource.transaction(async (manager) => {
      const categoryRepository = manager.getRepository(ProductCategoryEntity);
      if (!(await categoryRepository.existsBy({ id: categoryId, organizationId }))) {
        return 'not-found';
      }
      const [children, products] = await Promise.all([
        categoryRepository.countBy({ organizationId, parentId: categoryId }),
        manager.getRepository(ProductEntity).countBy({ organizationId, categoryId }),
      ]);
      if (children > 0 || products > 0) return 'not-empty';
      await categoryRepository.delete({ id: categoryId, organizationId });
      return 'deleted';
    });
  }

  async listProducts(
    organizationId: string,
    query: ProductListQuery,
  ): Promise<{ products: ProductSummaryDto[]; total: number }> {
    const builder = this.dataSource
      .getRepository(ProductEntity)
      .createQueryBuilder('product')
      .where('product.organization_id = :organizationId', { organizationId });
    if (query.status) builder.andWhere('product.status = :status', { status: query.status });
    if (query.categoryId) {
      builder.andWhere('product.category_id = :categoryId', { categoryId: query.categoryId });
    }
    if (query.search) {
      builder.andWhere('LOWER(product.name) LIKE :search', {
        search: `%${query.search.toLowerCase()}%`,
      });
    }
    const total = await builder.getCount();
    const entities = await builder
      .orderBy('product.created_at', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getMany();
    const counts = entities.length
      ? await this.dataSource
          .getRepository(ProductVariantEntity)
          .createQueryBuilder('variant')
          .select('variant.product_id', 'productId')
          .addSelect('COUNT(*)::int', 'count')
          .where('variant.organization_id = :organizationId', { organizationId })
          .andWhere('variant.product_id IN (:...ids)', { ids: entities.map(({ id }) => id) })
          .groupBy('variant.product_id')
          .getRawMany<{ productId: string; count: number }>()
      : [];
    const countByProduct = new Map(counts.map((row) => [row.productId, Number(row.count)]));
    return {
      total,
      products: entities.map((entity) =>
        this.toProductSummaryDto(entity, countByProduct.get(entity.id) ?? 0),
      ),
    };
  }

  async findProduct(organizationId: string, productId: string): Promise<ProductDetailsDto | null> {
    const product = await this.dataSource
      .getRepository(ProductEntity)
      .findOneBy({ id: productId, organizationId });
    if (!product) return null;
    const variants = await this.dataSource
      .getRepository(ProductVariantEntity)
      .find({ where: { organizationId, productId }, order: { createdAt: 'ASC' } });
    return {
      ...this.toProductBaseDto(product),
      variants: variants.map((variant) => this.toVariantDto(variant)),
    };
  }

  async createProduct(input: {
    organizationId: string;
    categoryId: string | null;
    name: string;
    description: string | null;
  }): Promise<ProductDetailsDto> {
    const repository = this.dataSource.getRepository(ProductEntity);
    const entity = await repository.save(
      repository.create({ ...input, status: 'active', version: 1 }),
    );
    return { ...this.toProductBaseDto(entity), variants: [] };
  }

  async updateProduct(input: {
    organizationId: string;
    productId: string;
    categoryId?: string | null;
    name?: string;
    description?: string | null;
    status?: CatalogStatus;
    version: number;
  }): Promise<'not-found' | 'version-conflict' | ProductDetailsDto> {
    const changes = {
      ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId }),
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.status === undefined ? {} : { status: input.status }),
      version: () => '"version" + 1',
      updatedAt: () => 'now()',
    };
    const result = await this.dataSource
      .getRepository(ProductEntity)
      .createQueryBuilder()
      .update()
      .set(changes)
      .where('id = :productId AND organization_id = :organizationId AND version = :version', input)
      .execute();
    if (result.affected === 0) {
      return (await this.dataSource
        .getRepository(ProductEntity)
        .existsBy({ id: input.productId, organizationId: input.organizationId }))
        ? 'version-conflict'
        : 'not-found';
    }
    return (await this.findProduct(input.organizationId, input.productId)) ?? 'not-found';
  }

  async createVariant(input: {
    organizationId: string;
    productId: string;
    sku: string;
    name: string;
    attributes: Record<string, string>;
  }): Promise<ProductVariantDto> {
    const repository = this.dataSource.getRepository(ProductVariantEntity);
    try {
      const entity = await repository.save(
        repository.create({ ...input, status: 'active', version: 1 }),
      );
      return this.toVariantDto(entity);
    } catch (error) {
      this.rethrowUnique(error, 'sku');
    }
  }

  async updateVariant(input: {
    organizationId: string;
    variantId: string;
    sku?: string;
    name?: string;
    attributes?: Record<string, string>;
    status?: CatalogStatus;
    version: number;
  }): Promise<'not-found' | 'version-conflict' | ProductVariantDto> {
    const changes = {
      ...(input.sku === undefined ? {} : { sku: input.sku }),
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.attributes === undefined ? {} : { attributes: input.attributes }),
      ...(input.status === undefined ? {} : { status: input.status }),
      version: () => '"version" + 1',
      updatedAt: () => 'now()',
    };
    try {
      const result = await this.dataSource
        .getRepository(ProductVariantEntity)
        .createQueryBuilder()
        .update()
        .set(changes)
        .where(
          'id = :variantId AND organization_id = :organizationId AND version = :version',
          input,
        )
        .execute();
      if (result.affected === 0) {
        return (await this.dataSource
          .getRepository(ProductVariantEntity)
          .existsBy({ id: input.variantId, organizationId: input.organizationId }))
          ? 'version-conflict'
          : 'not-found';
      }
      const entity = await this.dataSource
        .getRepository(ProductVariantEntity)
        .findOneByOrFail({ id: input.variantId, organizationId: input.organizationId });
      return this.toVariantDto(entity);
    } catch (error) {
      this.rethrowUnique(error, 'sku');
    }
  }

  async findVariant(
    organizationId: string,
    variantId: string,
  ): Promise<CatalogVariantReference | null> {
    const variant = await this.dataSource
      .getRepository(ProductVariantEntity)
      .findOneBy({ id: variantId, organizationId });
    return variant
      ? { id: variant.id, organizationId: variant.organizationId, status: variant.status }
      : null;
  }

  private toCategoryDto(entity: ProductCategoryEntity): CategoryDto {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      parentId: entity.parentId,
      name: entity.name,
      slug: entity.slug,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private toProductBaseDto(entity: ProductEntity) {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      categoryId: entity.categoryId,
      name: entity.name,
      description: entity.description,
      status: entity.status,
      version: entity.version,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private toProductSummaryDto(entity: ProductEntity, variantCount: number): ProductSummaryDto {
    return { ...this.toProductBaseDto(entity), variantCount };
  }

  private toVariantDto(entity: ProductVariantEntity): ProductVariantDto {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      productId: entity.productId,
      sku: entity.sku,
      name: entity.name,
      attributes: entity.attributes,
      status: entity.status,
      version: entity.version,
      price: null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private rethrowUnique(error: unknown, kind: 'category-slug' | 'sku'): never {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === '23505'
    ) {
      throw new CatalogPersistenceConflict(kind);
    }
    throw error;
  }
}

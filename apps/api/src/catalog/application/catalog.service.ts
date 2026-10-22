import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CatalogStatus,
  CategoryDto,
  ProductDetailsDto,
  ProductVariantDto,
} from '@nexustrade/contracts';
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
  CatalogPersistenceConflict,
  type ProductListQuery,
} from './catalog.ports';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly repository: CatalogRepository,
  ) {}

  listCategories(organizationId: string): Promise<CategoryDto[]> {
    return this.repository.listCategories(organizationId);
  }

  async createCategory(
    organizationId: string,
    input: { name: string; parentId?: string | null },
  ): Promise<CategoryDto> {
    const parentId = input.parentId ?? null;
    if (parentId) await this.requireCategory(organizationId, parentId);
    try {
      return await this.repository.createCategory({
        organizationId,
        parentId,
        name: input.name,
        slug: this.slugify(input.name),
      });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async updateCategory(
    organizationId: string,
    categoryId: string,
    input: { name?: string; parentId?: string | null },
  ): Promise<CategoryDto> {
    await this.requireCategory(organizationId, categoryId);
    if (input.parentId === categoryId) {
      throw this.invalidCategoryParent();
    }
    if (input.parentId) {
      await this.requireCategory(organizationId, input.parentId);
      if (await this.repository.categoryContains(organizationId, categoryId, input.parentId)) {
        throw this.invalidCategoryParent();
      }
    }
    try {
      const category = await this.repository.updateCategory({
        organizationId,
        categoryId,
        ...input,
        ...(input.name === undefined ? {} : { slug: this.slugify(input.name) }),
      });
      if (!category) throw this.categoryNotFound();
      return category;
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async deleteCategory(organizationId: string, categoryId: string): Promise<void> {
    const result = await this.repository.deleteCategory(organizationId, categoryId);
    if (result === 'not-found') throw this.categoryNotFound();
    if (result === 'not-empty') {
      throw new ConflictException({
        code: 'CATEGORY_NOT_EMPTY',
        message: 'Category contains products or child categories',
      });
    }
  }

  async listProducts(organizationId: string, query: ProductListQuery) {
    const result = await this.repository.listProducts(organizationId, query);
    return { ...result, page: query.page, pageSize: query.pageSize };
  }

  async getProduct(organizationId: string, productId: string): Promise<ProductDetailsDto> {
    const product = await this.repository.findProduct(organizationId, productId);
    if (!product) throw this.productNotFound();
    return product;
  }

  async createProduct(
    organizationId: string,
    input: { name: string; description?: string | null; categoryId?: string | null },
  ): Promise<ProductDetailsDto> {
    const categoryId = input.categoryId ?? null;
    if (categoryId) await this.requireCategory(organizationId, categoryId);
    return this.repository.createProduct({
      organizationId,
      categoryId,
      name: input.name,
      description: input.description ?? null,
    });
  }

  async updateProduct(
    organizationId: string,
    productId: string,
    input: {
      name?: string;
      description?: string | null;
      categoryId?: string | null;
      status?: CatalogStatus;
      version: number;
    },
  ): Promise<ProductDetailsDto> {
    if (input.categoryId) await this.requireCategory(organizationId, input.categoryId);
    const result = await this.repository.updateProduct({ organizationId, productId, ...input });
    if (result === 'not-found') throw this.productNotFound();
    if (result === 'version-conflict') throw this.versionConflict();
    return result;
  }

  async createVariant(
    organizationId: string,
    productId: string,
    input: { sku: string; name: string; attributes?: Record<string, string> },
  ): Promise<ProductVariantDto> {
    const product = await this.getProduct(organizationId, productId);
    if (product.status === 'archived') {
      throw new ConflictException({
        code: 'PRODUCT_ARCHIVED',
        message: 'Archived product cannot receive active variants',
      });
    }
    try {
      return await this.repository.createVariant({
        organizationId,
        productId,
        sku: this.normalizeSku(input.sku),
        name: input.name,
        attributes: input.attributes ?? {},
      });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async updateVariant(
    organizationId: string,
    variantId: string,
    input: {
      sku?: string;
      name?: string;
      attributes?: Record<string, string>;
      status?: CatalogStatus;
      version: number;
    },
  ): Promise<ProductVariantDto> {
    try {
      const result = await this.repository.updateVariant({
        organizationId,
        variantId,
        ...input,
        ...(input.sku === undefined ? {} : { sku: this.normalizeSku(input.sku) }),
      });
      if (result === 'not-found') throw this.variantNotFound();
      if (result === 'version-conflict') throw this.versionConflict();
      return result;
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  private async requireCategory(organizationId: string, categoryId: string): Promise<void> {
    if (!(await this.repository.findCategory(organizationId, categoryId))) {
      throw this.categoryNotFound();
    }
  }

  private rethrowConflict(error: unknown): never {
    if (error instanceof CatalogPersistenceConflict) {
      throw new ConflictException({
        code: error.kind === 'sku' ? 'SKU_ALREADY_EXISTS' : 'CATEGORY_SLUG_ALREADY_EXISTS',
        message:
          error.kind === 'sku'
            ? 'SKU already exists in this organization'
            : 'Category name already exists at this level',
      });
    }
    throw error;
  }

  private slugify(value: string): string {
    return (
      value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
        .replace(/^-|-$/g, '') || 'category'
    );
  }

  private normalizeSku(value: string): string {
    return value.trim().toUpperCase();
  }

  private categoryNotFound(): NotFoundException {
    return new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'Category not found' });
  }

  private productNotFound(): NotFoundException {
    return new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
  }

  private variantNotFound(): NotFoundException {
    return new NotFoundException({ code: 'VARIANT_NOT_FOUND', message: 'Variant not found' });
  }

  private invalidCategoryParent(): BadRequestException {
    return new BadRequestException({
      code: 'INVALID_CATEGORY_PARENT',
      message: 'Category parent would create a cycle',
    });
  }

  private versionConflict(): ConflictException {
    return new ConflictException({
      code: 'VERSION_CONFLICT',
      message: 'Resource was changed by another request',
    });
  }
}

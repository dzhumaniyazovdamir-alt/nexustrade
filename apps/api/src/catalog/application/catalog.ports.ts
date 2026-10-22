import type {
  CatalogStatus,
  CategoryDto,
  ProductDetailsDto,
  ProductSummaryDto,
  ProductVariantDto,
} from '@nexustrade/contracts';

export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');
export const CATALOG_VARIANT_READER = Symbol('CATALOG_VARIANT_READER');

export interface ProductListQuery {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: string;
  status?: CatalogStatus;
}

export interface CatalogVariantReference {
  id: string;
  organizationId: string;
  status: CatalogStatus;
}

export interface CatalogVariantReader {
  findVariant(organizationId: string, variantId: string): Promise<CatalogVariantReference | null>;
}

export class CatalogPersistenceConflict extends Error {
  constructor(readonly kind: 'category-slug' | 'sku') {
    super(kind);
  }
}

export interface CatalogRepository extends CatalogVariantReader {
  listCategories(organizationId: string): Promise<CategoryDto[]>;
  findCategory(organizationId: string, categoryId: string): Promise<CategoryDto | null>;
  createCategory(input: {
    organizationId: string;
    parentId: string | null;
    name: string;
    slug: string;
  }): Promise<CategoryDto>;
  updateCategory(input: {
    organizationId: string;
    categoryId: string;
    parentId?: string | null;
    name?: string;
    slug?: string;
  }): Promise<CategoryDto | null>;
  categoryContains(
    organizationId: string,
    ancestorId: string,
    possibleDescendantId: string,
  ): Promise<boolean>;
  deleteCategory(
    organizationId: string,
    categoryId: string,
  ): Promise<'deleted' | 'not-found' | 'not-empty'>;
  listProducts(
    organizationId: string,
    query: ProductListQuery,
  ): Promise<{ products: ProductSummaryDto[]; total: number }>;
  findProduct(organizationId: string, productId: string): Promise<ProductDetailsDto | null>;
  createProduct(input: {
    organizationId: string;
    categoryId: string | null;
    name: string;
    description: string | null;
  }): Promise<ProductDetailsDto>;
  updateProduct(input: {
    organizationId: string;
    productId: string;
    categoryId?: string | null;
    name?: string;
    description?: string | null;
    status?: CatalogStatus;
    version: number;
  }): Promise<'not-found' | 'version-conflict' | ProductDetailsDto>;
  createVariant(input: {
    organizationId: string;
    productId: string;
    sku: string;
    name: string;
    attributes: Record<string, string>;
  }): Promise<ProductVariantDto>;
  updateVariant(input: {
    organizationId: string;
    variantId: string;
    sku?: string;
    name?: string;
    attributes?: Record<string, string>;
    status?: CatalogStatus;
    version: number;
  }): Promise<'not-found' | 'version-conflict' | ProductVariantDto>;
}

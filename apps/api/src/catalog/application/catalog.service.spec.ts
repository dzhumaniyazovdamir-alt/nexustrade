import type { CatalogRepository } from './catalog.ports';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  let repository: jest.Mocked<CatalogRepository>;
  let service: CatalogService;

  beforeEach(() => {
    repository = {
      listCategories: jest.fn(),
      findCategory: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      categoryContains: jest.fn(),
      deleteCategory: jest.fn(),
      listProducts: jest.fn(),
      findProduct: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      createVariant: jest.fn(),
      updateVariant: jest.fn(),
      findVariant: jest.fn(),
    };
    service = new CatalogService(repository);
  });

  it('rejects a category cycle', async () => {
    repository.findCategory.mockResolvedValue({
      id: 'category-1',
      organizationId: 'organization-1',
      parentId: null,
      name: 'Category',
      slug: 'category',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    repository.categoryContains.mockResolvedValue(true);

    await expect(
      service.updateCategory('organization-1', 'category-1', { parentId: 'category-2' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_CATEGORY_PARENT' }),
    });
  });

  it('does not add an active variant to an archived product', async () => {
    repository.findProduct.mockResolvedValue({
      id: 'product-1',
      organizationId: 'organization-1',
      categoryId: null,
      name: 'Archived',
      description: null,
      status: 'archived',
      version: 2,
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await expect(
      service.createVariant('organization-1', 'product-1', {
        sku: 'SKU',
        name: 'Variant',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PRODUCT_ARCHIVED' }),
    });
  });
});

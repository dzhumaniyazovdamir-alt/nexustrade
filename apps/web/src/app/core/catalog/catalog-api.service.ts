import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  CategoriesResponse,
  CategoryResponse,
  CreateCategoryRequest,
  CreateProductRequest,
  CreateProductVariantRequest,
  ProductResponse,
  ProductsResponse,
  ProductVariantResponse,
  UpdateCategoryRequest,
  UpdateProductRequest,
  UpdateProductVariantRequest,
} from '@nexustrade/contracts';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);

  categories(organizationId: string) {
    return this.http.get<CategoriesResponse>(`/api/v1/organizations/${organizationId}/categories`);
  }

  createCategory(organizationId: string, body: CreateCategoryRequest) {
    return this.http.post<CategoryResponse>(
      `/api/v1/organizations/${organizationId}/categories`,
      body,
    );
  }

  updateCategory(organizationId: string, categoryId: string, body: UpdateCategoryRequest) {
    return this.http.patch<CategoryResponse>(
      `/api/v1/organizations/${organizationId}/categories/${categoryId}`,
      body,
    );
  }

  deleteCategory(organizationId: string, categoryId: string) {
    return this.http.delete<void>(
      `/api/v1/organizations/${organizationId}/categories/${categoryId}`,
    );
  }

  products(
    organizationId: string,
    query: {
      page?: number;
      pageSize?: number;
      search?: string;
      categoryId?: string;
      status?: string;
    } = {},
  ) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<ProductsResponse>(`/api/v1/organizations/${organizationId}/products`, {
      params,
    });
  }

  product(organizationId: string, productId: string) {
    return this.http.get<ProductResponse>(
      `/api/v1/organizations/${organizationId}/products/${productId}`,
    );
  }

  createProduct(organizationId: string, body: CreateProductRequest) {
    return this.http.post<ProductResponse>(
      `/api/v1/organizations/${organizationId}/products`,
      body,
    );
  }

  updateProduct(organizationId: string, productId: string, body: UpdateProductRequest) {
    return this.http.patch<ProductResponse>(
      `/api/v1/organizations/${organizationId}/products/${productId}`,
      body,
    );
  }

  createVariant(organizationId: string, productId: string, body: CreateProductVariantRequest) {
    return this.http.post<ProductVariantResponse>(
      `/api/v1/organizations/${organizationId}/products/${productId}/variants`,
      body,
    );
  }

  updateVariant(organizationId: string, variantId: string, body: UpdateProductVariantRequest) {
    return this.http.patch<ProductVariantResponse>(
      `/api/v1/organizations/${organizationId}/variants/${variantId}`,
      body,
    );
  }
}

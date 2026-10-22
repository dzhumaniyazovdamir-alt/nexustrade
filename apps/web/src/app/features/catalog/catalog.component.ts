import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import type {
  ApiErrorResponse,
  CategoryDto,
  ProductDetailsDto,
  ProductSummaryDto,
  VariantPriceDto,
} from '@nexustrade/contracts';
import { firstValueFrom } from 'rxjs';
import { CatalogApiService } from '../../core/catalog/catalog-api.service';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { OrganizationContextService } from '../../core/organizations/organization-context.service';
import { PricingApiService } from '../../core/pricing/pricing-api.service';

@Component({
  selector: 'app-catalog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogComponent implements OnInit {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly pricingApi = inject(PricingApiService);
  private readonly auth = inject(AuthSessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly organizationContext = inject(OrganizationContextService);

  readonly categories = signal<CategoryDto[]>([]);
  readonly products = signal<ProductSummaryDto[]>([]);
  readonly selectedProduct = signal<ProductDetailsDto | null>(null);
  readonly selectedPrice = signal<VariantPriceDto | null>(null);
  readonly selectedVariantId = signal<string | null>(null);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly searchForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    categoryId: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
  });
  readonly categoryForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    parentId: new FormControl('', { nonNullable: true }),
  });
  readonly categoryRenameForm = new FormGroup({
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly productForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    categoryId: new FormControl('', { nonNullable: true }),
  });
  readonly variantForm = new FormGroup({
    sku: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    attributes: new FormControl('{}', { nonNullable: true }),
  });
  readonly productEditForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    categoryId: new FormControl('', { nonNullable: true }),
  });
  readonly priceForm = new FormGroup({
    amount: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{1,15}(\.\d{1,4})?$/)],
    }),
  });
  readonly currencyForm = new FormGroup({
    currency: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Z]{3}$/)],
    }),
  });

  async ngOnInit(): Promise<void> {
    const organizationId = this.route.snapshot.paramMap.get('organizationId');
    if (!organizationId || !this.organizationContext.select(organizationId)) {
      await this.router.navigateByUrl('/organizations');
      return;
    }
    this.currencyForm.setValue({
      currency: this.organizationContext.activeOrganization()?.defaultCurrency ?? 'USD',
    });
    await Promise.all([this.reloadCategories(), this.reloadProducts()]);
  }

  async reloadProducts(page = this.page()): Promise<void> {
    const organizationId = this.organizationId();
    if (!organizationId) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const filters = this.searchForm.getRawValue();
      const response = await firstValueFrom(
        this.catalogApi.products(organizationId, {
          page,
          pageSize: 20,
          search: filters.search || undefined,
          categoryId: filters.categoryId || undefined,
          status: filters.status || undefined,
        }),
      );
      this.products.set(response.products);
      this.total.set(response.total);
      this.page.set(response.page);
    } catch (error) {
      this.setError(error);
    } finally {
      this.loading.set(false);
    }
  }

  async reloadCategories(): Promise<void> {
    const organizationId = this.organizationId();
    if (!organizationId) return;
    try {
      const response = await firstValueFrom(this.catalogApi.categories(organizationId));
      this.categories.set(response.categories);
    } catch (error) {
      this.setError(error);
    }
  }

  async createCategory(): Promise<void> {
    const organizationId = this.organizationId();
    if (!organizationId || this.categoryForm.invalid || !this.organizationContext.canManage())
      return;
    const value = this.categoryForm.getRawValue();
    try {
      await firstValueFrom(
        this.catalogApi.createCategory(organizationId, {
          name: value.name,
          parentId: value.parentId || null,
        }),
      );
      this.categoryForm.reset({ name: '', parentId: '' });
      await this.reloadCategories();
    } catch (error) {
      this.setError(error);
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const organizationId = this.organizationId();
    if (!organizationId || !this.organizationContext.canManage()) return;
    try {
      await firstValueFrom(this.catalogApi.deleteCategory(organizationId, categoryId));
      await this.reloadCategories();
    } catch (error) {
      this.setError(error);
    }
  }

  async renameCategory(): Promise<void> {
    const organizationId = this.organizationId();
    if (!organizationId || this.categoryRenameForm.invalid || !this.organizationContext.canManage())
      return;
    const value = this.categoryRenameForm.getRawValue();
    try {
      await firstValueFrom(
        this.catalogApi.updateCategory(organizationId, value.categoryId, { name: value.name }),
      );
      this.categoryRenameForm.reset({ categoryId: '', name: '' });
      await this.reloadCategories();
    } catch (error) {
      this.setError(error);
    }
  }

  async createProduct(): Promise<void> {
    const organizationId = this.organizationId();
    if (!organizationId || this.productForm.invalid || !this.organizationContext.canManage())
      return;
    const value = this.productForm.getRawValue();
    try {
      const response = await firstValueFrom(
        this.catalogApi.createProduct(organizationId, {
          name: value.name,
          description: value.description || null,
          categoryId: value.categoryId || null,
        }),
      );
      this.productForm.reset({ name: '', description: '', categoryId: '' });
      await this.reloadProducts(1);
      await this.selectProduct(response.product.id);
    } catch (error) {
      this.setError(error);
    }
  }

  async selectProduct(productId: string): Promise<void> {
    const organizationId = this.organizationId();
    if (!organizationId) return;
    try {
      const response = await firstValueFrom(this.catalogApi.product(organizationId, productId));
      this.selectedProduct.set(response.product);
      this.productEditForm.setValue({
        name: response.product.name,
        description: response.product.description ?? '',
        categoryId: response.product.categoryId ?? '',
      });
      this.selectedVariantId.set(null);
      this.selectedPrice.set(null);
    } catch (error) {
      this.setError(error);
    }
  }

  async updateProduct(): Promise<void> {
    const organizationId = this.organizationId();
    const product = this.selectedProduct();
    if (
      !organizationId ||
      !product ||
      this.productEditForm.invalid ||
      !this.organizationContext.canManage()
    )
      return;
    const value = this.productEditForm.getRawValue();
    try {
      const response = await firstValueFrom(
        this.catalogApi.updateProduct(organizationId, product.id, {
          name: value.name,
          description: value.description || null,
          categoryId: value.categoryId || null,
          version: product.version,
        }),
      );
      this.selectedProduct.set(response.product);
      await this.reloadProducts();
    } catch (error) {
      this.setError(error);
    }
  }

  async archiveProduct(): Promise<void> {
    const organizationId = this.organizationId();
    const product = this.selectedProduct();
    if (!organizationId || !product || !this.organizationContext.canManage()) return;
    try {
      const response = await firstValueFrom(
        this.catalogApi.updateProduct(organizationId, product.id, {
          status: product.status === 'active' ? 'archived' : 'active',
          version: product.version,
        }),
      );
      this.selectedProduct.set(response.product);
      await this.reloadProducts();
    } catch (error) {
      this.setError(error);
    }
  }

  async createVariant(): Promise<void> {
    const organizationId = this.organizationId();
    const product = this.selectedProduct();
    if (
      !organizationId ||
      !product ||
      this.variantForm.invalid ||
      !this.organizationContext.canManage()
    )
      return;
    try {
      const attributes = JSON.parse(this.variantForm.controls.attributes.value) as Record<
        string,
        string
      >;
      await firstValueFrom(
        this.catalogApi.createVariant(organizationId, product.id, {
          sku: this.variantForm.controls.sku.value,
          name: this.variantForm.controls.name.value,
          attributes,
        }),
      );
      this.variantForm.reset({ sku: '', name: '', attributes: '{}' });
      await this.selectProduct(product.id);
      await this.reloadProducts();
    } catch (error) {
      this.setError(
        error instanceof SyntaxError ? new Error('Некорректный JSON атрибутов') : error,
      );
    }
  }

  async archiveVariant(variantId: string): Promise<void> {
    const organizationId = this.organizationId();
    const product = this.selectedProduct();
    const variant = product?.variants.find(({ id }) => id === variantId);
    if (!organizationId || !product || !variant || !this.organizationContext.canManage()) return;
    try {
      await firstValueFrom(
        this.catalogApi.updateVariant(organizationId, variantId, {
          status: variant.status === 'active' ? 'archived' : 'active',
          version: variant.version,
        }),
      );
      await this.selectProduct(product.id);
    } catch (error) {
      this.setError(error);
    }
  }

  async selectVariant(variantId: string): Promise<void> {
    const organizationId = this.organizationId();
    if (!organizationId) return;
    this.selectedVariantId.set(variantId);
    try {
      const response = await firstValueFrom(this.pricingApi.get(organizationId, variantId));
      this.selectedPrice.set(response.price);
      this.priceForm.setValue({ amount: response.price.amount });
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.selectedPrice.set(null);
        this.priceForm.reset({ amount: '' });
      } else {
        this.setError(error);
      }
    }
  }

  async setPrice(): Promise<void> {
    const organizationId = this.organizationId();
    const variantId = this.selectedVariantId();
    if (
      !organizationId ||
      !variantId ||
      this.priceForm.invalid ||
      !this.organizationContext.canManage()
    )
      return;
    try {
      const response = await firstValueFrom(
        this.pricingApi.set(organizationId, variantId, {
          amount: this.priceForm.controls.amount.value,
          version: this.selectedPrice()?.version,
        }),
      );
      this.selectedPrice.set(response.price);
    } catch (error) {
      this.setError(error);
    }
  }

  async deletePrice(): Promise<void> {
    const organizationId = this.organizationId();
    const variantId = this.selectedVariantId();
    if (!organizationId || !variantId || !this.organizationContext.canManage()) return;
    try {
      await firstValueFrom(this.pricingApi.delete(organizationId, variantId));
      this.selectedPrice.set(null);
      this.priceForm.reset({ amount: '' });
    } catch (error) {
      this.setError(error);
    }
  }

  async updateCurrency(): Promise<void> {
    const organizationId = this.organizationId();
    if (!organizationId || this.currencyForm.invalid || !this.organizationContext.canManage())
      return;
    try {
      await firstValueFrom(
        this.pricingApi.updateCurrency(organizationId, this.currencyForm.getRawValue()),
      );
      await firstValueFrom(this.auth.refreshSession());
    } catch (error) {
      this.setError(error);
    }
  }

  private organizationId(): string | null {
    return this.organizationContext.activeOrganizationId();
  }

  private setError(error: unknown): void {
    this.error.set(
      error instanceof HttpErrorResponse
        ? ((error.error as ApiErrorResponse | undefined)?.error?.message ?? 'Операция не выполнена')
        : error instanceof Error
          ? error.message
          : 'Операция не выполнена',
    );
  }
}

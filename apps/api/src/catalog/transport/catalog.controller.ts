import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  CategoriesResponse,
  CategoryResponse,
  ProductResponse,
  ProductsResponse,
  ProductVariantResponse,
} from '@nexustrade/contracts';
import { AccessTokenGuard } from '../../common/auth/access-token.guard';
import { CatalogService } from '../application/catalog.service';
import { OrganizationAccessGuard } from '../../organizations/transport/organization-access.guard';
import { OrganizationRoles } from '../../organizations/transport/organization-roles.decorator';
import {
  CreateCategoryDto,
  CreateProductDto,
  CreateProductVariantDto,
  ProductListQueryDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateProductVariantDto,
} from './catalog.dto';

@Controller({ path: 'organizations/:organizationId', version: '1' })
@UseGuards(AccessTokenGuard, OrganizationAccessGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  async listCategories(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<CategoriesResponse> {
    return { categories: await this.catalogService.listCategories(organizationId) };
  }

  @Post('categories')
  @OrganizationRoles('owner', 'admin')
  async createCategory(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() body: CreateCategoryDto,
  ): Promise<CategoryResponse> {
    return { category: await this.catalogService.createCategory(organizationId, body) };
  }

  @Patch('categories/:categoryId')
  @OrganizationRoles('owner', 'admin')
  async updateCategory(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() body: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
    return {
      category: await this.catalogService.updateCategory(organizationId, categoryId, body),
    };
  }

  @Delete('categories/:categoryId')
  @OrganizationRoles('owner', 'admin')
  @HttpCode(204)
  async deleteCategory(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<void> {
    await this.catalogService.deleteCategory(organizationId, categoryId);
  }

  @Get('products')
  async listProducts(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: ProductListQueryDto,
  ): Promise<ProductsResponse> {
    return this.catalogService.listProducts(organizationId, query);
  }

  @Post('products')
  @OrganizationRoles('owner', 'admin')
  async createProduct(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() body: CreateProductDto,
  ): Promise<ProductResponse> {
    return { product: await this.catalogService.createProduct(organizationId, body) };
  }

  @Get('products/:productId')
  async getProduct(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<ProductResponse> {
    return { product: await this.catalogService.getProduct(organizationId, productId) };
  }

  @Patch('products/:productId')
  @OrganizationRoles('owner', 'admin')
  async updateProduct(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: UpdateProductDto,
  ): Promise<ProductResponse> {
    return {
      product: await this.catalogService.updateProduct(organizationId, productId, body),
    };
  }

  @Post('products/:productId/variants')
  @OrganizationRoles('owner', 'admin')
  async createVariant(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: CreateProductVariantDto,
  ): Promise<ProductVariantResponse> {
    return {
      variant: await this.catalogService.createVariant(organizationId, productId, body),
    };
  }

  @Patch('variants/:variantId')
  @OrganizationRoles('owner', 'admin')
  async updateVariant(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() body: UpdateProductVariantDto,
  ): Promise<ProductVariantResponse> {
    return {
      variant: await this.catalogService.updateVariant(organizationId, variantId, body),
    };
  }
}

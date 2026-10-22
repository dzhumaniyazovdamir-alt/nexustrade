import type {
  CatalogStatus,
  CreateCategoryRequest,
  CreateProductRequest,
  CreateProductVariantRequest,
  UpdateCategoryRequest,
  UpdateProductRequest,
  UpdateProductVariantRequest,
} from '@nexustrade/contracts';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const normalizeNullable = ({ value }: { value: unknown }) => (value === '' ? null : value);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCategoryDto implements CreateCategoryRequest {
  @IsString()
  @Length(1, 120)
  @Transform(trim)
  name!: string;

  @IsOptional()
  @Transform(normalizeNullable)
  @IsUUID()
  parentId?: string | null;
}

export class UpdateCategoryDto implements UpdateCategoryRequest {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  @Transform(trim)
  name?: string;

  @IsOptional()
  @Transform(normalizeNullable)
  @IsUUID()
  parentId?: string | null;
}

export class CreateProductDto implements CreateProductRequest {
  @IsString()
  @Length(1, 180)
  @Transform(trim)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  @Transform(trim)
  description?: string | null;

  @IsOptional()
  @Transform(normalizeNullable)
  @IsUUID()
  categoryId?: string | null;
}

export class UpdateProductDto implements UpdateProductRequest {
  @IsOptional()
  @IsString()
  @Length(1, 180)
  @Transform(trim)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  @Transform(trim)
  description?: string | null;

  @IsOptional()
  @Transform(normalizeNullable)
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: CatalogStatus;

  @IsInt()
  @Min(1)
  version!: number;
}

export class CreateProductVariantDto implements CreateProductVariantRequest {
  @IsString()
  @Length(1, 80)
  @Transform(trim)
  sku!: string;

  @IsString()
  @Length(1, 180)
  @Transform(trim)
  name!: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;
}

export class UpdateProductVariantDto implements UpdateProductVariantRequest {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  @Transform(trim)
  sku?: string;

  @IsOptional()
  @IsString()
  @Length(1, 180)
  @Transform(trim)
  name?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: CatalogStatus;

  @IsInt()
  @Min(1)
  version!: number;
}

export class ProductListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Transform(trim)
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: CatalogStatus;
}

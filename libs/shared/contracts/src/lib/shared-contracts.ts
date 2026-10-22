export type HealthStatus = 'ok' | 'error';

export interface HealthCheck {
  status: HealthStatus;
}

export interface HealthResponse {
  status: HealthStatus;
  service: 'nexustrade-api';
  timestamp: string;
  checks?: {
    database: HealthCheck;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    correlationId: string;
    details?: unknown;
  };
}

export const organizationRoles = ['owner', 'admin', 'member'] as const;
export type OrganizationRole = (typeof organizationRoles)[number];

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
}

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  defaultCurrency: string;
  createdAt: string;
}

export interface MembershipDto {
  user: UserDto;
  organizationId: string;
  role: OrganizationRole;
  createdAt: string;
}

export interface SessionDto {
  user: UserDto;
  memberships: Array<{
    organization: OrganizationDto;
    role: OrganizationRole;
  }>;
}

export interface SessionResponse {
  session: SessionDto | null;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  organizationName: string;
  defaultCurrency?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  session: SessionDto;
}

export interface CreateOrganizationRequest {
  name: string;
  defaultCurrency?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  defaultCurrency?: string;
}

export interface OrganizationsResponse {
  organizations: Array<OrganizationDto & { role: OrganizationRole }>;
}

export interface OrganizationResponse {
  organization: OrganizationDto;
}

export interface MembershipsResponse {
  memberships: MembershipDto[];
}

export interface ChangeMembershipRoleRequest {
  role: OrganizationRole;
}

export interface CreateInvitationRequest {
  email: string;
  role: Exclude<OrganizationRole, 'owner'>;
}

export interface InvitationDto {
  id: string;
  organizationId: string;
  email: string;
  role: Exclude<OrganizationRole, 'owner'>;
  expiresAt: string;
}

export interface CreateInvitationResponse {
  invitation: InvitationDto;
  token: string;
}

export interface InvitationsResponse {
  invitations: InvitationDto[];
}

export interface AcceptInvitationRequest {
  token: string;
}

export const catalogStatuses = ['active', 'archived'] as const;
export type CatalogStatus = (typeof catalogStatuses)[number];

export interface CategoryDto {
  id: string;
  organizationId: string;
  parentId: string | null;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface VariantPriceDto {
  variantId: string;
  organizationId: string;
  amount: string;
  currency: string;
  version: number;
  updatedAt: string;
}

export interface ProductVariantDto {
  id: string;
  organizationId: string;
  productId: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  status: CatalogStatus;
  version: number;
  price: VariantPriceDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSummaryDto {
  id: string;
  organizationId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  status: CatalogStatus;
  version: number;
  variantCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetailsDto extends Omit<ProductSummaryDto, 'variantCount'> {
  variants: ProductVariantDto[];
}

export interface CreateCategoryRequest {
  name: string;
  parentId?: string | null;
}

export interface UpdateCategoryRequest {
  name?: string;
  parentId?: string | null;
}

export interface CreateProductRequest {
  name: string;
  description?: string | null;
  categoryId?: string | null;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string | null;
  categoryId?: string | null;
  status?: CatalogStatus;
  version: number;
}

export interface CreateProductVariantRequest {
  sku: string;
  name: string;
  attributes?: Record<string, string>;
}

export interface UpdateProductVariantRequest {
  sku?: string;
  name?: string;
  attributes?: Record<string, string>;
  status?: CatalogStatus;
  version: number;
}

export interface SetVariantPriceRequest {
  amount: string;
  version?: number;
}

export interface UpdatePricingCurrencyRequest {
  currency: string;
}

export interface CategoriesResponse {
  categories: CategoryDto[];
}

export interface CategoryResponse {
  category: CategoryDto;
}

export interface ProductsResponse {
  products: ProductSummaryDto[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ProductResponse {
  product: ProductDetailsDto;
}

export interface ProductVariantResponse {
  variant: ProductVariantDto;
}

export interface VariantPriceResponse {
  price: VariantPriceDto;
}

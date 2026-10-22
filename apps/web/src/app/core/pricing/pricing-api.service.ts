import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  OrganizationResponse,
  SetVariantPriceRequest,
  UpdatePricingCurrencyRequest,
  VariantPriceResponse,
} from '@nexustrade/contracts';

@Injectable({ providedIn: 'root' })
export class PricingApiService {
  private readonly http = inject(HttpClient);

  get(organizationId: string, variantId: string) {
    return this.http.get<VariantPriceResponse>(
      `/api/v1/organizations/${organizationId}/variants/${variantId}/price`,
    );
  }

  set(organizationId: string, variantId: string, body: SetVariantPriceRequest) {
    return this.http.put<VariantPriceResponse>(
      `/api/v1/organizations/${organizationId}/variants/${variantId}/price`,
      body,
    );
  }

  delete(organizationId: string, variantId: string) {
    return this.http.delete<void>(
      `/api/v1/organizations/${organizationId}/variants/${variantId}/price`,
    );
  }

  updateCurrency(organizationId: string, body: UpdatePricingCurrencyRequest) {
    return this.http.patch<OrganizationResponse>(
      `/api/v1/organizations/${organizationId}/pricing-settings/currency`,
      body,
    );
  }
}

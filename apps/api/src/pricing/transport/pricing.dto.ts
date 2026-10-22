import type { SetVariantPriceRequest, UpdatePricingCurrencyRequest } from '@nexustrade/contracts';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Matches, Min } from 'class-validator';

export class SetVariantPriceDto implements SetVariantPriceRequest {
  @Matches(/^(0|[1-9]\d{0,14})(\.\d{1,4})?$/, {
    message: 'amount must be a non-negative decimal with at most 4 fractional digits',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  amount!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}

export class UpdatePricingCurrencyDto implements UpdatePricingCurrencyRequest {
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be an ISO 4217 code' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  currency!: string;
}

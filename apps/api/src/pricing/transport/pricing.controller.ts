import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import type { OrganizationResponse, VariantPriceResponse } from '@nexustrade/contracts';
import { AccessTokenGuard } from '../../common/auth/access-token.guard';
import { OrganizationAccessGuard } from '../../organizations/transport/organization-access.guard';
import { OrganizationRoles } from '../../organizations/transport/organization-roles.decorator';
import { PricingService } from '../application/pricing.service';
import { SetVariantPriceDto, UpdatePricingCurrencyDto } from './pricing.dto';

@Controller({ path: 'organizations/:organizationId', version: '1' })
@UseGuards(AccessTokenGuard, OrganizationAccessGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('variants/:variantId/price')
  async getPrice(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ): Promise<VariantPriceResponse> {
    return { price: await this.pricingService.getPrice(organizationId, variantId) };
  }

  @Put('variants/:variantId/price')
  @OrganizationRoles('owner', 'admin')
  async setPrice(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() body: SetVariantPriceDto,
  ): Promise<VariantPriceResponse> {
    return {
      price: await this.pricingService.setPrice(
        organizationId,
        variantId,
        body.amount,
        body.version,
      ),
    };
  }

  @Delete('variants/:variantId/price')
  @OrganizationRoles('owner', 'admin')
  @HttpCode(204)
  async deletePrice(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ): Promise<void> {
    await this.pricingService.deletePrice(organizationId, variantId);
  }

  @Patch('pricing-settings/currency')
  @OrganizationRoles('owner', 'admin')
  async updateCurrency(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() body: UpdatePricingCurrencyDto,
  ): Promise<OrganizationResponse> {
    return {
      organization: await this.pricingService.updateCurrency(organizationId, body.currency),
    };
  }
}

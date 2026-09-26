import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@nexustrade/contracts';
import { HealthService } from './health.service';

@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  liveness(): HealthResponse {
    return this.healthService.liveness();
  }

  @Get('ready')
  readiness(): Promise<HealthResponse> {
    return this.healthService.readiness();
  }
}

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { HealthResponse } from '@nexustrade/contracts';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  liveness(): HealthResponse {
    return {
      status: 'ok',
      service: 'nexustrade-api',
      timestamp: new Date().toISOString(),
    };
  }

  async readiness(): Promise<HealthResponse> {
    try {
      await this.dataSource.query('SELECT 1');

      return {
        status: 'ok',
        service: 'nexustrade-api',
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: 'ok' },
        },
      };
    } catch {
      throw new ServiceUnavailableException({
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database readiness check failed',
      });
    }
  }
}

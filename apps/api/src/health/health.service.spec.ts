import { ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns liveness without querying the database', () => {
    const dataSource = { query: jest.fn() } as unknown as DataSource;
    const service = new HealthService(dataSource);

    expect(service.liveness()).toMatchObject({
      status: 'ok',
      service: 'nexustrade-api',
    });
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('returns readiness after a successful database query', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as DataSource;
    const service = new HealthService(dataSource);

    await expect(service.readiness()).resolves.toMatchObject({
      status: 'ok',
      checks: { database: { status: 'ok' } },
    });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('throws 503 when the database query fails', async () => {
    const dataSource = {
      query: jest.fn().mockRejectedValue(new Error('offline')),
    } as unknown as DataSource;
    const service = new HealthService(dataSource);

    await expect(service.readiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

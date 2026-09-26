import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app/app.module';
import { configureApp } from '../app/configure-app';

describe('Health endpoints', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns liveness independently from external checks', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'nexustrade-api',
    });
  });

  it('queries PostgreSQL for readiness', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      checks: { database: { status: 'ok' } },
    });
  });
});

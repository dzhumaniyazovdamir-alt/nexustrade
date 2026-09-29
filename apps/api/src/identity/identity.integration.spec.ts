import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app/app.module';
import { configureApp } from '../app/configure-app';

describe('Identity and refresh token rotation', () => {
  let app: INestApplication;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const credentials = {
    email: `identity-${suffix}@example.com`,
    password: 'SecurePassword123',
    displayName: 'Identity User',
    organizationName: 'Identity Organization',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => app.close());

  it('registers atomically and exposes the cookie-backed session', async () => {
    const agent = request.agent(app.getHttpServer());
    const registration = await agent.post('/api/v1/auth/register').send(credentials).expect(201);

    expect(registration.body.session).toMatchObject({
      user: { email: credentials.email, displayName: credentials.displayName },
      memberships: [{ role: 'owner', organization: { name: credentials.organizationName } }],
    });
    expect(registration.headers['set-cookie']).toHaveLength(2);

    const session = await agent.get('/api/v1/auth/session').expect(200);
    expect(session.body.session.user.email).toBe(credentials.email);
  });

  it('rotates refresh tokens and revokes a family when an old token is reused', async () => {
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);
    const originalRefreshCookie = (login.headers['set-cookie'] as unknown as string[]).find(
      (cookie) => cookie.startsWith('nexustrade_refresh='),
    );
    expect(originalRefreshCookie).toBeDefined();

    await agent.post('/api/v1/auth/refresh').set('Origin', 'http://localhost:4200').expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:4200')
      .set('Cookie', originalRefreshCookie as string)
      .expect(401);

    await agent.post('/api/v1/auth/refresh').set('Origin', 'http://localhost:4200').expect(401);
  });

  it('returns a null session after logout', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);
    await agent.post('/api/v1/auth/logout').set('Origin', 'http://localhost:4200').expect(204);
    const session = await agent.get('/api/v1/auth/session').expect(200);
    expect(session.body).toEqual({ session: null });
  });
});

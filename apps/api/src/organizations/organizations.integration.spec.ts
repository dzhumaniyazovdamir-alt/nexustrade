import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app/app.module';
import { configureApp } from '../app/configure-app';

describe('Organizations tenant boundary and RBAC', () => {
  let app: INestApplication;
  let owner: ReturnType<typeof request.agent>;
  let member: ReturnType<typeof request.agent>;
  let ownerId: string;
  let memberId: string;
  let ownerOrganizationId: string;
  let memberOrganizationId: string;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const origin = 'http://localhost:4200';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();

    owner = request.agent(app.getHttpServer());
    member = request.agent(app.getHttpServer());
    const ownerRegistration = await owner.post('/api/v1/auth/register').send({
      email: `owner-${suffix}@example.com`,
      password: 'SecurePassword123',
      displayName: 'Owner',
      organizationName: 'Owner Tenant',
    });
    const memberRegistration = await member.post('/api/v1/auth/register').send({
      email: `member-${suffix}@example.com`,
      password: 'SecurePassword123',
      displayName: 'Member',
      organizationName: 'Member Tenant',
    });
    ownerId = ownerRegistration.body.session.user.id;
    memberId = memberRegistration.body.session.user.id;
    ownerOrganizationId = ownerRegistration.body.session.memberships[0].organization.id;
    memberOrganizationId = memberRegistration.body.session.memberships[0].organization.id;
  });

  afterAll(async () => app.close());

  it('denies access to another tenant', async () => {
    const response = await owner.get(`/api/v1/organizations/${memberOrganizationId}`).expect(403);
    expect(response.body.error.code).toBe('ORGANIZATION_ACCESS_DENIED');
  });

  it('creates and accepts a single-use invitation', async () => {
    const invitation = await owner
      .post(`/api/v1/organizations/${ownerOrganizationId}/invitations`)
      .set('Origin', origin)
      .send({ email: `member-${suffix}@example.com`, role: 'member' })
      .expect(201);

    await member
      .post('/api/v1/organizations/invitations/accept')
      .set('Origin', origin)
      .send({ token: invitation.body.token })
      .expect(200);
    await member
      .post('/api/v1/organizations/invitations/accept')
      .set('Origin', origin)
      .send({ token: invitation.body.token })
      .expect(400);

    const memberships = await owner
      .get(`/api/v1/organizations/${ownerOrganizationId}/members`)
      .expect(200);
    expect(memberships.body.memberships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user: expect.objectContaining({ id: memberId }),
          role: 'member',
        }),
      ]),
    );
  });

  it('enforces roles and protects the last owner', async () => {
    await member
      .patch(`/api/v1/organizations/${ownerOrganizationId}`)
      .set('Origin', origin)
      .send({ name: 'Forbidden rename' })
      .expect(403);

    const lastOwner = await owner
      .patch(`/api/v1/organizations/${ownerOrganizationId}/members/${ownerId}/role`)
      .set('Origin', origin)
      .send({ role: 'member' })
      .expect(409);
    expect(lastOwner.body.error.code).toBe('LAST_OWNER_REQUIRED');
  });
});

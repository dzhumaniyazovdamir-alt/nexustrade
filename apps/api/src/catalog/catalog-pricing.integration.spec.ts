import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app/app.module';
import { configureApp } from '../app/configure-app';

describe('Catalog and Pricing tenant boundary', () => {
  let app: INestApplication;
  let owner: ReturnType<typeof request.agent>;
  let member: ReturnType<typeof request.agent>;
  let organizationId: string;
  let otherOrganizationId: string;
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
      email: `catalog-owner-${suffix}@example.com`,
      password: 'SecurePassword123',
      displayName: 'Catalog Owner',
      organizationName: `Catalog Tenant ${suffix}`,
      defaultCurrency: 'EUR',
    });
    const memberRegistration = await member.post('/api/v1/auth/register').send({
      email: `catalog-member-${suffix}@example.com`,
      password: 'SecurePassword123',
      displayName: 'Catalog Member',
      organizationName: `Other Tenant ${suffix}`,
    });
    organizationId = ownerRegistration.body.session.memberships[0].organization.id;
    otherOrganizationId = memberRegistration.body.session.memberships[0].organization.id;
    const invitation = await owner
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set('Origin', origin)
      .send({ email: `catalog-member-${suffix}@example.com`, role: 'member' })
      .expect(201);
    await member
      .post('/api/v1/organizations/invitations/accept')
      .set('Origin', origin)
      .send({ token: invitation.body.token })
      .expect(200);
  });

  afterAll(async () => app.close());

  it('completes category, product, variant and price flow', async () => {
    const category = await owner
      .post(`/api/v1/organizations/${organizationId}/categories`)
      .set('Origin', origin)
      .send({ name: 'Hardware' })
      .expect(201);
    const child = await owner
      .post(`/api/v1/organizations/${organizationId}/categories`)
      .set('Origin', origin)
      .send({ name: 'Keyboards', parentId: category.body.category.id })
      .expect(201);
    await owner
      .patch(`/api/v1/organizations/${organizationId}/categories/${category.body.category.id}`)
      .set('Origin', origin)
      .send({ parentId: child.body.category.id })
      .expect(400);

    const product = await owner
      .post(`/api/v1/organizations/${organizationId}/products`)
      .set('Origin', origin)
      .send({ name: 'Mechanical keyboard', categoryId: child.body.category.id })
      .expect(201);
    const variant = await owner
      .post(`/api/v1/organizations/${organizationId}/products/${product.body.product.id}/variants`)
      .set('Origin', origin)
      .send({ sku: ` kb-${suffix} `, name: 'ANSI', attributes: { layout: 'ANSI' } })
      .expect(201);
    expect(variant.body.variant.sku).toBe(`KB-${suffix}`.toUpperCase());

    const price = await owner
      .put(`/api/v1/organizations/${organizationId}/variants/${variant.body.variant.id}/price`)
      .set('Origin', origin)
      .send({ amount: '129.9900' })
      .expect(200);
    expect(price.body.price).toMatchObject({ amount: '129.9900', currency: 'EUR' });

    const products = await member
      .get(`/api/v1/organizations/${organizationId}/products?search=keyboard`)
      .expect(200);
    expect(products.body.products).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: product.body.product.id })]),
    );
    await member
      .post(`/api/v1/organizations/${organizationId}/products`)
      .set('Origin', origin)
      .send({ name: 'Forbidden' })
      .expect(403);

    const lockedCurrency = await owner
      .patch(`/api/v1/organizations/${organizationId}/pricing-settings/currency`)
      .set('Origin', origin)
      .send({ currency: 'USD' })
      .expect(409);
    expect(lockedCurrency.body.error.code).toBe('CURRENCY_LOCKED_BY_PRICES');
  });

  it('does not expose catalog across organizations', async () => {
    await owner.get(`/api/v1/organizations/${otherOrganizationId}/products`).expect(403);
  });
});

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CatalogPricing1792447200000 implements MigrationInterface {
  name = 'CatalogPricing1792447200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organizations"
      ADD COLUMN "default_currency" char(3) NOT NULL DEFAULT 'USD',
      ADD CONSTRAINT "ck_organization_default_currency"
        CHECK ("default_currency" ~ '^[A-Z]{3}$')
    `);
    await queryRunner.query(`CREATE TYPE "catalog_status" AS ENUM ('active', 'archived')`);
    await queryRunner.query(`
      CREATE TABLE "product_categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "parent_id" uuid,
        "name" varchar(120) NOT NULL,
        "slug" varchar(140) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_product_category_id_organization" UNIQUE ("id", "organization_id"),
        CONSTRAINT "ck_product_category_not_self_parent" CHECK ("parent_id" IS NULL OR "parent_id" <> "id"),
        CONSTRAINT "fk_product_category_organization" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_product_category_parent" FOREIGN KEY ("parent_id", "organization_id")
          REFERENCES "product_categories"("id", "organization_id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_product_category_sibling_slug"
      ON "product_categories" (
        "organization_id",
        COALESCE("parent_id", '00000000-0000-0000-0000-000000000000'::uuid),
        "slug"
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_product_category_parent"
      ON "product_categories" ("organization_id", "parent_id")
    `);
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "category_id" uuid,
        "name" varchar(180) NOT NULL,
        "description" text,
        "status" "catalog_status" NOT NULL DEFAULT 'active',
        "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_product_id_organization" UNIQUE ("id", "organization_id"),
        CONSTRAINT "ck_product_version_positive" CHECK ("version" > 0),
        CONSTRAINT "fk_product_organization" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_product_category" FOREIGN KEY ("category_id", "organization_id")
          REFERENCES "product_categories"("id", "organization_id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_product_list"
      ON "products" ("organization_id", "status", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_product_category"
      ON "products" ("organization_id", "category_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_product_name_search"
      ON "products" ("organization_id", lower("name"))
    `);
    await queryRunner.query(`
      CREATE TABLE "product_variants" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "sku" varchar(80) NOT NULL,
        "name" varchar(180) NOT NULL,
        "attributes" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "status" "catalog_status" NOT NULL DEFAULT 'active',
        "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_product_variant_id_organization" UNIQUE ("id", "organization_id"),
        CONSTRAINT "uq_product_variant_organization_sku" UNIQUE ("organization_id", "sku"),
        CONSTRAINT "ck_product_variant_version_positive" CHECK ("version" > 0),
        CONSTRAINT "ck_product_variant_attributes_object"
          CHECK (jsonb_typeof("attributes") = 'object'),
        CONSTRAINT "fk_product_variant_organization" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_product_variant_product" FOREIGN KEY ("product_id", "organization_id")
          REFERENCES "products"("id", "organization_id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_product_variant_product"
      ON "product_variants" ("organization_id", "product_id", "status")
    `);
    await queryRunner.query(`
      CREATE TABLE "variant_prices" (
        "variant_id" uuid PRIMARY KEY,
        "organization_id" uuid NOT NULL,
        "amount" numeric(19,4) NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_variant_price_amount_non_negative" CHECK ("amount" >= 0),
        CONSTRAINT "ck_variant_price_version_positive" CHECK ("version" > 0),
        CONSTRAINT "fk_variant_price_variant" FOREIGN KEY ("variant_id", "organization_id")
          REFERENCES "product_variants"("id", "organization_id") ON DELETE CASCADE,
        CONSTRAINT "fk_variant_price_organization" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_variant_price_organization"
      ON "variant_prices" ("organization_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "variant_prices"`);
    await queryRunner.query(`DROP TABLE "product_variants"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "product_categories"`);
    await queryRunner.query(`DROP TYPE "catalog_status"`);
    await queryRunner.query(`
      ALTER TABLE "organizations"
      DROP CONSTRAINT "ck_organization_default_currency",
      DROP COLUMN "default_currency"
    `);
  }
}

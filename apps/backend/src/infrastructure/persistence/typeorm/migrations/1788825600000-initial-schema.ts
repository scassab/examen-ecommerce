import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Esquema inicial.
 *
 * Se escribe a mano en lugar de dejar que TypeORM sincronice el esquema:
 * `synchronize` deduce la estructura de las entidades y puede borrar columnas
 * sin avisar, mientras que una migración versionada es revisable, repetible y
 * deja constancia de las restricciones que protegen los datos.
 *
 * Detalles que no son casuales:
 * - el dinero es `integer` en centavos, nunca `decimal`;
 * - `CHECK (stock >= 0)` impide un stock negativo aunque falle la aplicación;
 * - `order_items` referencia productos con `RESTRICT`: borrar un producto no
 *   puede dejar órdenes huérfanas ni reescribir el historial.
 */
export class InitialSchema1788825600000 implements MigrationInterface {
  public readonly name = 'InitialSchema1788825600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" SERIAL PRIMARY KEY,
        "code" VARCHAR(32) NOT NULL UNIQUE,
        "name" VARCHAR(64) NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" UUID PRIMARY KEY,
        "name" VARCHAR(120) NOT NULL,
        "category_id" INTEGER NOT NULL REFERENCES "categories" ("id") ON DELETE RESTRICT,
        "unit_price_in_cents" INTEGER NOT NULL CHECK ("unit_price_in_cents" >= 0),
        "stock" INTEGER NOT NULL CHECK ("stock" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "coupons" (
        "code" VARCHAR(32) PRIMARY KEY,
        "percentage" NUMERIC(5,2) NOT NULL CHECK ("percentage" >= 0 AND "percentage" <= 100),
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "expires_at" TIMESTAMPTZ NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" UUID PRIMARY KEY,
        "created_at" TIMESTAMPTZ NOT NULL,
        "original_subtotal_in_cents" INTEGER NOT NULL CHECK ("original_subtotal_in_cents" >= 0),
        "total_discount_in_cents" INTEGER NOT NULL CHECK ("total_discount_in_cents" >= 0),
        "cap_adjustment_in_cents" INTEGER NOT NULL CHECK ("cap_adjustment_in_cents" >= 0),
        "total_in_cents" INTEGER NOT NULL CHECK ("total_in_cents" >= 0),
        "effective_discount_percentage" NUMERIC(5,2) NOT NULL,
        "max_discount_percentage" NUMERIC(5,2) NOT NULL,
        "cap_reached" BOOLEAN NOT NULL,
        "coupon_code" VARCHAR(32) NULL,
        "coupon_status" VARCHAR(16) NOT NULL,
        CONSTRAINT "orders_totals_add_up"
          CHECK ("original_subtotal_in_cents" - "total_discount_in_cents" = "total_in_cents")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" UUID PRIMARY KEY,
        "order_id" UUID NOT NULL REFERENCES "orders" ("id") ON DELETE CASCADE,
        "product_id" UUID NOT NULL REFERENCES "products" ("id") ON DELETE RESTRICT,
        "product_name" VARCHAR(120) NOT NULL,
        "category_code" VARCHAR(32) NOT NULL,
        "category_name" VARCHAR(64) NOT NULL,
        "unit_price_in_cents" INTEGER NOT NULL CHECK ("unit_price_in_cents" >= 0),
        "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
        "line_subtotal_in_cents" INTEGER NOT NULL CHECK ("line_subtotal_in_cents" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "order_discounts" (
        "id" UUID PRIMARY KEY,
        "order_id" UUID NOT NULL REFERENCES "orders" ("id") ON DELETE CASCADE,
        "sequence" INTEGER NOT NULL CHECK ("sequence" >= 0),
        "kind" VARCHAR(16) NOT NULL,
        "percentage" NUMERIC(5,2) NOT NULL,
        "base_in_cents" INTEGER NOT NULL CHECK ("base_in_cents" >= 0),
        "amount_in_cents" INTEGER NOT NULL CHECK ("amount_in_cents" >= 0)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_products_category" ON "products" ("category_id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_order_items_order" ON "order_items" ("order_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_order_discounts_order" ON "order_discounts" ("order_id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_orders_created_at" ON "orders" ("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "order_discounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coupons"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);
  }
}

import 'reflect-metadata';

import type { DataSource, EntityManager } from 'typeorm';

import { loadConfig, loadEnvFile } from '../../../config/env';
import { createDataSource } from '../data-source';
import { CategoryEntity, CouponEntity, ProductEntity } from '../entities/catalog.entities';

import { CATEGORY_SEEDS, COUPON_SEEDS, PRODUCT_SEEDS } from './catalog.seed';

/**
 * Deja la base en un estado conocido.
 *
 * Es un requisito de la demostración en vivo, no un lujo: probar el rechazo por
 * falta de stock consume existencias, así que hace falta poder volver al punto
 * de partida en un comando y repetir el guion las veces que haga falta.
 */
export const seedDatabase = async (manager: EntityManager): Promise<void> => {
  // TRUNCATE en lugar de DELETE: vacía las seis tablas de una vez respetando las
  // claves foráneas y reinicia la secuencia de categorías, de modo que resembrar
  // deja exactamente el mismo estado la primera vez y la décima.
  await manager.query(
    'TRUNCATE TABLE "order_discounts", "order_items", "orders", "products", "coupons", "categories" RESTART IDENTITY CASCADE',
  );

  const categories = new Map<string, CategoryEntity>();

  for (const seed of CATEGORY_SEEDS) {
    const entity = manager.create(CategoryEntity, { code: seed.code, name: seed.name });

    categories.set(seed.code, await manager.save(CategoryEntity, entity));
  }

  for (const seed of PRODUCT_SEEDS) {
    const category = categories.get(seed.category);

    if (category === undefined) {
      throw new Error(`seed error: unknown category "${seed.category}" for product "${seed.name}"`);
    }

    await manager.save(
      ProductEntity,
      manager.create(ProductEntity, {
        id: seed.id,
        name: seed.name,
        category,
        unitPriceInCents: seed.unitPriceInCents,
        stock: seed.stock,
      }),
    );
  }

  for (const seed of COUPON_SEEDS) {
    await manager.save(
      CouponEntity,
      manager.create(CouponEntity, {
        code: seed.code,
        percentage: seed.percentage,
        active: seed.active,
        expiresAt: seed.expiresAt === null ? null : new Date(seed.expiresAt),
      }),
    );
  }
};

const run = async (): Promise<void> => {
  loadEnvFile();

  const dataSource: DataSource = createDataSource(loadConfig().database);

  await dataSource.initialize();

  try {
    await dataSource.transaction(seedDatabase);
    console.info(
      `[seed] ${CATEGORY_SEEDS.length} categories, ${PRODUCT_SEEDS.length} products and ${COUPON_SEEDS.length} coupons written`,
    );
  } finally {
    await dataSource.destroy();
  }
};

run().catch((error: unknown) => {
  console.error('[seed] failed', error);
  process.exit(1);
});

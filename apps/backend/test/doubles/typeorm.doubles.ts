import type { Category } from '@ecommerce/shared';
import type { DataSource, EntityManager } from 'typeorm';

import { CategoryEntity, CouponEntity, ProductEntity } from '../../src/infrastructure/persistence/typeorm/entities/catalog.entities';

/** Llamada registrada a `find`, para poder afirmar sobre el bloqueo pedido. */
export interface RecordedFind {
  readonly target: unknown;
  readonly options: unknown;
}

export interface RecordedUpdate {
  readonly target: unknown;
  readonly criteria: unknown;
  readonly partial: unknown;
}

/**
 * Doble del `EntityManager` de TypeORM.
 *
 * Solo implementa los cinco métodos que usan los adaptadores, y registra cada
 * llamada. Se convierte con `unknown` en lugar de `any` para no renunciar a la
 * comprobación de tipos en el resto de la prueba. Lo que se verifica aquí no es
 * que TypeORM funcione, sino que el adaptador le pide exactamente lo que el
 * dominio necesita, empezando por el bloqueo pesimista.
 */
export class FakeEntityManager {
  public readonly finds: RecordedFind[] = [];
  public readonly updates: RecordedUpdate[] = [];
  public readonly saved: unknown[] = [];

  public constructor(private readonly results: Map<unknown, unknown[]> = new Map()) {}

  public asEntityManager(): EntityManager {
    return this as unknown as EntityManager;
  }

  public async find(target: unknown, options: unknown): Promise<unknown[]> {
    this.finds.push({ target, options });

    return this.results.get(target) ?? [];
  }

  public async findOne(target: unknown, options: unknown): Promise<unknown> {
    this.finds.push({ target, options });

    return this.results.get(target)?.[0] ?? null;
  }

  public async save(target: unknown, entity: unknown): Promise<unknown> {
    this.saved.push(entity);

    return entity;
  }

  public async update(target: unknown, criteria: unknown, partial: unknown): Promise<void> {
    this.updates.push({ target, criteria, partial });
  }
}

/** Doble de `DataSource` cuya transacción ejecuta el trabajo con el manager falso. */
export class FakeDataSource {
  public transactions = 0;

  public constructor(private readonly manager: FakeEntityManager) {}

  public asDataSource(): DataSource {
    return this as unknown as DataSource;
  }

  public async transaction<TResult>(
    work: (manager: EntityManager) => Promise<TResult>,
  ): Promise<TResult> {
    this.transactions += 1;

    return work(this.manager.asEntityManager());
  }
}

export const buildCategoryEntity = (code: Category, name: string): CategoryEntity => {
  const entity = new CategoryEntity();

  entity.id = 1;
  entity.code = code;
  entity.name = name;

  return entity;
};

export const buildProductEntity = (overrides: Partial<ProductEntity> = {}): ProductEntity => {
  const entity = new ProductEntity();

  entity.id = overrides.id ?? '11111111-1111-4111-8111-111111111101';
  entity.name = overrides.name ?? 'Laptop Pro 14"';
  entity.category = overrides.category ?? buildCategoryEntity('TECHNOLOGY', 'Tecnología');
  entity.unitPriceInCents = overrides.unitPriceInCents ?? 129_900;
  entity.stock = overrides.stock ?? 5;

  return entity;
};

export const buildCouponEntity = (overrides: Partial<CouponEntity> = {}): CouponEntity => {
  const entity = new CouponEntity();

  entity.code = overrides.code ?? 'WELCOME2026';
  entity.percentage = overrides.percentage ?? 15;
  entity.active = overrides.active ?? true;
  entity.expiresAt = overrides.expiresAt === undefined ? null : overrides.expiresAt;

  return entity;
};

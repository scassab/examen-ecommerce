import type { EntityManager } from 'typeorm';
import { In } from 'typeorm';

import type { Coupon } from '../../../../domain/models/coupon';
import type { Order } from '../../../../domain/models/order';
import type { Product } from '../../../../domain/models/product';
import type {
  CouponRepository,
  OrderRepository,
  ProductRepository,
} from '../../../../domain/ports/repositories';
import type { IdGenerator } from '../../../../domain/ports/services';
import { CouponEntity, ProductEntity } from '../entities/catalog.entities';
import { OrderEntity } from '../entities/order.entities';
import {
  toCouponDomain,
  toOrderDomain,
  toOrderEntity,
  toProductDomain,
} from '../mappers/persistence.mapper';

/**
 * Adaptadores de los puertos del dominio sobre TypeORM.
 *
 * Reciben un `EntityManager` en lugar de un `DataSource` a propósito: el mismo
 * repositorio sirve dentro y fuera de una transacción, según qué manager se le
 * inyecte. Sin eso, el checkout necesitaría una versión transaccional aparte de
 * cada repositorio.
 */
export class TypeOrmProductRepository implements ProductRepository {
  public constructor(private readonly manager: EntityManager) {}

  public async findAll(): Promise<readonly Product[]> {
    const entities = await this.manager.find(ProductEntity, { order: { name: 'ASC' } });

    return entities.map(toProductDomain);
  }

  public async findByIds(ids: readonly string[]): Promise<readonly Product[]> {
    if (ids.length === 0) {
      return [];
    }

    const entities = await this.manager.find(ProductEntity, { where: { id: In([...ids]) } });

    return entities.map(toProductDomain);
  }
}

export class TypeOrmCouponRepository implements CouponRepository {
  public constructor(private readonly manager: EntityManager) {}

  public async findByCode(code: string): Promise<Coupon | null> {
    const entity = await this.manager.findOne(CouponEntity, { where: { code } });

    return entity === null ? null : toCouponDomain(entity);
  }
}

export class TypeOrmOrderRepository implements OrderRepository {
  public constructor(
    private readonly manager: EntityManager,
    private readonly ids: IdGenerator,
  ) {}

  public async save(order: Order): Promise<Order> {
    const entity = toOrderEntity(order, {
      itemIds: order.lines.map(() => this.ids.next()),
      discountIds: order.breakdown.discounts.map(() => this.ids.next()),
    });

    await this.manager.save(OrderEntity, entity);

    return order;
  }

  public async findAll(): Promise<readonly Order[]> {
    const entities = await this.manager.find(OrderEntity, { order: { createdAt: 'DESC' } });

    return entities.map(toOrderDomain);
  }
}

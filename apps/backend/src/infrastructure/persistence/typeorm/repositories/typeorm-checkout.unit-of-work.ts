import type { DataSource } from 'typeorm';
import { In } from 'typeorm';

import type { Product } from '../../../../domain/models/product';
import type { CheckoutContext, CheckoutUnitOfWork } from '../../../../domain/ports/repositories';
import type { IdGenerator } from '../../../../domain/ports/services';
import { ProductEntity } from '../entities/catalog.entities';
import { toProductDomain } from '../mappers/persistence.mapper';

import { TypeOrmOrderRepository } from './typeorm.repositories';

/**
 * Unidad de trabajo del checkout sobre PostgreSQL.
 *
 * Todo el trabajo corre dentro de una transacción, y `lockProducts` emite
 * `SELECT ... FOR UPDATE` sobre las filas implicadas. Ese bloqueo es lo que
 * resuelve el problema real de un checkout concurrente:
 *
 *   Sin bloqueo: A lee stock=1, B lee stock=1, ambos validan, ambos escriben,
 *                se venden dos unidades de la única que había.
 *   Con bloqueo: B espera a que A confirme, lee stock=0 y su compra se rechaza.
 *
 * Si el trabajo lanza, la transacción hace rollback: nunca queda stock
 * descontado sin su orden asociada.
 */
export class TypeOrmCheckoutUnitOfWork implements CheckoutUnitOfWork {
  public constructor(
    private readonly dataSource: DataSource,
    private readonly ids: IdGenerator,
  ) {}

  public async run<TResult>(
    work: (context: CheckoutContext) => Promise<TResult>,
  ): Promise<TResult> {
    return this.dataSource.transaction(async (manager) => {
      const orders = new TypeOrmOrderRepository(manager, this.ids);

      const context: CheckoutContext = {
        lockProducts: async (ids): Promise<readonly Product[]> => {
          if (ids.length === 0) {
            return [];
          }

          const entities = await manager.find(ProductEntity, {
            where: { id: In([...ids]) },
            // Se bloquea únicamente `products`: la categoría se trae por join y
            // PostgreSQL rechaza FOR UPDATE sobre el lado externo de un join.
            lock: { mode: 'pessimistic_write', tables: ['products'] },
          });

          return entities.map(toProductDomain);
        },

        saveProducts: async (products): Promise<void> => {
          for (const product of products) {
            await manager.update(ProductEntity, { id: product.id }, { stock: product.stock });
          }
        },

        saveOrder: async (order) => orders.save(order),
      };

      return work(context);
    });
  }
}

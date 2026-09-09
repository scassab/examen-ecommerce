import type { Order } from '../../domain/models/order';
import type { Product } from '../../domain/models/product';
import type { OrderRepository, ProductRepository } from '../../domain/ports/repositories';

/**
 * Consultas de solo lectura.
 *
 * Son deliberadamente delgadas: no hay regla de negocio que aplicar al listar.
 * Existen igualmente como casos de uso para que el adaptador HTTP hable siempre
 * con la capa de aplicación y nunca directamente con un repositorio.
 */
export class ListProductsUseCase {
  public constructor(private readonly products: ProductRepository) {}

  public async execute(): Promise<readonly Product[]> {
    return this.products.findAll();
  }
}

export class ListOrdersUseCase {
  public constructor(private readonly orders: OrderRepository) {}

  public async execute(): Promise<readonly Order[]> {
    return this.orders.findAll();
  }
}

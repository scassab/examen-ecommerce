import type { Coupon } from '../models/coupon';
import type { Order } from '../models/order';
import type { Product } from '../models/product';

/**
 * Puertos de salida del dominio (patrón Repository / Ports & Adapters).
 *
 * El dominio declara lo que necesita del mundo exterior en sus propios términos
 * —productos, cupones y órdenes—, y nunca en los de PostgreSQL. Gracias a eso,
 * los casos de uso se prueban contra dobles en memoria sin base de datos, y
 * cambiar el motor de persistencia no toca ni una línea de lógica de negocio.
 */
export interface ProductRepository {
  findAll(): Promise<readonly Product[]>;
  /** Devuelve solo los productos existentes; los ids desconocidos se omiten. */
  findByIds(ids: readonly string[]): Promise<readonly Product[]>;
}

export interface CouponRepository {
  /** `null` cuando el código no existe en el catálogo de cupones. */
  findByCode(code: string): Promise<Coupon | null>;
}

export interface OrderRepository {
  save(order: Order): Promise<Order>;
  findAll(): Promise<readonly Order[]>;
}

/**
 * Operaciones disponibles dentro de la transacción de checkout.
 *
 * `lockProducts` no es un `findByIds` cualquiera: exige al adaptador bloquear
 * las filas hasta el commit. Sobre PostgreSQL se traduce en
 * `SELECT ... FOR UPDATE`, que es lo que impide vender dos veces la última
 * unidad cuando dos checkouts entran a la vez.
 */
export interface CheckoutContext {
  lockProducts(ids: readonly string[]): Promise<readonly Product[]>;
  saveProducts(products: readonly Product[]): Promise<void>;
  saveOrder(order: Order): Promise<Order>;
}

/**
 * Unidad de trabajo del checkout.
 *
 * El caso de uso describe el trabajo y el adaptador decide cómo hacerlo
 * atómico. Si el trabajo lanza, el adaptador debe deshacer todo: nunca puede
 * quedar stock descontado sin su orden asociada.
 */
export interface CheckoutUnitOfWork {
  run<TResult>(work: (context: CheckoutContext) => Promise<TResult>): Promise<TResult>;
}

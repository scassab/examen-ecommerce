import type { DataSource } from 'typeorm';

import { CheckoutUseCase } from '../application/use-cases/checkout.use-case';
import { ListOrdersUseCase, ListProductsUseCase } from '../application/use-cases/catalog.use-cases';
import { QuoteCartUseCase } from '../application/use-cases/quote-cart.use-case';
import type { DiscountConfig } from '../domain/discounts/discount-config';
import { DEFAULT_DISCOUNT_CONFIG } from '../domain/discounts/discount-config';
import { DiscountEngine } from '../domain/discounts/discount-engine';

import type { ApiDependencies } from './http/app';
import {
  TypeOrmCouponRepository,
  TypeOrmOrderRepository,
  TypeOrmProductRepository,
} from './persistence/typeorm/repositories/typeorm.repositories';
import { TypeOrmCheckoutUnitOfWork } from './persistence/typeorm/repositories/typeorm-checkout.unit-of-work';
import { SystemClock, UuidGenerator } from './services/system-services';

/**
 * Raíz de composición: el único lugar del backend donde se elige tecnología.
 *
 * Aquí se decide que los repositorios son de TypeORM, que el reloj es el del
 * sistema y que los identificadores son UUID. Ninguna otra pieza importa una
 * implementación concreta: los casos de uso solo conocen interfaces, así que
 * sustituir PostgreSQL por otro motor se hace en este archivo y en ningún otro.
 *
 * La configuración de descuentos también entra por aquí, lo que permite
 * arrancar un perfil distinto sin recompilar la lógica del motor.
 */
export const buildApiDependencies = (
  dataSource: DataSource,
  discountConfig: DiscountConfig = DEFAULT_DISCOUNT_CONFIG,
): ApiDependencies => {
  const clock = new SystemClock();
  const ids = new UuidGenerator();
  const engine = DiscountEngine.fromConfig(discountConfig);

  const products = new TypeOrmProductRepository(dataSource.manager);
  const coupons = new TypeOrmCouponRepository(dataSource.manager);
  const orders = new TypeOrmOrderRepository(dataSource.manager, ids);
  const checkoutUnitOfWork = new TypeOrmCheckoutUnitOfWork(dataSource, ids);

  return {
    listProducts: new ListProductsUseCase(products),
    quoteCart: new QuoteCartUseCase(products, coupons, engine, clock),
    checkout: new CheckoutUseCase(checkoutUnitOfWork, coupons, engine, clock, ids),
    listOrders: new ListOrdersUseCase(orders),
  };
};

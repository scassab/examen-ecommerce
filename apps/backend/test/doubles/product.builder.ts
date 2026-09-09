import type { Category } from '@ecommerce/shared';

import { Money } from '../../src/domain/models/money';
import { Product } from '../../src/domain/models/product';

export interface ProductOverrides {
  readonly id?: string;
  readonly name?: string;
  readonly category?: Category;
  readonly categoryName?: string;
  readonly priceInCents?: number;
  readonly stock?: number;
}

/**
 * Constructor de productos para pruebas.
 *
 * Cada prueba declara solo el atributo que le importa y el resto queda en
 * valores neutros, de modo que al leer el caso se ve de inmediato qué es lo
 * relevante para esa aserción.
 */
export const buildProduct = (overrides: ProductOverrides = {}): Product =>
  new Product({
    id: overrides.id ?? 'laptop-pro',
    name: overrides.name ?? 'Laptop Pro',
    category: overrides.category ?? 'TECHNOLOGY',
    categoryName: overrides.categoryName ?? 'Tecnología',
    unitPrice: Money.fromCents(overrides.priceInCents ?? 100_000),
    stock: overrides.stock ?? 10,
  });

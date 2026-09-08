import type { Category } from '@ecommerce/shared';

import { DuplicatedProductError, EmptyCartError, InvalidValueError } from '../errors/domain.error';

import { Money } from './money';
import type { Product } from './product';

/** Línea del carrito: un producto del catálogo y cuántas unidades se piden. */
export class CartLine {
  public constructor(
    public readonly product: Product,
    public readonly quantity: number,
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidValueError(
        `cart line for product "${product.id}" must have a positive integer quantity, received ${quantity}`,
      );
    }
  }

  public get subtotal(): Money {
    return this.product.priceFor(this.quantity);
  }

  public belongsTo(category: Category): boolean {
    return this.product.belongsTo(category);
  }
}

/**
 * Carrito ya resuelto contra el catálogo.
 *
 * Es la entrada del motor de descuentos, y garantiza dos invariantes que el
 * motor necesita poder dar por ciertas: hay al menos una línea y ningún producto
 * se repite. Validarlo aquí y no solo en el borde HTTP evita que el motor tenga
 * que defenderse de datos que el modelo ya debería haber rechazado.
 */
export class Cart {
  private constructor(public readonly lines: readonly CartLine[]) {}

  public static fromLines(lines: readonly CartLine[]): Cart {
    if (lines.length === 0) {
      throw new EmptyCartError();
    }

    const seen = new Set<string>();

    for (const line of lines) {
      if (seen.has(line.product.id)) {
        throw new DuplicatedProductError(line.product.id);
      }

      seen.add(line.product.id);
    }

    return new Cart(lines);
  }

  /** Suma de las líneas sin ningún descuento aplicado. */
  public get subtotal(): Money {
    return Money.sum(this.lines.map((line) => line.subtotal));
  }

  /** Suma de las líneas de una categoría; base del descuento por categoría. */
  public subtotalOfCategory(category: Category): Money {
    return Money.sum(
      this.lines.filter((line) => line.belongsTo(category)).map((line) => line.subtotal),
    );
  }

  public containsCategory(category: Category): boolean {
    return this.lines.some((line) => line.belongsTo(category));
  }

  public get size(): number {
    return this.lines.length;
  }
}

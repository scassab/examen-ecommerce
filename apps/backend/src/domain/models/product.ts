import type { Category } from '@ecommerce/shared';

import { InsufficientStockError, InvalidValueError } from '../errors/domain.error';

import { Money } from './money';

export interface ProductProperties {
  readonly id: string;
  readonly name: string;
  readonly category: Category;
  /** Etiqueta visible de la categoría; el motor nunca decide sobre ella. */
  readonly categoryName: string;
  readonly unitPrice: Money;
  readonly stock: number;
}

/**
 * Producto del catálogo con su disponibilidad.
 *
 * Es inmutable: descontar stock devuelve un producto nuevo. Así el caso de uso
 * puede calcular el resultado completo de un checkout antes de decidir si lo
 * persiste, sin haber mutado nada por el camino.
 */
export class Product {
  public readonly id: string;
  public readonly name: string;
  public readonly category: Category;
  public readonly categoryName: string;
  public readonly unitPrice: Money;
  public readonly stock: number;

  public constructor(properties: ProductProperties) {
    if (properties.id.trim().length === 0) {
      throw new InvalidValueError('product id cannot be empty');
    }

    if (properties.name.trim().length === 0) {
      throw new InvalidValueError(`product "${properties.id}" cannot have an empty name`);
    }

    if (!Number.isInteger(properties.stock) || properties.stock < 0) {
      throw new InvalidValueError(
        `product "${properties.id}" stock must be a non negative integer, received ${properties.stock}`,
      );
    }

    this.id = properties.id;
    this.name = properties.name;
    this.category = properties.category;
    this.categoryName = properties.categoryName;
    this.unitPrice = properties.unitPrice;
    this.stock = properties.stock;
  }

  public belongsTo(category: Category): boolean {
    return this.category === category;
  }

  public hasStockFor(quantity: number): boolean {
    return this.stock >= quantity;
  }

  /** Devuelve un producto nuevo con el stock descontado, o falla si no alcanza. */
  public withStockReducedBy(quantity: number): Product {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidValueError(`quantity must be a positive integer, received ${quantity}`);
    }

    if (!this.hasStockFor(quantity)) {
      throw new InsufficientStockError(this.id, quantity, this.stock);
    }

    return new Product({ ...this.toProperties(), stock: this.stock - quantity });
  }

  public priceFor(quantity: number): Money {
    return this.unitPrice.multipliedBy(quantity);
  }

  private toProperties(): ProductProperties {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      categoryName: this.categoryName,
      unitPrice: Money.fromCents(this.unitPrice.inCents),
      stock: this.stock,
    };
  }
}

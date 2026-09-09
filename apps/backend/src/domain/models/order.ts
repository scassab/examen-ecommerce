import type { Category } from '@ecommerce/shared';

import type { DiscountBreakdown } from '../discounts/discount-engine';

import type { Cart, CartLine } from './cart';
import type { Money } from './money';

/**
 * Línea de una orden ya confirmada.
 *
 * Guarda el nombre y el precio unitario **congelados** en el momento de la
 * compra, en lugar de apuntar al catálogo: cambiar un precio mañana no puede
 * reescribir lo que un cliente pagó ayer.
 */
export class OrderLine {
  public constructor(
    public readonly productId: string,
    public readonly productName: string,
    /** Categoría congelada: explica por qué la línea recibió o no el descuento. */
    public readonly category: Category,
    public readonly categoryName: string,
    public readonly unitPrice: Money,
    public readonly quantity: number,
    public readonly lineSubtotal: Money,
  ) {}

  public static fromCartLine(line: CartLine): OrderLine {
    return new OrderLine(
      line.product.id,
      line.product.name,
      line.product.category,
      line.product.categoryName,
      line.product.unitPrice,
      line.quantity,
      line.subtotal,
    );
  }
}

export interface OrderProperties {
  readonly id: string;
  readonly createdAt: Date;
  readonly lines: readonly OrderLine[];
  readonly breakdown: DiscountBreakdown;
}

/**
 * Orden confirmada y persistible.
 *
 * Incrusta el desglose que fue autoritativo en el checkout, así que una orden
 * es autoexplicativa: se puede auditar sin volver a ejecutar el motor y sin
 * depender de la configuración de descuentos vigente hoy.
 */
export class Order {
  public readonly id: string;
  public readonly createdAt: Date;
  public readonly lines: readonly OrderLine[];
  public readonly breakdown: DiscountBreakdown;

  public constructor(properties: OrderProperties) {
    this.id = properties.id;
    this.createdAt = properties.createdAt;
    this.lines = properties.lines;
    this.breakdown = properties.breakdown;
  }

  /** Crea la orden a partir del carrito cotizado y su desglose. */
  public static fromCart(params: {
    readonly id: string;
    readonly createdAt: Date;
    readonly cart: Cart;
    readonly breakdown: DiscountBreakdown;
  }): Order {
    return new Order({
      id: params.id,
      createdAt: params.createdAt,
      lines: params.cart.lines.map((line) => OrderLine.fromCartLine(line)),
      breakdown: params.breakdown,
    });
  }

  public get total(): Money {
    return this.breakdown.total;
  }
}

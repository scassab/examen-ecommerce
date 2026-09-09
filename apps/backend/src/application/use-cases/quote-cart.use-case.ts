import type { DiscountBreakdown, DiscountEngine } from '../../domain/discounts/discount-engine';
import type { Cart } from '../../domain/models/cart';
import type { CouponRepository, ProductRepository } from '../../domain/ports/repositories';
import type { Clock } from '../../domain/ports/services';

import type { RequestedItem } from './cart-assembler';
import { assembleCart, resolveCoupon } from './cart-assembler';

export interface QuoteCartCommand {
  readonly items: readonly RequestedItem[];
  readonly couponCode: string | null;
}

export interface QuoteCartResult {
  readonly cart: Cart;
  readonly breakdown: DiscountBreakdown;
}

/**
 * Cotiza un carrito sin efectos secundarios.
 *
 * Deliberadamente **no** valida stock: cotizar es simular un precio, y un
 * cliente que pide más unidades de las disponibles debe poder ver su total
 * antes de que el checkout lo rechace. La disponibilidad se verifica donde
 * importa, dentro de la transacción de compra.
 */
export class QuoteCartUseCase {
  public constructor(
    private readonly products: ProductRepository,
    private readonly coupons: CouponRepository,
    private readonly engine: DiscountEngine,
    private readonly clock: Clock,
  ) {}

  public async execute(command: QuoteCartCommand): Promise<QuoteCartResult> {
    const requestedIds = command.items.map((item) => item.productId);
    const products = await this.products.findByIds(requestedIds);
    const cart = assembleCart(command.items, products);
    const coupon = await resolveCoupon(this.coupons, command.couponCode);

    const breakdown = this.engine.calculate({
      cart,
      coupon,
      requestedCouponCode: command.couponCode,
      moment: this.clock.now(),
    });

    return { cart, breakdown };
  }
}

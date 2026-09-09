import type { DiscountEngine } from '../../domain/discounts/discount-engine';
import type { StockShortage } from '../../domain/errors/domain.error';
import { OutOfStockError } from '../../domain/errors/domain.error';
import type { Cart } from '../../domain/models/cart';
import { Order } from '../../domain/models/order';
import type { Product } from '../../domain/models/product';
import type { CheckoutContext, CheckoutUnitOfWork, CouponRepository } from '../../domain/ports/repositories';
import type { Clock, IdGenerator } from '../../domain/ports/services';

import type { RequestedItem } from './cart-assembler';
import { assembleCart, resolveCoupon } from './cart-assembler';

export interface CheckoutCommand {
  readonly items: readonly RequestedItem[];
  readonly couponCode: string | null;
}

/**
 * Confirma una compra.
 *
 * Todo el trabajo ocurre dentro de una unidad de trabajo transaccional y en un
 * orden que no es casual:
 *
 *   1. bloquear los productos implicados (el adaptador usa SELECT ... FOR UPDATE),
 *   2. verificar el stock ya bloqueado,
 *   3. recalcular los descuentos en el servidor, sin confiar en el cliente,
 *   4. descontar stock y persistir la orden,
 *   5. confirmar.
 *
 * Bloquear antes de verificar es lo que evita el clásico "dos clientes compran
 * la última unidad": sin el bloqueo, ambos leerían stock disponible y ambos
 * escribirían. Y si cualquier paso falla, el adaptador deshace la transacción,
 * de modo que nunca queda stock consumido sin su orden.
 */
export class CheckoutUseCase {
  public constructor(
    private readonly unitOfWork: CheckoutUnitOfWork,
    private readonly coupons: CouponRepository,
    private readonly engine: DiscountEngine,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  public async execute(command: CheckoutCommand): Promise<Order> {
    return this.unitOfWork.run(async (context) => {
      const products = await context.lockProducts(command.items.map((item) => item.productId));
      const cart = assembleCart(command.items, products);

      this.assertEnoughStock(cart);

      const coupon = await resolveCoupon(this.coupons, command.couponCode);
      const breakdown = this.engine.calculate({
        cart,
        coupon,
        requestedCouponCode: command.couponCode,
        moment: this.clock.now(),
      });

      await this.reduceStock(context, cart);

      return context.saveOrder(
        Order.fromCart({
          id: this.ids.next(),
          createdAt: this.clock.now(),
          cart,
          breakdown,
        }),
      );
    });
  }

  /** Reúne todos los faltantes antes de fallar, para reportarlos de una vez. */
  private assertEnoughStock(cart: Cart): void {
    const shortages: StockShortage[] = cart.lines
      .filter((line) => !line.product.hasStockFor(line.quantity))
      .map((line) => ({
        productId: line.product.id,
        requested: line.quantity,
        available: line.product.stock,
      }));

    if (shortages.length > 0) {
      throw new OutOfStockError(shortages);
    }
  }

  private async reduceStock(context: CheckoutContext, cart: Cart): Promise<void> {
    const updated: readonly Product[] = cart.lines.map((line) =>
      line.product.withStockReducedBy(line.quantity),
    );

    await context.saveProducts(updated);
  }
}

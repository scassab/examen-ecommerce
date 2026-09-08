import type { Category } from '../types/category';
import type { CouponStatus } from '../types/coupon';
import type { DiscountKind } from '../types/discount';

/** Línea del carrito ya resuelta contra el catálogo, con su precio aplicado. */
export interface QuoteLineDto {
  readonly productId: string;
  readonly name: string;
  readonly category: Category;
  readonly unitPriceInCents: number;
  readonly quantity: number;
  readonly lineSubtotalInCents: number;
}

/**
 * Un paso de la cascada de descuentos.
 *
 * `baseInCents` es el monto sobre el que se aplicó la regla, lo que hace la
 * cascada auditable: el cliente puede verificar cada paso en lugar de confiar
 * en un único número agregado.
 */
export interface DiscountLineDto {
  readonly kind: DiscountKind;
  readonly percentage: number;
  readonly baseInCents: number;
  readonly amountInCents: number;
}

/** Cupón enviado por el cliente y resultado de evaluarlo. */
export interface AppliedCouponDto {
  readonly code: string | null;
  readonly status: CouponStatus;
}

/**
 * Desglose completo que devuelve POST /api/cart/quote.
 *
 * Invariante que garantiza el backend:
 *   originalSubtotalInCents - totalDiscountInCents === totalInCents
 * donde totalDiscountInCents ya incluye `capAdjustmentInCents`, la corrección
 * negativa que se aplica cuando la cascada supera el tope absoluto.
 */
export interface QuoteResponseDto {
  readonly lines: readonly QuoteLineDto[];
  readonly originalSubtotalInCents: number;
  readonly discounts: readonly DiscountLineDto[];
  /** Monto retirado de la cascada cruda para respetar el tope. Cero si no se topó. */
  readonly capAdjustmentInCents: number;
  readonly totalDiscountInCents: number;
  /** Descuento efectivo sobre el subtotal original, en porcentaje con dos decimales. */
  readonly effectiveDiscountPercentage: number;
  readonly totalInCents: number;
  /** True cuando el tope truncó la cascada. Dispara la alerta persistente de la UI. */
  readonly capReached: boolean;
  /** Tope que aplica el motor, en porcentaje. Se envía para que la UI no lo hardcodee. */
  readonly maxDiscountPercentage: number;
  readonly coupon: AppliedCouponDto;
}

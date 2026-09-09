import type { CouponStatus } from '@ecommerce/shared';

import type { Cart } from '../models/cart';
import type { Coupon } from '../models/coupon';
import type { Money } from '../models/money';
import { Percentage } from '../models/percentage';

import { DiscountCapPolicy } from './discount-cap.policy';
import type { DiscountConfig } from './discount-config';
import type { DiscountRule, DiscountRuleResult } from './discount-rule';
import { DiscountRuleFactory } from './discount-rule.factory';

/** Datos con los que se pide un cálculo al motor. */
export interface DiscountCalculationInput {
  readonly cart: Cart;
  /**
   * Código tal como lo escribió el usuario, ya normalizado. Se recibe además
   * del cupón porque un código que no existe en el catálogo llega aquí como
   * `coupon: null`, y sin el código original sería indistinguible de "el
   * usuario no envió ningún cupón".
   */
  readonly requestedCouponCode: string | null;
  /** Cupón encontrado en el catálogo, o `null` si el código no existe. */
  readonly coupon: Coupon | null;
  /** Momento del cálculo; determina la vigencia del cupón. */
  readonly moment: Date;
}

/**
 * Resultado completo del motor.
 *
 * Invariante que el motor garantiza siempre:
 *   originalSubtotal - totalDiscount === total
 * y `totalDiscount` ya lleva descontado el `capAdjustment`.
 */
export interface DiscountBreakdown {
  readonly originalSubtotal: Money;
  readonly discounts: readonly DiscountRuleResult[];
  readonly capAdjustment: Money;
  readonly totalDiscount: Money;
  readonly effectivePercentage: Percentage;
  readonly total: Money;
  readonly capReached: boolean;
  readonly maxDiscountPercentage: Percentage;
  readonly couponCode: string | null;
  readonly couponStatus: CouponStatus;
}

/**
 * Motor de descuentos acumulativos.
 *
 * Recorre las reglas en orden aplicando cada una sobre el total que dejó la
 * anterior: la acumulación es multiplicativa en cascada, no una suma de
 * porcentajes. Después contrasta el resultado contra el tope absoluto.
 *
 * El motor no conoce ninguna regla concreta ni ninguna categoría: recibe
 * estrategias ya construidas y una política de tope. Es el punto donde se ve
 * que las matemáticas del negocio no dependen de Express, de TypeORM ni de la
 * forma de la respuesta HTTP.
 */
export class DiscountEngine {
  public constructor(
    private readonly rules: readonly DiscountRule[],
    private readonly capPolicy: DiscountCapPolicy,
  ) {}

  /** Construye el motor con las reglas y el tope que dicta la configuración. */
  public static fromConfig(config: DiscountConfig): DiscountEngine {
    return new DiscountEngine(
      new DiscountRuleFactory(config).createAll(),
      new DiscountCapPolicy(config.maxTotalDiscount),
    );
  }

  public calculate(input: DiscountCalculationInput): DiscountBreakdown {
    const originalSubtotal = input.cart.subtotal;
    const applied: DiscountRuleResult[] = [];

    let runningTotal = originalSubtotal;

    for (const rule of this.rules) {
      const result = rule.apply({
        cart: input.cart,
        runningTotal,
        coupon: input.coupon,
        moment: input.moment,
      });

      if (result !== null) {
        applied.push(result);
        runningTotal = runningTotal.subtract(result.amount);
      }
    }

    const rawDiscount = originalSubtotal.subtract(runningTotal);
    const cap = this.capPolicy.evaluate(originalSubtotal, rawDiscount);
    const totalDiscount = rawDiscount.subtract(cap.adjustment);

    return {
      originalSubtotal,
      discounts: applied,
      capAdjustment: cap.adjustment,
      totalDiscount,
      effectivePercentage: Percentage.of(totalDiscount, originalSubtotal),
      total: originalSubtotal.subtract(totalDiscount),
      capReached: cap.reached,
      maxDiscountPercentage: this.capPolicy.maxPercentage,
      couponCode: input.requestedCouponCode ?? input.coupon?.code ?? null,
      couponStatus: this.resolveCouponStatus(input),
    };
  }

  /**
   * Estado del cupón desde el punto de vista del cliente.
   *
   * Se reporta aparte del desglose porque un cupón rechazado no genera línea de
   * descuento pero sí tiene que explicarse en la interfaz.
   */
  private resolveCouponStatus(input: DiscountCalculationInput): CouponStatus {
    if (input.requestedCouponCode === null) {
      return 'NOT_PROVIDED';
    }

    if (input.coupon === null) {
      return 'INVALID';
    }

    return input.coupon.statusAt(input.moment);
  }
}

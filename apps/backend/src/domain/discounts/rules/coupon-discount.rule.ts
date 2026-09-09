import type { DiscountKind } from '@ecommerce/shared';

import type { DiscountRule, DiscountRuleInput, DiscountRuleResult } from '../discount-rule';

/**
 * Regla 3: descuento por cupón sobre el total acumulado.
 *
 * El porcentaje lo trae el propio cupón, no la configuración del motor: cada
 * código promocional puede valer algo distinto sin que el motor cambie.
 *
 * Un cupón inexistente, desactivado o vencido no es un error: la regla
 * simplemente no aplica y el desglose sale sin línea de cupón. Quién es el
 * responsable de contárselo al usuario es el motor, que reporta el estado.
 */
export class CouponDiscountRule implements DiscountRule {
  public readonly kind: DiscountKind = 'COUPON';

  public apply(input: DiscountRuleInput): DiscountRuleResult | null {
    const { coupon } = input;

    if (coupon === null || !coupon.isUsableAt(input.moment)) {
      return null;
    }

    return {
      kind: this.kind,
      percentage: coupon.percentage,
      base: input.runningTotal,
      amount: coupon.percentage.applyTo(input.runningTotal),
    };
  }
}

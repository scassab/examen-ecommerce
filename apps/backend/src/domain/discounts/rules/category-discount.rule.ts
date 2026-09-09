import type { DiscountKind } from '@ecommerce/shared';

import type { CategoryDiscountConfig } from '../discount-config';
import type { DiscountRule, DiscountRuleInput, DiscountRuleResult } from '../discount-rule';

/**
 * Regla 1: descuento sobre los productos de una categoría.
 *
 * Es la única regla cuya base **no** es el total corriente: se aplica solo sobre
 * el importe de las líneas de la categoría objetivo, tal como exige el
 * enunciado. Por eso se ejecuta primero, cuando el total corriente todavía
 * coincide con el subtotal original y no hay descuentos que la distorsionen.
 */
export class CategoryDiscountRule implements DiscountRule {
  public readonly kind: DiscountKind = 'CATEGORY';

  public constructor(private readonly config: CategoryDiscountConfig) {}

  public apply(input: DiscountRuleInput): DiscountRuleResult | null {
    const base = input.cart.subtotalOfCategory(this.config.category);

    if (base.isZero()) {
      return null;
    }

    return {
      kind: this.kind,
      percentage: this.config.percentage,
      base,
      amount: this.config.percentage.applyTo(base),
    };
  }
}

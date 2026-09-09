import type { DiscountKind } from '@ecommerce/shared';

import type { VolumeDiscountConfig } from '../discount-config';
import type { DiscountRule, DiscountRuleInput, DiscountRuleResult } from '../discount-rule';

/**
 * Regla 2: descuento por volumen sobre todo el carrito.
 *
 * El umbral se evalúa contra el total ya rebajado por la regla de categoría, y
 * la comparación es estricta: el enunciado dice "supera los 100 USD", así que
 * 100.00 exactos no dispara el descuento. Ese límite tiene su propia prueba
 * porque es el típico detalle que se implementa mal y nadie nota.
 */
export class VolumeDiscountRule implements DiscountRule {
  public readonly kind: DiscountKind = 'VOLUME';

  public constructor(private readonly config: VolumeDiscountConfig) {}

  public apply(input: DiscountRuleInput): DiscountRuleResult | null {
    if (!input.runningTotal.isGreaterThan(this.config.threshold)) {
      return null;
    }

    return {
      kind: this.kind,
      percentage: this.config.percentage,
      base: input.runningTotal,
      amount: this.config.percentage.applyTo(input.runningTotal),
    };
  }
}

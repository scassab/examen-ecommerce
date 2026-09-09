import type { DiscountConfig } from './discount-config';
import type { DiscountRule } from './discount-rule';
import { CategoryDiscountRule } from './rules/category-discount.rule';
import { CouponDiscountRule } from './rules/coupon-discount.rule';
import { VolumeDiscountRule } from './rules/volume-discount.rule';

/**
 * Fábrica de reglas de descuento (patrón Factory).
 *
 * Concentra dos decisiones que de otro modo quedarían repartidas: **qué** reglas
 * existen y **en qué orden** se aplican. El motor recibe una lista ya ordenada y
 * no sabe nada de las clases concretas, así que la precedencia del enunciado
 * vive en un solo sitio verificable en lugar de estar implícita en el orden en
 * que alguien las instanció.
 *
 * Cambiar una promoción es cambiar la configuración; añadir una regla nueva es
 * añadir una clase y una línea aquí.
 */
export class DiscountRuleFactory {
  public constructor(private readonly config: DiscountConfig) {}

  /** Reglas en el orden de precedencia exigido: categoría, volumen y cupón. */
  public createAll(): readonly DiscountRule[] {
    return [
      new CategoryDiscountRule(this.config.categoryDiscount),
      new VolumeDiscountRule(this.config.volumeDiscount),
      new CouponDiscountRule(),
    ];
  }
}

import type { DiscountKind } from '@ecommerce/shared';

import type { Cart } from '../models/cart';
import type { Coupon } from '../models/coupon';
import type { Money } from '../models/money';
import type { Percentage } from '../models/percentage';

/**
 * Todo lo que una regla puede mirar para decidir.
 *
 * `runningTotal` es lo que hace que la cascada sea secuencial y no una suma de
 * porcentajes: cada regla recibe el total que dejó la anterior, nunca el
 * subtotal original, salvo que su propia definición diga otra cosa.
 */
export interface DiscountRuleInput {
  readonly cart: Cart;
  readonly runningTotal: Money;
  readonly coupon: Coupon | null;
  /** Momento del cálculo; lo usa la regla de cupón para evaluar vigencia. */
  readonly moment: Date;
}

/**
 * Descuento concedido por una regla.
 *
 * Se reporta `base` además de `amount` para que el desglose sea auditable: quien
 * lo revise puede recalcular el paso a mano y llegar al mismo número.
 */
export interface DiscountRuleResult {
  readonly kind: DiscountKind;
  readonly percentage: Percentage;
  readonly base: Money;
  readonly amount: Money;
}

/**
 * Contrato de una regla de descuento (patrón Strategy).
 *
 * Cada regla es una estrategia intercambiable que ignora por completo a las
 * demás: no sabe cuántas hay, ni en qué orden se aplican, ni si existe un tope.
 * Añadir una promoción nueva es escribir una clase y registrarla en la fábrica,
 * sin tocar el motor ni las reglas existentes.
 *
 * Devolver `null` significa "esta regla no aplica a este carrito", que es
 * distinto de conceder un descuento de cero: lo primero no aparece en el
 * desglose, lo segundo sí.
 */
export interface DiscountRule {
  readonly kind: DiscountKind;
  apply(input: DiscountRuleInput): DiscountRuleResult | null;
}

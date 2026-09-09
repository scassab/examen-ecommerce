import type { Category } from '@ecommerce/shared';

import { Money } from '../models/money';
import { Percentage } from '../models/percentage';

/** Parámetros de la regla de descuento por categoría. */
export interface CategoryDiscountConfig {
  readonly category: Category;
  readonly percentage: Percentage;
}

/** Parámetros de la regla de descuento por volumen. */
export interface VolumeDiscountConfig {
  /** El descuento aplica cuando el total corriente **supera** este umbral. */
  readonly threshold: Money;
  readonly percentage: Percentage;
}

/**
 * Configuración completa del motor de descuentos.
 *
 * Los porcentajes y el tope entran por configuración en lugar de estar
 * incrustados en las reglas por dos razones concretas:
 *
 * 1. Auditoría: con los valores del enunciado (10%, 5% y 15% en cascada), el
 *    descuento máximo alcanzable es 1 - 0.90 x 0.95 x 0.85 = 27.325%, así que el
 *    tope del 35% resulta matemáticamente inalcanzable. Al ser configurable, el
 *    truncamiento se puede probar y demostrar sin falsear las reglas oficiales.
 * 2. Negocio: cambiar una promoción no debería exigir tocar el código de una
 *    regla ni volver a desplegar la lógica de cálculo.
 */
export interface DiscountConfig {
  readonly categoryDiscount: CategoryDiscountConfig;
  readonly volumeDiscount: VolumeDiscountConfig;
  /** Tope absoluto sobre el subtotal original; ninguna combinación lo supera. */
  readonly maxTotalDiscount: Percentage;
}

/** Umbral de volumen del enunciado: 100 USD expresados en centavos. */
const VOLUME_THRESHOLD_IN_CENTS = 10_000;

/**
 * Configuración oficial, exactamente la del enunciado.
 *
 * Es la que usa la aplicación por defecto; las pruebas y el perfil de demo
 * construyen variantes propias para ejercitar el tope.
 */
export const DEFAULT_DISCOUNT_CONFIG: DiscountConfig = {
  categoryDiscount: {
    category: 'TECHNOLOGY',
    percentage: Percentage.fromNumber(10),
  },
  volumeDiscount: {
    threshold: Money.fromCents(VOLUME_THRESHOLD_IN_CENTS),
    percentage: Percentage.fromNumber(5),
  },
  maxTotalDiscount: Percentage.fromNumber(35),
};

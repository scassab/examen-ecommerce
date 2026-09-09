/**
 * Reglas de descuento, en el orden exacto en que las aplica el motor.
 * La cascada es secuencial: cada regla se calcula sobre el total que dejó la
 * anterior, nunca sobre el subtotal original.
 */
export const DISCOUNT_KINDS = ['CATEGORY', 'VOLUME', 'COUPON'] as const;

export type DiscountKind = (typeof DISCOUNT_KINDS)[number];

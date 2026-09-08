import { z } from 'zod';

/** Cota superior defensiva: una línea nunca puede pedir más que esto. */
export const MAX_QUANTITY_PER_LINE = 99;

/** Los códigos de cupón son cortos por contrato; algo más largo es un payload malformado. */
export const MAX_COUPON_CODE_LENGTH = 32;

export const cartItemSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  quantity: z
    .number()
    .int('quantity must be an integer')
    .positive('quantity must be greater than zero')
    .max(MAX_QUANTITY_PER_LINE, `quantity must not exceed ${MAX_QUANTITY_PER_LINE}`),
});

/**
 * El código de cupón se normaliza aquí, en el borde del sistema, para que el
 * motor de descuentos solo vea un valor canónico: recortado, en mayúsculas y
 * `null` cuando el usuario envió la caja vacía.
 */
const couponCodeSchema = z
  .string()
  .max(MAX_COUPON_CODE_LENGTH, `couponCode must not exceed ${MAX_COUPON_CODE_LENGTH} characters`)
  .transform((value) => {
    const normalised = value.trim().toUpperCase();
    return normalised.length === 0 ? null : normalised;
  })
  .nullish();

/**
 * Payload que aceptan POST /api/cart/quote y POST /api/checkout.
 *
 * Los ids de producto duplicados se rechazan en lugar de fusionarse en
 * silencio: dos líneas del mismo producto harían ambigua la validación de stock
 * y la base del descuento, y un contrato que acepta ambigüedad termina
 * trasladando esa decisión al motor.
 */
export const quoteRequestSchema = z
  .object({
    items: z.array(cartItemSchema).min(1, 'the cart must contain at least one item'),
    couponCode: couponCodeSchema,
  })
  .superRefine((request, ctx) => {
    const seen = new Set<string>();

    request.items.forEach((item, index) => {
      if (seen.has(item.productId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'productId'],
          message: `duplicated productId "${item.productId}": merge both lines into a single quantity`,
        });
      }
      seen.add(item.productId);
    });
  });

/** El checkout acepta el mismo payload que una cotización; la diferencia es el efecto. */
export const checkoutRequestSchema = quoteRequestSchema;

export type CartItemDto = z.infer<typeof cartItemSchema>;
export type QuoteRequestDto = z.infer<typeof quoteRequestSchema>;
export type CheckoutRequestDto = z.infer<typeof checkoutRequestSchema>;

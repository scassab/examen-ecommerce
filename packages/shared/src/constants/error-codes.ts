/**
 * Códigos de errores que devuelve la API.
 */
export const ERROR_CODES = [
  'INVALID_PAYLOAD',
  'ROUTE_NOT_FOUND',
  'EMPTY_CART',
  'PRODUCT_NOT_FOUND',
  'OUT_OF_STOCK',
  'ORDER_NOT_FOUND',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

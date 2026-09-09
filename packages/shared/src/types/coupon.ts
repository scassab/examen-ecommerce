/**
 * Resultado de evaluar el código de cupón enviado por el cliente.
 *
 * Un problema con el cupón nunca hace fallar la petición: la cotización se
 * devuelve igual y se le informa al cliente por qué no se aplicó.
 */
export const COUPON_STATUSES = ['NOT_PROVIDED', 'APPLIED', 'INVALID', 'EXPIRED'] as const;

export type CouponStatus = (typeof COUPON_STATUSES)[number];

import type { ErrorCode, ValidationIssueDto } from '@ecommerce/shared';

import { DomainError } from '../../domain/errors/domain.error';

/**
 * Payload que no cumple el contrato de entrada.
 *
 * Extiende `DomainError` para viajar por el mismo canal que los errores de
 * negocio y que el manejador HTTP tenga un único camino de traducción, pero
 * vive en infraestructura porque describe un problema de transporte, no una
 * regla del dominio.
 */
export class InvalidPayloadError extends DomainError {
  public constructor(public readonly issues: readonly ValidationIssueDto[]) {
    super('INVALID_PAYLOAD', 'the request payload does not satisfy the contract');
  }
}

/**
 * Traducción de código de error a estado HTTP.
 *
 * Es una tabla y no una cadena de `if` a propósito: el compilador obliga a
 * cubrir cada código del contrato, así que añadir uno nuevo sin decidir su
 * estado rompe la compilación en lugar de devolver un 500 silencioso.
 */
export const STATUS_BY_ERROR_CODE: Readonly<Record<ErrorCode, number>> = {
  INVALID_PAYLOAD: 400,
  EMPTY_CART: 400,
  ROUTE_NOT_FOUND: 404,
  PRODUCT_NOT_FOUND: 404,
  ORDER_NOT_FOUND: 404,
  // 409 y no 400: el carrito era válido, pero el estado del servidor cambió.
  OUT_OF_STOCK: 409,
  INTERNAL_ERROR: 500,
};

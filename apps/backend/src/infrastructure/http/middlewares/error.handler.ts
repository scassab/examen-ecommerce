import type { ApiErrorDto } from '@ecommerce/shared';
import type { ErrorRequestHandler } from 'express';

import { DomainError, OutOfStockError } from '../../../domain/errors/domain.error';
import { InvalidPayloadError, STATUS_BY_ERROR_CODE } from '../http.errors';

/**
 * Detecta el error que lanza express.json() ante un cuerpo mal formado.
 *
 * Se comprueba la forma del error en vez de castearlo: el tipo de entrada es
 * `unknown` porque a un manejador de errores puede llegar cualquier cosa.
 */
const isMalformedJsonError = (error: unknown): error is SyntaxError =>
  error instanceof SyntaxError && 'body' in error;

/**
 * Manejador de errores final de la API.
 *
 * Es el único punto donde el dominio se traduce a HTTP. Los casos de uso lanzan
 * errores de negocio sin saber que existe un protocolo con códigos de estado, y
 * aquí se decide con qué número responde cada uno. Ese aislamiento es lo que
 * permite exponer mañana la misma lógica por otro transporte sin reescribirla.
 *
 * Lo inesperado se registra en el servidor y sale como 500 sin stack trace: el
 * cliente recibe un código estable, nunca detalles internos.
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof InvalidPayloadError) {
    const body: ApiErrorDto = {
      code: 'INVALID_PAYLOAD',
      message: error.message,
      issues: error.issues,
    };

    response.status(STATUS_BY_ERROR_CODE.INVALID_PAYLOAD).json(body);
    return;
  }

  if (error instanceof OutOfStockError) {
    const body: ApiErrorDto = {
      code: 'OUT_OF_STOCK',
      message: error.message,
      details: error.shortages,
    };

    response.status(STATUS_BY_ERROR_CODE.OUT_OF_STOCK).json(body);
    return;
  }

  if (error instanceof DomainError) {
    const body: ApiErrorDto = {
      code: error.code as Exclude<typeof error.code, 'OUT_OF_STOCK' | 'INVALID_PAYLOAD'>,
      message: error.message,
    };

    response.status(STATUS_BY_ERROR_CODE[error.code]).json(body);
    return;
  }

  if (isMalformedJsonError(error)) {
    const body: ApiErrorDto = {
      code: 'INVALID_PAYLOAD',
      message: 'the request body is not valid JSON',
      issues: [{ path: 'body', message: error.message }],
    };

    response.status(STATUS_BY_ERROR_CODE.INVALID_PAYLOAD).json(body);
    return;
  }

  console.error('[api] unhandled error', error);

  const body: ApiErrorDto = {
    code: 'INTERNAL_ERROR',
    message: 'unexpected error while processing the request',
  };

  response.status(STATUS_BY_ERROR_CODE.INTERNAL_ERROR).json(body);
};

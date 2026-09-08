import type { ApiErrorDto } from '@ecommerce/shared';
import type { ErrorRequestHandler } from 'express';

/**
 * Detecta el error que lanza express.json() ante un cuerpo mal formado.
 *
 * Se comprueba la forma del error en vez de castearlo: el tipo de entrada es
 * `unknown` porque puede llegar cualquier cosa a un manejador de errores.
 */
const isMalformedJsonError = (error: unknown): error is SyntaxError =>
  error instanceof SyntaxError && 'body' in error;

/**
 * Manejador de errores final de la API.
 *
 * Traduce lo inesperado a un contrato estable y nunca filtra el stack trace al
 * cliente: el detalle se registra en el servidor, el cliente recibe un código.
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (isMalformedJsonError(error)) {
    const body: ApiErrorDto = {
      code: 'INVALID_PAYLOAD',
      message: 'the request body is not valid JSON',
      issues: [{ path: 'body', message: error.message }],
    };

    response.status(400).json(body);
    return;
  }

  console.error('[api] unhandled error', error);

  const body: ApiErrorDto = {
    code: 'INTERNAL_ERROR',
    message: 'unexpected error while processing the request',
  };

  response.status(500).json(body);
};

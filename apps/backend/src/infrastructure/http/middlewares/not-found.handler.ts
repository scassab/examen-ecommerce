import type { ApiErrorDto } from '@ecommerce/shared';
import type { RequestHandler } from 'express';

/**
 * Última pieza de la cadena para peticiones que no casaron con ninguna ruta.
 *
 * Devuelve el mismo sobre de error que el resto de la API para que el cliente
 * no tenga que distinguir entre "error de negocio" y "ruta inexistente".
 */
export const notFoundHandler: RequestHandler = (request, response) => {
  const body: ApiErrorDto = {
    code: 'ROUTE_NOT_FOUND',
    message: `no route matches ${request.method} ${request.originalUrl}`,
  };

  response.status(404).json(body);
};

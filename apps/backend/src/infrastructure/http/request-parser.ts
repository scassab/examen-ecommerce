import type { ZodType, infer as Infer } from 'zod';

import { validate } from '@ecommerce/shared';

import { InvalidPayloadError } from './http.errors';

/**
 * Valida el cuerpo de la petición contra el esquema compartido.
 *
 * El cuerpo entra como `unknown` porque viene de la red: solo el esquema puede
 * estrecharlo. Reutilizar aquí el mismo esquema que usa el frontend es lo que
 * garantiza que cliente y servidor rechacen exactamente los mismos payloads.
 */
export const parseBodyOrThrow = <TSchema extends ZodType>(
  schema: TSchema,
  body: unknown,
): Infer<TSchema> => {
  const result = validate(schema, body);

  if (!result.success) {
    throw new InvalidPayloadError(result.issues);
  }

  return result.data;
};

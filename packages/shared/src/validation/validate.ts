import type { ZodType, infer as Infer } from 'zod';

import type { ValidationIssueDto } from '../dtos/error.dto';

/**
 * Resultado de validar un payload no confiable.
 *
 * Unión discriminada en lugar de excepciones: quien llama no puede alcanzar
 * `data` sin haber probado primero el éxito, y el paquete compartido queda
 * libre de cualquier detalle de transporte (sin códigos HTTP, sin errores de
 * framework).
 */
export type ValidationResult<TValue> =
  | { readonly success: true; readonly data: TValue }
  | { readonly success: false; readonly issues: readonly ValidationIssueDto[] };

/**
 * Valida `payload` contra `schema` y aplana los issues de Zod al formato que
 * expone la API. La entrada es `unknown` a propósito: viene de la red y debe
 * estrecharse mediante el esquema, nunca mediante un cast.
 */
export const validate = <TSchema extends ZodType>(
  schema: TSchema,
  payload: unknown,
): ValidationResult<Infer<TSchema>> => {
  const result = schema.safeParse(payload);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    })),
  };
};

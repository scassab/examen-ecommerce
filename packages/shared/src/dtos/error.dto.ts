import type { ErrorCode } from '../constants/error-codes';

/** Detalle por producto de un rechazo por stock, para que la UI señale la línea. */
export interface OutOfStockDetailDto {
  readonly productId: string;
  readonly requested: number;
  readonly available: number;
}

/** Violación de esquema, con una ruta con puntos del estilo "items.0.quantity". */
export interface ValidationIssueDto {
  readonly path: string;
  readonly message: string;
}

/**
 * Envoltura de error que devuelve la API.
 *
 * Modelada como unión discriminada en vez de una bolsa opcional `details`: así
 * el compilador obliga al cliente a estrechar sobre `code` antes de leer la
 * carga extra, lo que elimina la necesidad de casts o de `any` en el consumidor.
 */
export type ApiErrorDto =
  | {
      readonly code: 'OUT_OF_STOCK';
      readonly message: string;
      readonly details: readonly OutOfStockDetailDto[];
    }
  | {
      readonly code: 'INVALID_PAYLOAD';
      readonly message: string;
      readonly issues: readonly ValidationIssueDto[];
    }
  | {
      readonly code: Exclude<ErrorCode, 'OUT_OF_STOCK' | 'INVALID_PAYLOAD'>;
      readonly message: string;
    };

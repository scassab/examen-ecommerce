import type { ErrorCode } from '@ecommerce/shared';

/**
 * Raíz de los errores de negocio.
 *
 * Cada error carga el código del contrato compartido, de modo que el adaptador
 * HTTP traduce dominio a respuesta sin una cadena de `if` por caso: el dominio
 * decide qué pasó, la infraestructura decide con qué estado se responde.
 */
export abstract class DomainError extends Error {
  protected constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Valor que viola una invariante del modelo (dinero, cantidades, porcentajes). */
export class InvalidValueError extends DomainError {
  public constructor(message: string) {
    super('INVALID_PAYLOAD', message);
  }
}

/** El carrito llegó sin líneas: no hay nada que cotizar ni que cobrar. */
export class EmptyCartError extends DomainError {
  public constructor() {
    super('EMPTY_CART', 'the cart must contain at least one line');
  }
}

/**
 * El mismo producto aparece en dos líneas.
 *
 * Se rechaza en el dominio además de en el esquema de entrada: la regla protege
 * una invariante del carrito, y el modelo no puede depender de que alguien haya
 * validado antes.
 */
export class DuplicatedProductError extends DomainError {
  public constructor(public readonly productId: string) {
    super('INVALID_PAYLOAD', `product "${productId}" appears in more than one cart line`);
  }
}

/** Se pidió más unidades de las disponibles. */
export class InsufficientStockError extends DomainError {
  public constructor(
    public readonly productId: string,
    public readonly requested: number,
    public readonly available: number,
  ) {
    super(
      'OUT_OF_STOCK',
      `product "${productId}" has ${available} units available but ${requested} were requested`,
    );
  }
}

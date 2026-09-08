import { InvalidValueError } from '../errors/domain.error';

import type { Percentage } from './percentage';

/**
 * Importe monetario expresado en centavos enteros.
 *
 * El dinero nunca se representa como decimal: la cascada de descuentos
 * multiplica tres veces sobre el mismo importe, y con coma flotante el error se
 * arrastra hasta el total que el negocio exige exacto. Trabajar en enteros
 * elimina la clase de error completa en lugar de mitigarla con redondeos.
 *
 * El objeto es inmutable: toda operación devuelve una instancia nueva.
 */
export class Money {
  private constructor(private readonly cents: number) {}

  public static fromCents(cents: number): Money {
    if (!Number.isInteger(cents)) {
      throw new InvalidValueError(`money must be an integer amount of cents, received ${cents}`);
    }

    if (cents < 0) {
      throw new InvalidValueError(`money cannot be negative, received ${cents}`);
    }

    return new Money(cents);
  }

  public static zero(): Money {
    return new Money(0);
  }

  /** Suma una lista de importes; la lista vacía suma cero. */
  public static sum(values: readonly Money[]): Money {
    return values.reduce<Money>((total, value) => total.add(value), Money.zero());
  }

  public get inCents(): number {
    return this.cents;
  }

  public add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  /**
   * Resta y falla si el resultado sería negativo.
   *
   * Un total negativo solo puede venir de un error de cálculo, así que el modelo
   * lo convierte en excepción en lugar de dejar que llegue a la respuesta.
   */
  public subtract(other: Money): Money {
    if (other.cents > this.cents) {
      throw new InvalidValueError(
        `cannot subtract ${other.cents} cents from ${this.cents} cents without going negative`,
      );
    }

    return new Money(this.cents - other.cents);
  }

  /** Multiplica por una cantidad de unidades (entero no negativo). */
  public multipliedBy(quantity: number): Money {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new InvalidValueError(`quantity must be a non negative integer, received ${quantity}`);
    }

    return new Money(this.cents * quantity);
  }

  /**
   * Aplica un porcentaje y redondea al centavo más cercano.
   *
   * El redondeo es "half-up", el criterio comercial habitual: media unidad
   * favorece al importe mayor. Se documenta porque el resultado del motor debe
   * ser reproducible por quien audite la orden.
   */
  public percentage(percentage: Percentage): Money {
    return new Money(Math.round((this.cents * percentage.value) / 100));
  }

  public isZero(): boolean {
    return this.cents === 0;
  }

  public isGreaterThan(other: Money): boolean {
    return this.cents > other.cents;
  }

  public equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  /** Devuelve el menor de los dos importes; lo usa el tope de descuento. */
  public min(other: Money): Money {
    return this.cents <= other.cents ? this : other;
  }
}

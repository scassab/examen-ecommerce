import { InvalidValueError } from '../errors/domain.error';

import type { Money } from './money';

/** Máximo admitido: un descuento del 100% deja el importe en cero. */
const MAX_PERCENTAGE = 100;

/** Decimales con los que se expresa un porcentaje efectivo. */
const DECIMALS = 2;

/**
 * Porcentaje entre 0 y 100.
 *
 * Existe como tipo propio para cerrar una confusión clásica: `0.1` y `10` son el
 * mismo descuento escrito en dos escalas, y mezclarlas produce un error que las
 * pruebas de un solo caso no detectan. Al obligar a construir el valor, la
 * escala queda fijada en un único sitio.
 */
export class Percentage {
  private constructor(private readonly rate: number) {}

  public static fromNumber(value: number): Percentage {
    if (!Number.isFinite(value)) {
      throw new InvalidValueError(`percentage must be a finite number, received ${value}`);
    }

    if (value < 0 || value > MAX_PERCENTAGE) {
      throw new InvalidValueError(`percentage must be between 0 and 100, received ${value}`);
    }

    return new Percentage(value);
  }

  public static zero(): Percentage {
    return new Percentage(0);
  }

  /**
   * Porcentaje que representa `part` sobre `whole`, redondeado a dos decimales.
   *
   * Un total original de cero no admite porcentaje: se devuelve cero en lugar de
   * dividir por cero, porque un carrito sin importe tampoco tiene descuento.
   */
  public static of(part: Money, whole: Money): Percentage {
    if (whole.isZero()) {
      return Percentage.zero();
    }

    const factor = 10 ** DECIMALS;
    const rate = Math.round((part.inCents / whole.inCents) * MAX_PERCENTAGE * factor) / factor;

    return new Percentage(rate);
  }

  public get value(): number {
    return this.rate;
  }

  public isZero(): boolean {
    return this.rate === 0;
  }

  public isGreaterThan(other: Percentage): boolean {
    return this.rate > other.rate;
  }

  /** Importe que resulta de aplicar este porcentaje sobre una base. */
  public applyTo(base: Money): Money {
    return base.percentage(this);
  }
}

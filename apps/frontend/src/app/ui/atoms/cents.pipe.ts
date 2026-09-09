import { Pipe, type PipeTransform } from '@angular/core';

/** Un dólar son cien centavos; la API siempre habla en centavos enteros. */
const CENTS_PER_UNIT = 100;

const FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Convierte centavos enteros en un importe legible.
 *
 * Es el **único** punto del frontend donde el dinero deja de ser un entero. Toda
 * la aritmética ocurre en el servidor con centavos, y aquí solo se formatea para
 * presentación: nunca se suma ni se multiplica el número decimal resultante.
 */
@Pipe({ name: 'cents' })
export class CentsPipe implements PipeTransform {
  public transform(valueInCents: number): string {
    return FORMATTER.format(valueInCents / CENTS_PER_UNIT);
  }
}

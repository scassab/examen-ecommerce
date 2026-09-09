import { randomUUID } from 'node:crypto';

import type { Clock, IdGenerator } from '../../domain/ports/services';

/** Implementación real del reloj; el dominio nunca la conoce. */
export class SystemClock implements Clock {
  public now(): Date {
    return new Date();
  }
}

/** Identificadores UUID v4 para órdenes y sus filas hijas. */
export class UuidGenerator implements IdGenerator {
  public next(): string {
    return randomUUID();
  }
}

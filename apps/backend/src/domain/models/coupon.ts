import type { CouponStatus } from '@ecommerce/shared';

import { InvalidValueError } from '../errors/domain.error';

import type { Percentage } from './percentage';

export interface CouponProperties {
  readonly code: string;
  readonly percentage: Percentage;
  readonly active: boolean;
  /** Fecha de expiración; `null` significa que no caduca. */
  readonly expiresAt: Date | null;
}

/**
 * Cupón promocional.
 *
 * La validez se evalúa contra una fecha que entra por parámetro en lugar de leer
 * el reloj del sistema: así la expiración es comprobable en una prueba sin
 * manipular el tiempo global del proceso.
 */
export class Coupon {
  public readonly code: string;
  public readonly percentage: Percentage;
  public readonly active: boolean;
  public readonly expiresAt: Date | null;

  public constructor(properties: CouponProperties) {
    if (properties.code.trim().length === 0) {
      throw new InvalidValueError('coupon code cannot be empty');
    }

    this.code = properties.code;
    this.percentage = properties.percentage;
    this.active = properties.active;
    this.expiresAt = properties.expiresAt;
  }

  public hasExpiredAt(moment: Date): boolean {
    return this.expiresAt !== null && this.expiresAt.getTime() <= moment.getTime();
  }

  public isUsableAt(moment: Date): boolean {
    return this.active && !this.hasExpiredAt(moment);
  }

  /**
   * Estado del cupón en un momento dado.
   *
   * Un cupón desactivado se reporta como inválido y no como expirado: para el
   * cliente son situaciones distintas y la UI las explica de forma diferente.
   */
  public statusAt(moment: Date): Extract<CouponStatus, 'APPLIED' | 'INVALID' | 'EXPIRED'> {
    if (!this.active) {
      return 'INVALID';
    }

    return this.hasExpiredAt(moment) ? 'EXPIRED' : 'APPLIED';
  }
}

import { Injectable, signal } from '@angular/core';

export interface SessionUser {
  readonly name: string;
  readonly initials: string;
}

/**
 * Sesión simulada.
 *
 * La prueba técnica no pide autenticación: no hay usuarios en base de datos ni
 * endpoint de login. Este servicio existe para que la interfaz muestre quién
 * está comprando, y está aislado a propósito, de modo que sustituirlo mañana por
 * una sesión real solo afecte a este archivo.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly currentUser = signal<SessionUser>({
    name: 'Sergio Castro',
    initials: 'SC',
  });

  public readonly user = this.currentUser.asReadonly();
}

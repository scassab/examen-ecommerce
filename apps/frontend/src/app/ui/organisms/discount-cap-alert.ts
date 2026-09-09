import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Aviso de tope de descuento alcanzado (HU 4).
 *
 * Es **persistente y no descartable** a propósito: el enunciado pide una
 * notificación que permanezca mientras la condición siga siendo cierta, no un
 * toast que desaparezca solo. Aparece y se va únicamente porque el servidor
 * dice que el tope se alcanzó, nunca porque el cliente lo cierre.
 *
 * El porcentaje llega del backend en lugar de estar escrito aquí: si mañana el
 * negocio cambia el tope al 40%, el mensaje se actualiza sin tocar el frontend.
 */
@Component({
  selector: 'app-discount-cap-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './discount-cap-alert.html',
  styleUrl: './discount-cap-alert.scss',
})
export class DiscountCapAlert {
  public readonly visible = input.required<boolean>();
  public readonly maxDiscountPercentage = input.required<number>();

  protected readonly message = computed(
    () =>
      `¡Enhorabuena! Has alcanzado el límite máximo de ahorro permitido (${this.maxDiscountPercentage()}%)`,
  );
}

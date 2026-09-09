import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';

import { CentsPipe } from '../atoms/cents.pipe';

/** Una línea del carrito nunca baja de una unidad; para quitarla está la papelera. */
const MIN_QUANTITY = 1;

/** Datos que la línea necesita mostrar; el store decide de dónde salen. */
export interface CartLineView {
  readonly productId: string;
  readonly name: string;
  readonly unitPriceInCents: number;
  readonly quantity: number;
  readonly lineSubtotalInCents: number;
  /** Existencias del catálogo: techo del selector de cantidad. */
  readonly stock: number;
}

/**
 * Línea del carrito con su selector de cantidad.
 *
 * El selector está acotado por el stock disponible, de modo que la interfaz
 * impide construir un carrito que el backend va a rechazar. Es una comodidad,
 * no una garantía: el servidor vuelve a validar existencias dentro de la
 * transacción, porque el stock puede cambiar mientras el cliente decide.
 */
@Component({
  selector: 'app-cart-line',
  imports: [FormsModule, InputNumberModule, ButtonModule, CentsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart-line.html',
  styleUrl: './cart-line.scss',
})
export class CartLine {
  public readonly line = input.required<CartLineView>();

  public readonly quantityChange = output<number>();
  public readonly remove = output<string>();

  protected onQuantityChange(quantity: number | null): void {
    // PrimeNG emite `null` cuando el campo queda vacío: se ignora en lugar de
    // propagar una cantidad inválida hasta el store.
    if (quantity === null) {
      return;
    }

    // El acotado vive aquí y no en la plantilla porque PrimeNG 22 dejó de
    // exponer `min` y `max` como entradas del componente. Hacerlo en código
    // además lo vuelve comprobable sin renderizar nada.
    const clamped = Math.min(Math.max(Math.trunc(quantity), MIN_QUANTITY), this.line().stock);

    if (clamped !== this.line().quantity) {
      this.quantityChange.emit(clamped);
    }
  }

  protected onRemove(): void {
    this.remove.emit(this.line().productId);
  }
}

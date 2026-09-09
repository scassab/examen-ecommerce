import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CouponStatus } from '@ecommerce/shared';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

type MessageSeverity = 'success' | 'error' | 'warn';

/** Texto y color de cada resultado posible de un cupón. */
const FEEDBACK: Readonly<
  Record<
    Exclude<CouponStatus, 'NOT_PROVIDED'>,
    { readonly severity: MessageSeverity; readonly text: string }
  >
> = {
  APPLIED: { severity: 'success', text: 'Cupón aplicado correctamente.' },
  INVALID: { severity: 'error', text: 'El cupón no existe o ya no está activo.' },
  EXPIRED: { severity: 'warn', text: 'El cupón está vencido.' },
};

/**
 * Caja de cupón con su resultado.
 *
 * Tiene dos estados excluyentes: mientras no hay cupón aplicado se muestra el
 * campo de texto; en cuanto hay uno, el campo se sustituye por una etiqueta con
 * el código y su aspa para retirarlo.
 *
 * Es coherente con la regla de negocio: el enunciado admite **un solo cupón por
 * compra**, así que ofrecer el campo mientras ya hay uno aplicado invitaría a
 * una acumulación que el motor no soporta. Para cambiar de cupón, primero se
 * retira el actual.
 *
 * El estado del cupón lo decide el backend y aquí solo se traduce a un mensaje:
 * la interfaz no reimplementa la validación, porque duplicar esa regla es
 * exactamente cómo cliente y servidor terminan diciendo cosas distintas.
 */
@Component({
  selector: 'app-coupon-input',
  imports: [FormsModule, InputTextModule, ButtonModule, MessageModule, ChipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './coupon-input.html',
  styleUrl: './coupon-input.scss',
})
export class CouponInput {
  public readonly status = input<CouponStatus>('NOT_PROVIDED');
  /** Código en vigor; `null` significa que no hay ninguno aplicado. */
  public readonly appliedCode = input<string | null>(null);
  public readonly disabled = input<boolean>(false);

  public readonly apply = output<string>();
  public readonly clear = output<void>();

  protected readonly code = signal('');

  protected readonly feedback = computed(() => {
    const status = this.status();

    return status === 'NOT_PROVIDED' ? null : FEEDBACK[status];
  });

  /** La etiqueta hereda el color del resultado: verde si aplicó, rojo si no. */
  protected readonly chipStyleClass = computed(() => {
    const status = this.status();

    if (status === 'APPLIED') {
      return 'coupon__chip coupon__chip--applied';
    }

    return status === 'NOT_PROVIDED' ? 'coupon__chip' : 'coupon__chip--rejected coupon__chip';
  });

  protected readonly canApply = computed(() => this.code().trim().length > 0);

  protected onCodeChange(value: string): void {
    this.code.set(value);
  }

  protected onApply(): void {
    if (!this.canApply()) {
      return;
    }

    this.apply.emit(this.code().trim().toUpperCase());
    // El campo se vacia tras aplicar: el cupon vigente pasa a verse en la
    // etiqueta de abajo, asi que dejarlo escrito solo duplicaria la informacion.
    this.code.set('');
  }

  protected onClear(): void {
    this.code.set('');
    this.clear.emit();
  }
}

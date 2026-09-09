import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CouponStatus } from '@ecommerce/shared';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

type MessageSeverity = 'success' | 'error' | 'warn';

/** Texto y color de cada resultado posible de un cupón. */
const FEEDBACK: Readonly<Record<Exclude<CouponStatus, 'NOT_PROVIDED'>, {
  readonly severity: MessageSeverity;
  readonly text: string;
}>> = {
  APPLIED: { severity: 'success', text: 'Cupón aplicado correctamente.' },
  INVALID: { severity: 'error', text: 'El cupón no existe o ya no está activo.' },
  EXPIRED: { severity: 'warn', text: 'El cupón está vencido.' },
};

/**
 * Caja de cupón con su resultado.
 *
 * El estado del cupón lo decide el backend y aquí solo se traduce a un mensaje:
 * la interfaz no reimplementa la validación, porque duplicar esa regla es
 * exactamente cómo cliente y servidor terminan diciendo cosas distintas.
 */
@Component({
  selector: 'app-coupon-input',
  imports: [FormsModule, InputTextModule, ButtonModule, MessageModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './coupon-input.html',
  styleUrl: './coupon-input.scss',
})
export class CouponInput {
  public readonly status = input<CouponStatus>('NOT_PROVIDED');
  public readonly disabled = input<boolean>(false);

  public readonly apply = output<string>();
  public readonly clear = output<void>();

  protected readonly code = signal('');

  protected readonly feedback = computed(() => {
    const status = this.status();

    return status === 'NOT_PROVIDED' ? null : FEEDBACK[status];
  });

  protected readonly canApply = computed(() => this.code().trim().length > 0);

  protected onCodeChange(value: string): void {
    this.code.set(value);
  }

  protected onApply(): void {
    if (this.canApply()) {
      this.apply.emit(this.code().trim().toUpperCase());
    }
  }

  protected onClear(): void {
    this.code.set('');
    this.clear.emit();
  }
}

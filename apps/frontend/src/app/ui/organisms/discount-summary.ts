import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { DiscountKind, QuoteResponseDto } from '@ecommerce/shared';

import { CentsPipe } from '../atoms/cents.pipe';

/**
 * Etiqueta de cada regla.
 *
 * El orden y el significado los define el backend; aquí solo se traduce el
 * código a un texto que el cliente entienda.
 */
const DISCOUNT_LABELS: Readonly<Record<DiscountKind, string>> = {
  CATEGORY: 'Descuento de categoría (Tecnología)',
  VOLUME: 'Descuento por volumen',
  COUPON: 'Descuento por cupón',
};

/**
 * Desglose de descuentos tal como lo calculó el servidor.
 *
 * Muestra cada regla con su porcentaje y su importe, el ajuste por tope cuando
 * lo hubo, el ahorro total, el porcentaje efectivo y el total a pagar. No
 * calcula nada: si sumara por su cuenta, tarde o temprano mostraría una cifra
 * distinta de la que se cobra.
 */
@Component({
  selector: 'app-discount-summary',
  imports: [CentsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './discount-summary.html',
  styleUrl: './discount-summary.scss',
})
export class DiscountSummary {
  public readonly quote = input.required<QuoteResponseDto | null>();
  public readonly subtotalInCents = input.required<number>();

  protected readonly lines = computed(() =>
    (this.quote()?.discounts ?? []).map((discount) => ({
      label: DISCOUNT_LABELS[discount.kind],
      percentage: discount.percentage,
      amountInCents: discount.amountInCents,
    })),
  );

  protected readonly capAdjustmentInCents = computed(
    () => this.quote()?.capAdjustmentInCents ?? 0,
  );

  protected readonly totalDiscountInCents = computed(
    () => this.quote()?.totalDiscountInCents ?? 0,
  );

  protected readonly effectivePercentage = computed(
    () => this.quote()?.effectiveDiscountPercentage ?? 0,
  );

  /** Sin cotización todavía, el total a pagar es el subtotal sin descontar. */
  protected readonly totalInCents = computed(
    () => this.quote()?.totalInCents ?? this.subtotalInCents(),
  );

  protected readonly hasDiscounts = computed(() => this.totalDiscountInCents() > 0);
}

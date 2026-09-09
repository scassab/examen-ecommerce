import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TagModule } from 'primeng/tag';

/** Por debajo de estas unidades se avisa al cliente de que quedan pocas. */
const LOW_STOCK_THRESHOLD = 3;

type StockSeverity = 'success' | 'warn' | 'danger';

/**
 * Estado de existencias de un producto.
 *
 * Traduce un número a las tres situaciones que le importan al cliente: hay,
 * quedan pocas o se agotó. El umbral vive aquí y no repartido por las plantillas.
 */
@Component({
  selector: 'app-stock-badge',
  imports: [TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p-tag [severity]="severity()" [value]="label()" [rounded]="true" />`,
})
export class StockBadge {
  public readonly stock = input.required<number>();

  protected readonly severity = computed<StockSeverity>(() => {
    if (this.stock() === 0) {
      return 'danger';
    }

    return this.stock() <= LOW_STOCK_THRESHOLD ? 'warn' : 'success';
  });

  protected readonly label = computed<string>(() => {
    if (this.stock() === 0) {
      return 'Agotado';
    }

    return this.stock() <= LOW_STOCK_THRESHOLD
      ? `Últimas ${this.stock()} unidades`
      : `${this.stock()} disponibles`;
  });
}

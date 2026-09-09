import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { ProductDto } from '@ecommerce/shared';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

import { CentsPipe } from '../atoms/cents.pipe';
import { CategoryBadge } from '../atoms/category-badge';
import { StockBadge } from '../atoms/stock-badge';

/**
 * Tarjeta de producto del catálogo.
 *
 * Es presentacional pura: recibe el producto y cuántas unidades hay ya en el
 * carrito, y se limita a emitir la intención de agregar. No conoce el store, no
 * llama a la API y no decide nada del negocio, así que se prueba sin montar
 * media aplicación.
 *
 * La única lógica que sí vive aquí es de interfaz: deshabilitar el botón cuando
 * el carrito ya agotó las existencias, para que el cliente no descubra el
 * rechazo por stock hasta después de pagar.
 */
@Component({
  selector: 'app-product-card',
  imports: [CardModule, ButtonModule, CategoryBadge, StockBadge, CentsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {
  public readonly product = input.required<ProductDto>();
  /** Unidades de este producto que el carrito ya reserva. */
  public readonly quantityInCart = input<number>(0);

  public readonly add = output<ProductDto>();

  protected readonly remainingStock = computed(() =>
    Math.max(this.product().stock - this.quantityInCart(), 0),
  );

  protected readonly canAdd = computed(() => this.remainingStock() > 0);

  protected readonly actionLabel = computed(() =>
    this.canAdd() ? 'Agregar' : 'Sin existencias',
  );

  protected onAdd(): void {
    if (this.canAdd()) {
      this.add.emit(this.product());
    }
  }
}

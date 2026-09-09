import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ProductDto } from '@ecommerce/shared';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { ProductCard } from '../molecules/product-card';

/**
 * Rejilla del catálogo.
 *
 * Distingue las cuatro situaciones que puede vivir una carga remota: cargando,
 * con error, vacía y con datos. Mostrar una rejilla vacía cuando en realidad
 * falló la red es la forma más barata de que el usuario crea que la tienda no
 * tiene productos.
 */
@Component({
  selector: 'app-product-grid',
  imports: [ProductCard, MessageModule, ButtonModule, ProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-grid.html',
  styleUrl: './product-grid.scss',
})
export class ProductGrid {
  public readonly products = input.required<readonly ProductDto[]>();
  /** Unidades ya reservadas por el carrito, indexadas por producto. */
  public readonly quantities = input.required<ReadonlyMap<string, number>>();
  public readonly loading = input<boolean>(false);
  public readonly errorMessage = input<string | null>(null);

  public readonly add = output<ProductDto>();
  public readonly retry = output<void>();

  protected quantityOf(productId: string): number {
    return this.quantities().get(productId) ?? 0;
  }
}

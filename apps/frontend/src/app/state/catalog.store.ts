import type { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { ProductDto } from '@ecommerce/shared';

import { ApiClient } from '../core/api/api-client';

import { CartStore } from './cart.store';

/** Mensaje único de fallo de catálogo: el detalle técnico va a la consola. */
const LOAD_ERROR = 'No se pudo cargar el catálogo. Verifica que el servidor esté disponible.';

/**
 * Catálogo de productos.
 *
 * Mantiene las tres señales que cualquier carga remota necesita —datos, carga y
 * error— para que la interfaz distinga "cargando" de "vacío" y de "falló", en
 * lugar de mostrar una pantalla en blanco ambigua.
 *
 * Al recargar sincroniza el carrito con las existencias frescas: después de una
 * compra el stock cambió y el carrito no puede seguir ofreciendo unidades que
 * ya no existen.
 */
@Injectable({ providedIn: 'root' })
export class CatalogStore {
  private readonly api = inject(ApiClient);
  private readonly cart = inject(CartStore);

  private readonly products = signal<readonly ProductDto[]>([]);
  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);

  public readonly items = this.products.asReadonly();
  public readonly isLoading = this.loading.asReadonly();
  public readonly errorMessage = this.error.asReadonly();

  public readonly isEmpty = computed(
    () => !this.loading() && this.error() === null && this.products().length === 0,
  );

  public load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.listProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.cart.syncWithCatalog(products);
        this.loading.set(false);
      },
      error: (failure: HttpErrorResponse) => {
        console.error('[catalog] load failed', failure.status, failure.message);
        this.error.set(LOAD_ERROR);
        this.loading.set(false);
      },
    });
  }
}

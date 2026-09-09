import type { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import type { ApiErrorDto, CartItemDto, OrderDto, QuoteResponseDto } from '@ecommerce/shared';
import type { Observable } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { ApiClient } from '../core/api/api-client';

import { CartStore } from './cart.store';
import { CatalogStore } from './catalog.store';

/**
 * Espera antes de cotizar.
 *
 * Sin ella, mantener pulsado el "+" de una cantidad dispararía una petición por
 * pulsación. Con 250 ms el desglose sigue percibiéndose inmediato y el servidor
 * recibe una sola llamada por ráfaga.
 */
const QUOTE_DEBOUNCE_MS = 250;

const CHECKOUT_ERRORS: Readonly<Record<string, string>> = {
  OUT_OF_STOCK: 'Algún producto se quedó sin existencias. Revisa las cantidades del carrito.',
  PRODUCT_NOT_FOUND: 'Un producto del carrito ya no está disponible.',
  EMPTY_CART: 'El carrito está vacío.',
  INVALID_PAYLOAD: 'El carrito tiene datos inválidos.',
};

const GENERIC_ERROR = 'No se pudo completar la operación. Inténtalo de nuevo.';

/** Comprueba la forma del error sin castear a ciegas lo que llega de la red. */
const isApiError = (value: unknown): value is ApiErrorDto =>
  typeof value === 'object' && value !== null && 'code' in value;

const messageFor = (failure: HttpErrorResponse): string => {
  if (!isApiError(failure.error)) {
    return GENERIC_ERROR;
  }

  return CHECKOUT_ERRORS[failure.error.code] ?? GENERIC_ERROR;
};

interface QuoteRequestKey {
  readonly items: readonly CartItemDto[];
  readonly couponCode: string | null;
}

/**
 * Cotización del carrito contra el backend.
 *
 * Es la pieza que materializa la decisión de arquitectura más importante del
 * frontend: **el motor de descuentos no se replica aquí**. Cada cambio del
 * carrito o del cupón dispara una cotización, y el desglose que se pinta es
 * exactamente el que calculó el servidor. El precio de esa honestidad son 250 ms
 * de espera; el beneficio es que cliente y servidor no pueden discrepar.
 *
 * `switchMap` descarta la respuesta de una cotización obsoleta si el cliente
 * volvió a tocar el carrito: sin eso, una respuesta lenta podría pisar a una
 * más reciente y mostrar un total que ya no corresponde.
 */
@Injectable({ providedIn: 'root' })
export class QuoteStore {
  private readonly api = inject(ApiClient);
  private readonly cart = inject(CartStore);
  private readonly catalog = inject(CatalogStore);
  private readonly destroyRef = inject(DestroyRef);

  private readonly coupon = signal<string | null>(null);
  private readonly quote = signal<QuoteResponseDto | null>(null);
  private readonly quoting = signal(false);
  private readonly submitting = signal(false);
  private readonly error = signal<string | null>(null);
  private readonly order = signal<OrderDto | null>(null);

  public readonly couponCode = this.coupon.asReadonly();
  public readonly current = this.quote.asReadonly();
  public readonly isQuoting = this.quoting.asReadonly();
  public readonly isSubmitting = this.submitting.asReadonly();
  public readonly errorMessage = this.error.asReadonly();
  public readonly lastOrder = this.order.asReadonly();

  public readonly couponStatus = computed(() => this.quote()?.coupon.status ?? 'NOT_PROVIDED');

  /** El tope solo se anuncia cuando el servidor confirma que se alcanzó. */
  public readonly capReached = computed(() => this.quote()?.capReached ?? false);

  private readonly request = computed<QuoteRequestKey>(() => ({
    items: this.cart.requestItems(),
    couponCode: this.coupon(),
  }));

  public constructor() {
    toObservable(this.request)
      .pipe(
        debounceTime(QUOTE_DEBOUNCE_MS),
        distinctUntilChanged(
          (previous, next) => JSON.stringify(previous) === JSON.stringify(next),
        ),
        switchMap((request) => this.quoteFor(request)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((quote) => {
        if (quote !== null) {
          this.quote.set(quote);
          this.quoting.set(false);
        }
      });
  }

  public applyCoupon(code: string): void {
    this.coupon.set(code);
  }

  public clearCoupon(): void {
    this.coupon.set(null);
  }

  public dismissOrder(): void {
    this.order.set(null);
  }

  /**
   * Confirma la compra.
   *
   * Tras el éxito vacía el carrito, olvida el cupón y recarga el catálogo: el
   * stock cambió en el servidor y la pantalla debe reflejarlo sin recargar la
   * página.
   */
  public checkout(): void {
    if (this.cart.isEmpty() || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.api
      // El contrato espera un arreglo mutable; el store lo guarda inmutable.
      .checkout({ items: [...this.cart.requestItems()], couponCode: this.coupon() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.order.set(order);
          this.cart.clear();
          this.coupon.set(null);
          this.quote.set(null);
          this.submitting.set(false);
          this.catalog.load();
        },
        error: (failure: HttpErrorResponse) => {
          this.error.set(messageFor(failure));
          this.submitting.set(false);
          // El catálogo se recarga igualmente: si falló por stock, las
          // existencias que muestra la pantalla ya no eran ciertas.
          this.catalog.load();
        },
      });
  }

  /**
   * Cotiza el carrito, o lo limpia cuando ya no hay nada que cotizar.
   *
   * Los errores se capturan aquí dentro y no en el `subscribe`: si el error
   * llegara al flujo exterior, el observable se completaría y la pantalla
   * dejaría de cotizar para siempre tras el primer fallo de red.
   */
  private quoteFor(request: QuoteRequestKey): Observable<QuoteResponseDto | null> {
    if (request.items.length === 0) {
      this.quote.set(null);
      this.quoting.set(false);
      this.error.set(null);

      return of(null);
    }

    this.quoting.set(true);
    this.error.set(null);

    return this.api.quote({ items: [...request.items], couponCode: request.couponCode }).pipe(
      catchError((failure: HttpErrorResponse) => {
        this.error.set(messageFor(failure));
        this.quote.set(null);
        this.quoting.set(false);

        return of(null);
      }),
    );
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  CheckoutRequestDto,
  CheckoutResponseDto,
  OrderDto,
  ProductDto,
  QuoteRequestDto,
  QuoteResponseDto,
} from '@ecommerce/shared';
import { API_ROUTES } from '@ecommerce/shared';
import type { Observable } from 'rxjs';

/**
 * Único punto del frontend que habla con la API.
 *
 * Las rutas salen de `API_ROUTES`, la misma constante que registra el router de
 * Express, así que un renombrado en el servidor rompe la compilación del cliente
 * en lugar de fallar en tiempo de ejecución. Los tipos de petición y respuesta
 * son los del paquete compartido: si el contrato cambia, el compilador lo dice.
 *
 * Las rutas son relativas porque en desarrollo las sirve el proxy de Angular y
 * en producción la SPA y la API viven detrás del mismo origen.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);

  public listProducts(): Observable<readonly ProductDto[]> {
    return this.http.get<readonly ProductDto[]>(API_ROUTES.products);
  }

  public quote(request: QuoteRequestDto): Observable<QuoteResponseDto> {
    return this.http.post<QuoteResponseDto>(API_ROUTES.quote, request);
  }

  public checkout(request: CheckoutRequestDto): Observable<CheckoutResponseDto> {
    return this.http.post<CheckoutResponseDto>(API_ROUTES.checkout, request);
  }

  public listOrders(): Observable<readonly OrderDto[]> {
    return this.http.get<readonly OrderDto[]>(API_ROUTES.orders);
  }
}

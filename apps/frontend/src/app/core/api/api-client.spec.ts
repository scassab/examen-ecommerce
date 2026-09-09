import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_ROUTES } from '@ecommerce/shared';
import type { ProductDto, QuoteResponseDto } from '@ecommerce/shared';

import { ApiClient } from './api-client';

const PRODUCT: ProductDto = {
  id: '11111111-1111-4111-8111-111111111101',
  name: 'Laptop Pro 14"',
  category: 'TECHNOLOGY',
  categoryName: 'Tecnología',
  unitPriceInCents: 129_900,
  stock: 5,
};

const QUOTE: QuoteResponseDto = {
  lines: [],
  originalSubtotalInCents: 129_900,
  discounts: [],
  capAdjustmentInCents: 0,
  totalDiscountInCents: 0,
  effectiveDiscountPercentage: 0,
  totalInCents: 129_900,
  capReached: false,
  maxDiscountPercentage: 35,
  coupon: { code: null, status: 'NOT_PROVIDED' },
};

describe('ApiClient', () => {
  let client: ApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    client = TestBed.inject(ApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('pide el catalogo a la ruta compartida con el backend', () => {
    let received: readonly ProductDto[] = [];
    client.listProducts().subscribe((products) => (received = products));

    const request = http.expectOne(API_ROUTES.products);
    expect(request.request.method).toBe('GET');
    request.flush([PRODUCT]);

    expect(received).toEqual([PRODUCT]);
  });

  it('envia el carrito y el cupon a la cotizacion', () => {
    let received: QuoteResponseDto | undefined;
    client
      .quote({ items: [{ productId: PRODUCT.id, quantity: 1 }], couponCode: 'WELCOME2026' })
      .subscribe((quote) => (received = quote));

    const request = http.expectOne(API_ROUTES.quote);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      items: [{ productId: PRODUCT.id, quantity: 1 }],
      couponCode: 'WELCOME2026',
    });
    request.flush(QUOTE);

    expect(received?.maxDiscountPercentage).toBe(35);
  });

  it('confirma la compra contra el endpoint de checkout', () => {
    client.checkout({ items: [{ productId: PRODUCT.id, quantity: 2 }], couponCode: null }).subscribe();

    const request = http.expectOne(API_ROUTES.checkout);
    expect(request.request.method).toBe('POST');
    request.flush({ id: 'order-1', createdAt: '2026-09-09T15:00:00.000Z', summary: QUOTE });
  });

  it('consulta las ordenes persistidas', () => {
    client.listOrders().subscribe();

    const request = http.expectOne(API_ROUTES.orders);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('propaga el error de la API en lugar de tragarselo', () => {
    let status: number | undefined;
    client
      .checkout({ items: [{ productId: PRODUCT.id, quantity: 99 }], couponCode: null })
      .subscribe({ error: (error: { status: number }) => (status = error.status) });

    http
      .expectOne(API_ROUTES.checkout)
      .flush({ code: 'OUT_OF_STOCK', message: 'no stock', details: [] }, { status: 409, statusText: 'Conflict' });

    expect(status).toBe(409);
  });
});

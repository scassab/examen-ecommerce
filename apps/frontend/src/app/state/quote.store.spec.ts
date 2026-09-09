import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_ROUTES } from '@ecommerce/shared';
import type { OrderDto, ProductDto, QuoteResponseDto } from '@ecommerce/shared';

import { CartStore } from './cart.store';
import { QuoteStore } from './quote.store';

const laptop: ProductDto = {
  id: 'laptop',
  name: 'Laptop Pro 14"',
  category: 'TECHNOLOGY',
  categoryName: 'Tecnología',
  unitPriceInCents: 129_900,
  stock: 5,
};

const quoteResponse: QuoteResponseDto = {
  lines: [],
  originalSubtotalInCents: 129_900,
  discounts: [
    { kind: 'CATEGORY', percentage: 10, baseInCents: 129_900, amountInCents: 12_990 },
  ],
  capAdjustmentInCents: 0,
  totalDiscountInCents: 12_990,
  effectiveDiscountPercentage: 10,
  totalInCents: 116_910,
  capReached: false,
  maxDiscountPercentage: 35,
  coupon: { code: null, status: 'NOT_PROVIDED' },
};

const order: OrderDto = {
  id: 'order-1',
  createdAt: '2026-09-09T15:00:00.000Z',
  summary: quoteResponse,
};

/** Deja pasar el debounce y ejecuta los efectos que disparan la cotización. */
const settle = (): void => {
  TestBed.tick();
  vi.advanceTimersByTime(300);
  TestBed.tick();
};

describe('QuoteStore', () => {
  let store: QuoteStore;
  let cart: CartStore;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    cart = TestBed.inject(CartStore);
    cart.clear();
    store = TestBed.inject(QuoteStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no cotiza un carrito vacio', () => {
    settle();

    http.expectNone(API_ROUTES.quote);
    expect(store.current()).toBeNull();
  });

  it('cotiza contra el backend cuando el carrito cambia', () => {
    cart.add(laptop);
    settle();

    const request = http.expectOne(API_ROUTES.quote);
    expect(request.request.body).toEqual({
      items: [{ productId: 'laptop', quantity: 1 }],
      couponCode: null,
    });

    request.flush(quoteResponse);

    expect(store.current()).toEqual(quoteResponse);
    expect(store.isQuoting()).toBe(false);
  });

  it('agrupa una rafaga de cambios en una sola peticion', () => {
    cart.add(laptop);
    TestBed.tick();
    cart.add(laptop);
    TestBed.tick();
    cart.add(laptop);
    settle();

    const request = http.expectOne(API_ROUTES.quote);
    expect(request.request.body.items[0].quantity).toBe(3);
    request.flush(quoteResponse);
  });

  it('vuelve a cotizar al aplicar un cupon', () => {
    cart.add(laptop);
    settle();
    http.expectOne(API_ROUTES.quote).flush(quoteResponse);

    store.applyCoupon('WELCOME2026');
    settle();

    const request = http.expectOne(API_ROUTES.quote);
    expect(request.request.body.couponCode).toBe('WELCOME2026');
    request.flush({ ...quoteResponse, coupon: { code: 'WELCOME2026', status: 'APPLIED' } });

    expect(store.couponStatus()).toBe('APPLIED');
  });

  it('vuelve a cotizar al soltar el cupon', () => {
    cart.add(laptop);
    store.applyCoupon('WELCOME2026');
    settle();
    http.expectOne(API_ROUTES.quote).flush(quoteResponse);

    store.clearCoupon();
    settle();

    expect(http.expectOne(API_ROUTES.quote).request.body.couponCode).toBeNull();
  });

  it('olvida la cotizacion cuando el carrito se vacia', () => {
    cart.add(laptop);
    settle();
    http.expectOne(API_ROUTES.quote).flush(quoteResponse);

    cart.clear();
    settle();

    expect(store.current()).toBeNull();
    http.expectNone(API_ROUTES.quote);
  });

  it('sigue cotizando despues de un fallo de red', () => {
    cart.add(laptop);
    settle();
    http.expectOne(API_ROUTES.quote).flush('boom', { status: 500, statusText: 'Error' });

    expect(store.errorMessage()).not.toBeNull();

    cart.add(laptop);
    settle();

    expect(http.expectOne(API_ROUTES.quote)).toBeTruthy();
  });

  it('expone si el servidor confirmo que se alcanzo el tope', () => {
    cart.add(laptop);
    settle();
    http.expectOne(API_ROUTES.quote).flush({ ...quoteResponse, capReached: true });

    expect(store.capReached()).toBe(true);
  });

  describe('checkout', () => {
    beforeEach(() => {
      cart.add(laptop, 2);
      settle();
      http.expectOne(API_ROUTES.quote).flush(quoteResponse);
    });

    it('envia el carrito y el cupon vigente', () => {
      store.applyCoupon('WELCOME2026');
      settle();
      http.expectOne(API_ROUTES.quote).flush(quoteResponse);

      store.checkout();

      const request = http.expectOne(API_ROUTES.checkout);
      expect(request.request.body).toEqual({
        items: [{ productId: 'laptop', quantity: 2 }],
        couponCode: 'WELCOME2026',
      });
      request.flush(order);
      http.expectOne(API_ROUTES.products).flush([laptop]);
    });

    it('tras confirmar vacia el carrito, guarda la orden y recarga el catalogo', () => {
      store.checkout();
      http.expectOne(API_ROUTES.checkout).flush(order);

      expect(store.lastOrder()).toEqual(order);
      expect(cart.isEmpty()).toBe(true);
      expect(store.current()).toBeNull();
      expect(store.isSubmitting()).toBe(false);
      http.expectOne(API_ROUTES.products).flush([laptop]);
    });

    it('traduce un rechazo por stock a un mensaje para el cliente', () => {
      store.checkout();
      http.expectOne(API_ROUTES.checkout).flush(
        { code: 'OUT_OF_STOCK', message: 'not enough stock', details: [] },
        { status: 409, statusText: 'Conflict' },
      );

      expect(store.errorMessage()).toContain('sin existencias');
      expect(cart.isEmpty()).toBe(false);
      expect(store.lastOrder()).toBeNull();
      http.expectOne(API_ROUTES.products).flush([laptop]);
    });

    it('usa un mensaje generico cuando el error no sigue el contrato', () => {
      store.checkout();
      http
        .expectOne(API_ROUTES.checkout)
        .flush('gateway down', { status: 502, statusText: 'Bad Gateway' });

      expect(store.errorMessage()).toContain('No se pudo completar');
      http.expectOne(API_ROUTES.products).flush([laptop]);
    });

    it('no permite un segundo envio mientras el primero esta en vuelo', () => {
      store.checkout();
      store.checkout();

      const requests = http.match(API_ROUTES.checkout);
      expect(requests).toHaveLength(1);
      requests[0]?.flush(order);
      http.expectOne(API_ROUTES.products).flush([laptop]);
    });

    it('descarta la confirmacion cuando el cliente la cierra', () => {
      store.checkout();
      http.expectOne(API_ROUTES.checkout).flush(order);
      http.expectOne(API_ROUTES.products).flush([laptop]);

      store.dismissOrder();

      expect(store.lastOrder()).toBeNull();
    });
  });

  it('no intenta comprar un carrito vacio', () => {
    store.checkout();

    http.expectNone(API_ROUTES.checkout);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { API_ROUTES } from '@ecommerce/shared';
import type { OrderDto, ProductDto, QuoteResponseDto } from '@ecommerce/shared';

import { CartStore } from '../../state/cart.store';

import { CheckoutPage } from './checkout-page';

const laptop: ProductDto = {
  id: 'laptop',
  name: 'Laptop Pro 14"',
  category: 'TECHNOLOGY',
  categoryName: 'Tecnología',
  unitPriceInCents: 129_900,
  stock: 5,
};

const mug: ProductDto = {
  id: 'mug',
  name: 'Taza',
  category: 'HOME',
  categoryName: 'Hogar',
  unitPriceInCents: 1500,
  stock: 4,
};

const quote: QuoteResponseDto = {
  lines: [],
  originalSubtotalInCents: 129_900,
  discounts: [
    { kind: 'CATEGORY', percentage: 10, baseInCents: 129_900, amountInCents: 12_990 },
    { kind: 'VOLUME', percentage: 5, baseInCents: 116_910, amountInCents: 5846 },
  ],
  capAdjustmentInCents: 0,
  totalDiscountInCents: 18_836,
  effectiveDiscountPercentage: 14.5,
  totalInCents: 111_064,
  capReached: false,
  maxDiscountPercentage: 35,
  coupon: { code: null, status: 'NOT_PROVIDED' },
};

const order: OrderDto = {
  id: 'b8f1c0de-0000-4000-8000-000000000001',
  createdAt: '2026-09-09T15:00:00.000Z',
  summary: {
    ...quote,
    lines: [
      {
        productId: 'laptop',
        name: 'Laptop Pro 14"',
        category: 'TECHNOLOGY',
        unitPriceInCents: 129_900,
        quantity: 1,
        lineSubtotalInCents: 129_900,
      },
    ],
  },
};

describe('CheckoutPage', () => {
  let fixture: ComponentFixture<CheckoutPage>;
  let http: HttpTestingController;

  const textOf = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  const settle = (): void => {
    fixture.detectChanges();
    vi.advanceTimersByTime(300);
    TestBed.tick();
    fixture.detectChanges();
  };

  const addFirstProduct = (): void => {
    const button = (fixture.nativeElement as HTMLElement).querySelector('app-product-card button');
    (button as HTMLButtonElement | null)?.click();
    settle();
  };

  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    TestBed.inject(CartStore).clear();
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    http.expectOne(API_ROUTES.products).flush([laptop, mug]);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pide el catalogo al entrar y lo pinta', () => {
    expect(textOf()).toContain('Laptop Pro 14"');
    expect(textOf()).toContain('Taza');
    expect(textOf()).toContain('$1,299.00');
  });

  it('invita a agregar productos mientras el carrito esta vacio', () => {
    expect(textOf()).toContain('Aún no has agregado productos');
  });

  it('agrega al carrito y actualiza el subtotal de inmediato', () => {
    addFirstProduct();

    expect(textOf()).toContain('Subtotal original');
    expect(textOf()).toContain('$1,299.00');
    http.expectOne(API_ROUTES.quote).flush(quote);
  });

  it('pinta el desglose que devolvio el servidor', () => {
    addFirstProduct();
    http.expectOne(API_ROUTES.quote).flush(quote);
    fixture.detectChanges();

    const text = textOf();
    expect(text).toContain('Descuento de categoría (Tecnología)');
    expect(text).toContain('Descuento por volumen');
    expect(text).toContain('Ahorro total');
    expect(text).toContain('14.5%');
    expect(text).toContain('$1,110.64');
  });

  it('confirma la compra y muestra el identificador de la orden persistida', () => {
    addFirstProduct();
    http.expectOne(API_ROUTES.quote).flush(quote);
    fixture.detectChanges();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    );
    const confirm = buttons.find((button) => button.textContent?.includes('Confirmar compra'));
    confirm?.click();
    fixture.detectChanges();

    http.expectOne(API_ROUTES.checkout).flush(order);
    http.expectOne(API_ROUTES.products).flush([{ ...laptop, stock: 4 }, mug]);
    fixture.detectChanges();

    expect(document.body.textContent).toContain('¡Compra confirmada!');
    expect(document.body.textContent).toContain(order.id);
  });

  it('vacia el carrito despues de comprar', () => {
    addFirstProduct();
    http.expectOne(API_ROUTES.quote).flush(quote);
    fixture.detectChanges();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    );
    buttons.find((button) => button.textContent?.includes('Confirmar compra'))?.click();
    fixture.detectChanges();
    http.expectOne(API_ROUTES.checkout).flush(order);
    http.expectOne(API_ROUTES.products).flush([laptop, mug]);
    settle();

    expect(textOf()).toContain('Aún no has agregado productos');
  });

  it('avisa cuando el catalogo no se pudo cargar', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failed = TestBed.createComponent(CheckoutPage);
    failed.detectChanges();

    http.expectOne(API_ROUTES.products).flush('boom', { status: 500, statusText: 'Error' });
    failed.detectChanges();

    expect((failed.nativeElement as HTMLElement).textContent).toContain(
      'No se pudo cargar el catálogo',
    );
    consoleSpy.mockRestore();
  });
});

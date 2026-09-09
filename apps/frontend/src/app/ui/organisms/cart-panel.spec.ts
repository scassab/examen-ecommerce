import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { CouponStatus, QuoteResponseDto } from '@ecommerce/shared';

import type { CartLineView } from '../molecules/cart-line';
import { CartLine } from '../molecules/cart-line';

import { CartPanel } from './cart-panel';

const line: CartLineView = {
  productId: 'laptop',
  name: 'Laptop Pro 14"',
  unitPriceInCents: 129_900,
  quantity: 1,
  lineSubtotalInCents: 129_900,
  stock: 5,
};

const quote: QuoteResponseDto = {
  lines: [],
  originalSubtotalInCents: 129_900,
  discounts: [{ kind: 'CATEGORY', percentage: 10, baseInCents: 129_900, amountInCents: 12_990 }],
  capAdjustmentInCents: 0,
  totalDiscountInCents: 12_990,
  effectiveDiscountPercentage: 10,
  totalInCents: 116_910,
  capReached: false,
  maxDiscountPercentage: 35,
  coupon: { code: null, status: 'NOT_PROVIDED' },
};

interface PanelInputs {
  readonly lines?: readonly CartLineView[];
  readonly quote?: QuoteResponseDto | null;
  readonly couponStatus?: CouponStatus;
  readonly quoting?: boolean;
  readonly submitting?: boolean;
  readonly errorMessage?: string | null;
}

const render = (inputs: PanelInputs = {}): ComponentFixture<CartPanel> => {
  const fixture = TestBed.createComponent(CartPanel);
  fixture.componentRef.setInput('lines', inputs.lines ?? [line]);
  fixture.componentRef.setInput('subtotalInCents', 129_900);
  fixture.componentRef.setInput('quote', inputs.quote ?? quote);
  fixture.componentRef.setInput('couponStatus', inputs.couponStatus ?? 'NOT_PROVIDED');
  fixture.componentRef.setInput('quoting', inputs.quoting ?? false);
  fixture.componentRef.setInput('submitting', inputs.submitting ?? false);
  fixture.componentRef.setInput('errorMessage', inputs.errorMessage ?? null);
  fixture.detectChanges();

  return fixture;
};

const textOf = (fixture: ComponentFixture<CartPanel>): string =>
  (fixture.nativeElement as HTMLElement).textContent ?? '';

const buttonWith = (fixture: ComponentFixture<CartPanel>, label: string): HTMLButtonElement => {
  const button = Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
  ).find((candidate) => candidate.textContent?.includes(label));

  if (button === undefined) {
    throw new Error(`expected a button labelled "${label}"`);
  }

  return button;
};

describe('CartPanel', () => {
  it('invita a comprar cuando el carrito esta vacio', () => {
    const fixture = render({ lines: [] });

    expect(textOf(fixture)).toContain('Aún no has agregado productos');
    expect((fixture.nativeElement as HTMLElement).querySelector('app-cart-line')).toBeNull();
  });

  it('pinta una linea por producto y el desglose del servidor', () => {
    const fixture = render();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-cart-line')).toHaveLength(1);
    expect(textOf(fixture)).toContain('Descuento de categoría (Tecnología)');
    expect(textOf(fixture)).toContain('$1,169.10');
  });

  it('avisa mientras la cotizacion se esta recalculando', () => {
    expect(textOf(render({ quoting: true }))).toContain('Actualizando');
  });

  it('propaga el cambio de cantidad junto al producto afectado', () => {
    const fixture = render();
    let change: { productId: string; quantity: number } | undefined;
    fixture.componentInstance.quantityChange.subscribe((value) => (change = value));

    // Se emite desde la molecula en lugar de pulsar el boton de PrimeNG: lo que
    // esta prueba verifica es el cableado del panel, no el spinner del tercero.
    const cartLine = fixture.debugElement.query(By.directive(CartLine));
    cartLine.componentInstance.quantityChange.emit(2);

    expect(change).toEqual({ productId: 'laptop', quantity: 2 });
  });

  it('propaga la eliminacion de una linea', () => {
    const fixture = render();
    let removed: string | undefined;
    fixture.componentInstance.remove.subscribe((productId) => (removed = productId));

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('app-cart-line button[aria-label]')
      ?.click();

    expect(removed).toBe('laptop');
  });

  it('propaga el cupon que el cliente aplica', () => {
    const fixture = render();
    let applied: string | undefined;
    fixture.componentInstance.applyCoupon.subscribe((code) => (applied = code));

    const input = (fixture.nativeElement as HTMLElement).querySelector('input#coupon-code');
    if (input instanceof HTMLInputElement) {
      input.value = 'welcome2026';
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
    buttonWith(fixture, 'Aplicar').click();

    expect(applied).toBe('WELCOME2026');
  });

  it('muestra el resultado del cupon que decidio el servidor', () => {
    expect(textOf(render({ couponStatus: 'EXPIRED' }))).toContain('El cupón está vencido.');
  });

  it('emite la confirmacion de compra', () => {
    const fixture = render();
    let confirmed = false;
    fixture.componentInstance.checkout.subscribe(() => (confirmed = true));

    buttonWith(fixture, 'Confirmar compra').click();

    expect(confirmed).toBe(true);
  });

  it('bloquea la confirmacion mientras hay una cotizacion o un envio en curso', () => {
    expect(buttonWith(render({ quoting: true }), 'Confirmar compra').disabled).toBe(true);
    expect(buttonWith(render({ submitting: true }), 'Confirmar compra').disabled).toBe(true);
  });

  it('muestra el error del checkout sin ocultar el carrito', () => {
    const fixture = render({ errorMessage: 'Algún producto se quedó sin existencias.' });

    expect(textOf(fixture)).toContain('sin existencias');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-cart-line')).toHaveLength(1);
  });
});

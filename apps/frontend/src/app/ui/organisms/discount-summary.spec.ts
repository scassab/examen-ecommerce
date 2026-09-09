import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { QuoteResponseDto } from '@ecommerce/shared';

import { DiscountSummary } from './discount-summary';

const baseQuote: QuoteResponseDto = {
  lines: [],
  originalSubtotalInCents: 129_900,
  discounts: [
    { kind: 'CATEGORY', percentage: 10, baseInCents: 129_900, amountInCents: 12_990 },
    { kind: 'VOLUME', percentage: 5, baseInCents: 116_910, amountInCents: 5846 },
    { kind: 'COUPON', percentage: 15, baseInCents: 111_064, amountInCents: 16_660 },
  ],
  capAdjustmentInCents: 0,
  totalDiscountInCents: 35_496,
  effectiveDiscountPercentage: 27.33,
  totalInCents: 94_404,
  capReached: false,
  maxDiscountPercentage: 35,
  coupon: { code: 'WELCOME2026', status: 'APPLIED' },
};

const render = (
  quote: QuoteResponseDto | null,
  subtotalInCents = 129_900,
): ComponentFixture<DiscountSummary> => {
  const fixture = TestBed.createComponent(DiscountSummary);
  fixture.componentRef.setInput('quote', quote);
  fixture.componentRef.setInput('subtotalInCents', subtotalInCents);
  fixture.detectChanges();

  return fixture;
};

const textOf = (fixture: ComponentFixture<DiscountSummary>): string =>
  (fixture.nativeElement as HTMLElement).textContent ?? '';

describe('DiscountSummary', () => {
  it('muestra el subtotal original aunque todavia no haya cotizacion', () => {
    const text = textOf(render(null));

    expect(text).toContain('Subtotal original');
    expect(text).toContain('$1,299.00');
  });

  it('sin cotizacion, el total a pagar es el subtotal sin descontar', () => {
    expect(textOf(render(null))).toContain('Total a pagar');
    expect(textOf(render(null, 5000))).toContain('$50.00');
  });

  it('no anuncia ahorro cuando no hay descuentos', () => {
    expect(textOf(render(null))).not.toContain('Ahorro total');
  });

  it('traduce cada regla de la cascada a una etiqueta legible', () => {
    const text = textOf(render(baseQuote));

    expect(text).toContain('Descuento de categoría (Tecnología)');
    expect(text).toContain('Descuento por volumen');
    expect(text).toContain('Descuento por cupón');
  });

  it('muestra el porcentaje y el importe de cada regla', () => {
    const text = textOf(render(baseQuote));

    expect(text).toContain('−10%');
    expect(text).toContain('−$129.90');
    expect(text).toContain('−$166.60');
  });

  it('resume el ahorro con su porcentaje efectivo y el total a pagar', () => {
    const text = textOf(render(baseQuote));

    expect(text).toContain('Ahorro total');
    expect(text).toContain('27.33%');
    expect(text).toContain('−$354.96');
    expect(text).toContain('$944.04');
  });

  it('explica el ajuste cuando el tope trunco la cascada', () => {
    const capped: QuoteResponseDto = {
      ...baseQuote,
      capAdjustmentInCents: 22_250,
      totalDiscountInCents: 45_465,
      totalInCents: 84_435,
      effectiveDiscountPercentage: 35,
      capReached: true,
    };

    const text = textOf(render(capped));

    expect(text).toContain('Ajuste por límite de descuento');
    expect(text).toContain('+$222.50');
    expect(text).toContain('35%');
  });

  it('no muestra la linea de ajuste cuando no se topo nada', () => {
    expect(textOf(render(baseQuote))).not.toContain('Ajuste por límite');
  });
});

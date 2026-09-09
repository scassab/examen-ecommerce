import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { OrderDto } from '@ecommerce/shared';

import { OrderConfirmation } from './order-confirmation';

const order: OrderDto = {
  id: 'b8f1c0de-0000-4000-8000-000000000001',
  createdAt: '2026-09-09T15:00:00.000Z',
  summary: {
    lines: [
      {
        productId: 'laptop',
        name: 'Laptop Pro 14"',
        category: 'TECHNOLOGY',
        unitPriceInCents: 129_900,
        quantity: 2,
        lineSubtotalInCents: 259_800,
      },
    ],
    originalSubtotalInCents: 259_800,
    discounts: [],
    capAdjustmentInCents: 0,
    totalDiscountInCents: 25_980,
    effectiveDiscountPercentage: 10,
    totalInCents: 233_820,
    capReached: false,
    maxDiscountPercentage: 35,
    coupon: { code: null, status: 'NOT_PROVIDED' },
  },
};

const render = (value: OrderDto | null): ComponentFixture<OrderConfirmation> => {
  const fixture = TestBed.createComponent(OrderConfirmation);
  fixture.componentRef.setInput('order', value);
  fixture.detectChanges();

  return fixture;
};

describe('OrderConfirmation', () => {
  afterEach(() => {
    document.body.querySelectorAll('.p-dialog').forEach((dialog) => dialog.remove());
  });

  it('no muestra nada mientras no haya una orden', () => {
    render(null);

    expect(document.body.textContent).not.toContain('Compra confirmada');
  });

  it('muestra el identificador que devolvio el servidor', () => {
    render(order);

    expect(document.body.textContent).toContain('¡Compra confirmada!');
    expect(document.body.textContent).toContain(order.id);
  });

  it('detalla las lineas compradas y el total pagado', () => {
    render(order);

    expect(document.body.textContent).toContain('2 × Laptop Pro 14"');
    expect(document.body.textContent).toContain('$2,338.20');
  });

  it('resume el ahorro conseguido', () => {
    render(order);

    expect(document.body.textContent).toContain('$259.80');
    expect(document.body.textContent).toContain('10%');
  });

  it('avisa cuando el cliente cierra la confirmacion', () => {
    const fixture = render(order);
    let dismissed = false;
    fixture.componentInstance.dismissed.subscribe(() => (dismissed = true));

    const button = Array.from(document.body.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes('Seguir comprando'),
    );
    button?.click();

    expect(dismissed).toBe(true);
  });
});

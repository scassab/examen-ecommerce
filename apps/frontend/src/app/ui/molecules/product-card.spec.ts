import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { ProductDto } from '@ecommerce/shared';

import { ProductCard } from './product-card';

const LAPTOP: ProductDto = {
  id: '11111111-1111-4111-8111-111111111101',
  name: 'Laptop Pro 14"',
  category: 'TECHNOLOGY',
  categoryName: 'Tecnología',
  unitPriceInCents: 129_900,
  stock: 5,
};

const render = (
  product: ProductDto = LAPTOP,
  quantityInCart = 0,
): ComponentFixture<ProductCard> => {
  const fixture = TestBed.createComponent(ProductCard);
  fixture.componentRef.setInput('product', product);
  fixture.componentRef.setInput('quantityInCart', quantityInCart);
  fixture.detectChanges();

  return fixture;
};

const buttonOf = (fixture: ComponentFixture<ProductCard>): HTMLButtonElement => {
  const button = (fixture.nativeElement as HTMLElement).querySelector('button');

  if (button === null) {
    throw new Error('expected the card to render an action button');
  }

  return button;
};

describe('ProductCard', () => {
  it('muestra nombre, precio formateado y categoria', () => {
    const text = (render().nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Laptop Pro 14"');
    expect(text).toContain('$1,299.00');
    expect(text).toContain('Tecnología');
  });

  it('emite el producto al agregarlo', () => {
    const fixture = render();
    let emitted: ProductDto | undefined;
    fixture.componentInstance.add.subscribe((product) => (emitted = product));

    buttonOf(fixture).click();

    expect(emitted).toEqual(LAPTOP);
  });

  it('descuenta del stock mostrado lo que ya esta en el carrito', () => {
    const text = (render(LAPTOP, 3).nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Últimas 2 unidades');
  });

  it('bloquea el boton cuando el carrito ya agoto las existencias', () => {
    const fixture = render(LAPTOP, 5);

    expect(buttonOf(fixture).disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sin existencias');
  });

  it('no emite nada si no queda stock disponible', () => {
    const fixture = render(LAPTOP, 5);
    const emitted: ProductDto[] = [];
    fixture.componentInstance.add.subscribe((product) => emitted.push(product));

    buttonOf(fixture).click();

    expect(emitted).toHaveLength(0);
  });

  it('trata un producto agotado en catalogo igual que uno sin stock restante', () => {
    const fixture = render({ ...LAPTOP, stock: 0 });

    expect(buttonOf(fixture).disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Agotado');
  });
});

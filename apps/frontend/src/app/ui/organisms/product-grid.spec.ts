import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { ProductDto } from '@ecommerce/shared';

import { ProductGrid } from './product-grid';

const laptop: ProductDto = {
  id: 'laptop',
  name: 'Laptop Pro 14"',
  category: 'TECHNOLOGY',
  categoryName: 'Tecnología',
  unitPriceInCents: 129_900,
  stock: 5,
};

interface GridInputs {
  readonly products?: readonly ProductDto[];
  readonly quantities?: ReadonlyMap<string, number>;
  readonly loading?: boolean;
  readonly errorMessage?: string | null;
}

const render = (inputs: GridInputs = {}): ComponentFixture<ProductGrid> => {
  const fixture = TestBed.createComponent(ProductGrid);
  fixture.componentRef.setInput('products', inputs.products ?? [laptop]);
  fixture.componentRef.setInput('quantities', inputs.quantities ?? new Map<string, number>());
  fixture.componentRef.setInput('loading', inputs.loading ?? false);
  fixture.componentRef.setInput('errorMessage', inputs.errorMessage ?? null);
  fixture.detectChanges();

  return fixture;
};

const textOf = (fixture: ComponentFixture<ProductGrid>): string =>
  (fixture.nativeElement as HTMLElement).textContent ?? '';

describe('ProductGrid', () => {
  it('pinta una tarjeta por producto', () => {
    const fixture = render();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-product-card')).toHaveLength(
      1,
    );
    expect(textOf(fixture)).toContain('Laptop Pro 14"');
  });

  it('avisa mientras carga en lugar de mostrar una rejilla vacia', () => {
    const fixture = render({ loading: true, products: [] });

    expect(textOf(fixture)).toContain('Cargando productos');
    expect((fixture.nativeElement as HTMLElement).querySelector('app-product-card')).toBeNull();
  });

  it('distingue un catalogo vacio de un fallo de carga', () => {
    expect(textOf(render({ products: [] }))).toContain('No hay productos disponibles');
  });

  it('muestra el error y ofrece reintentar', () => {
    const fixture = render({ errorMessage: 'No se pudo cargar el catálogo.', products: [] });

    expect(textOf(fixture)).toContain('No se pudo cargar el catálogo.');
    expect(textOf(fixture)).toContain('Reintentar');
  });

  it('emite el reintento cuando se pulsa el boton', () => {
    const fixture = render({ errorMessage: 'falló', products: [] });
    let retried = false;
    fixture.componentInstance.retry.subscribe(() => (retried = true));

    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();

    expect(retried).toBe(true);
  });

  it('propaga el producto que el cliente quiere agregar', () => {
    const fixture = render();
    let added: ProductDto | undefined;
    fixture.componentInstance.add.subscribe((product) => (added = product));

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('app-product-card button')
      ?.click();

    expect(added).toEqual(laptop);
  });

  it('descuenta de cada tarjeta lo que el carrito ya reserva', () => {
    const fixture = render({ quantities: new Map([['laptop', 4]]) });

    expect(textOf(fixture)).toContain('Últimas 1 unidades');
  });
});

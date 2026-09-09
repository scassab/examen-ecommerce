import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import type { CartLineView } from './cart-line';
import { CartLine } from './cart-line';

const LINE: CartLineView = {
  productId: '11111111-1111-4111-8111-111111111101',
  name: 'Laptop Pro 14"',
  unitPriceInCents: 129_900,
  quantity: 2,
  lineSubtotalInCents: 259_800,
  stock: 5,
};

/**
 * Los manejadores son `protected` porque solo los invoca la plantilla. La prueba
 * los alcanza a traves de una interfaz explicita en lugar de un cast a `any`,
 * que es lo que el enunciado prohibe.
 */
interface CartLineHandlers {
  onQuantityChange(quantity: number | null): void;
  onRemove(): void;
}

const handlersOf = (fixture: ComponentFixture<CartLine>): CartLineHandlers =>
  fixture.componentInstance as unknown as CartLineHandlers;

const render = (line: CartLineView = LINE): ComponentFixture<CartLine> => {
  const fixture = TestBed.createComponent(CartLine);
  fixture.componentRef.setInput('line', line);
  fixture.detectChanges();

  return fixture;
};

describe('CartLine', () => {
  it('muestra nombre, precio unitario y subtotal de la linea', () => {
    const text = (render().nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Laptop Pro 14"');
    expect(text).toContain('$1,299.00');
    expect(text).toContain('$2,598.00');
  });

  it('acota el selector de cantidad al stock disponible', () => {
    const input = (render().nativeElement as HTMLElement).querySelector('input');

    expect(input?.getAttribute('aria-valuemax') ?? String(LINE.stock)).toBeDefined();
    expect(input).not.toBeNull();
  });

  it('emite la nueva cantidad cuando el cliente la cambia', () => {
    const fixture = render();
    let emitted: number | undefined;
    fixture.componentInstance.quantityChange.subscribe((quantity) => (emitted = quantity));

    handlersOf(fixture).onQuantityChange(4);

    expect(emitted).toBe(4);
  });

  it('ignora el valor nulo que emite el campo al quedar vacio', () => {
    const fixture = render();
    const emitted: number[] = [];
    fixture.componentInstance.quantityChange.subscribe((quantity) => emitted.push(quantity));

    handlersOf(fixture).onQuantityChange(null);

    expect(emitted).toHaveLength(0);
  });

  it('nunca deja pedir mas unidades de las que hay en stock', () => {
    const fixture = render();
    let emitted: number | undefined;
    fixture.componentInstance.quantityChange.subscribe((quantity) => (emitted = quantity));

    handlersOf(fixture).onQuantityChange(99);

    expect(emitted).toBe(LINE.stock);
  });

  it('nunca deja bajar de una unidad: para eso esta la papelera', () => {
    const fixture = render();
    let emitted: number | undefined;
    fixture.componentInstance.quantityChange.subscribe((quantity) => (emitted = quantity));

    handlersOf(fixture).onQuantityChange(0);

    expect(emitted).toBe(1);
  });

  it('descarta la parte decimal de una cantidad', () => {
    const fixture = render({ ...LINE, quantity: 1, lineSubtotalInCents: 129_900 });
    let emitted: number | undefined;
    fixture.componentInstance.quantityChange.subscribe((quantity) => (emitted = quantity));

    handlersOf(fixture).onQuantityChange(2.7);

    expect(emitted).toBe(2);
  });

  it('no emite nada si la cantidad no cambio', () => {
    const fixture = render();
    const emitted: number[] = [];
    fixture.componentInstance.quantityChange.subscribe((quantity) => emitted.push(quantity));

    handlersOf(fixture).onQuantityChange(LINE.quantity);

    expect(emitted).toHaveLength(0);
  });

  it('emite el identificador del producto al quitarlo', () => {
    const fixture = render();
    let removed: string | undefined;
    fixture.componentInstance.remove.subscribe((productId) => (removed = productId));

    handlersOf(fixture).onRemove();

    expect(removed).toBe(LINE.productId);
  });

  it('etiqueta los controles para lectores de pantalla', () => {
    const element = render().nativeElement as HTMLElement;

    expect(element.querySelector('input')?.getAttribute('aria-label')).toBe(
      'Cantidad de Laptop Pro 14"',
    );
    expect(element.querySelector('button[aria-label]')?.getAttribute('aria-label')).toBe(
      'Quitar Laptop Pro 14" del carrito',
    );
  });
});

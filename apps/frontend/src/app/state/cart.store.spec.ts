import { TestBed } from '@angular/core/testing';
import type { ProductDto } from '@ecommerce/shared';

import { CartStore } from './cart.store';

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
  stock: 2,
};

describe('CartStore', () => {
  let store: CartStore;

  beforeEach(() => {
    store = TestBed.inject(CartStore);
    store.clear();
  });

  it('empieza vacio', () => {
    expect(store.isEmpty()).toBe(true);
    expect(store.originalSubtotalInCents()).toBe(0);
    expect(store.totalUnits()).toBe(0);
  });

  it('agrega un producto y actualiza el subtotal de inmediato', () => {
    store.add(laptop);

    expect(store.isEmpty()).toBe(false);
    expect(store.items()).toHaveLength(1);
    expect(store.originalSubtotalInCents()).toBe(129_900);
    expect(store.totalUnits()).toBe(1);
  });

  it('suma unidades en la misma linea en lugar de duplicarla', () => {
    store.add(laptop);
    store.add(laptop);
    store.add(laptop, 2);

    expect(store.items()).toHaveLength(1);
    expect(store.quantityOf('laptop')).toBe(4);
    expect(store.originalSubtotalInCents()).toBe(519_600);
  });

  it('nunca acumula mas unidades de las que hay en stock', () => {
    store.add(mug, 5);

    expect(store.quantityOf('mug')).toBe(2);
  });

  it('tampoco supera el stock sumando poco a poco', () => {
    store.add(mug);
    store.add(mug);
    store.add(mug);

    expect(store.quantityOf('mug')).toBe(2);
  });

  it('ignora un producto agotado', () => {
    store.add({ ...mug, stock: 0 });

    expect(store.isEmpty()).toBe(true);
  });

  it('ignora una cantidad no positiva', () => {
    store.add(laptop, 0);
    store.add(laptop, -3);

    expect(store.isEmpty()).toBe(true);
  });

  it('suma el subtotal de varias lineas', () => {
    store.add(laptop, 2);
    store.add(mug, 2);

    expect(store.originalSubtotalInCents()).toBe(262_800);
    expect(store.totalUnits()).toBe(4);
  });

  describe('setQuantity', () => {
    beforeEach(() => store.add(laptop, 2));

    it('fija la cantidad exacta', () => {
      store.setQuantity('laptop', 4);

      expect(store.quantityOf('laptop')).toBe(4);
      expect(store.originalSubtotalInCents()).toBe(519_600);
    });

    it('acota por arriba al stock disponible', () => {
      store.setQuantity('laptop', 99);

      expect(store.quantityOf('laptop')).toBe(5);
    });

    it('acota por abajo a una unidad', () => {
      store.setQuantity('laptop', 0);

      expect(store.quantityOf('laptop')).toBe(1);
    });

    it('descarta decimales', () => {
      store.setQuantity('laptop', 3.9);

      expect(store.quantityOf('laptop')).toBe(3);
    });

    it('ignora un producto que no esta en el carrito', () => {
      store.setQuantity('desconocido', 3);

      expect(store.items()).toHaveLength(1);
    });
  });

  it('quita una linea', () => {
    store.add(laptop);
    store.add(mug);

    store.remove('laptop');

    expect(store.items()).toHaveLength(1);
    expect(store.quantityOf('laptop')).toBe(0);
    expect(store.originalSubtotalInCents()).toBe(1500);
  });

  it('vacia el carrito entero', () => {
    store.add(laptop);
    store.add(mug);

    store.clear();

    expect(store.isEmpty()).toBe(true);
  });

  it('expone el payload que espera la API', () => {
    store.add(laptop, 2);
    store.add(mug);

    expect(store.requestItems()).toEqual([
      { productId: 'laptop', quantity: 2 },
      { productId: 'mug', quantity: 1 },
    ]);
  });

  it('indexa las cantidades para que el catalogo no recorra el carrito', () => {
    store.add(laptop, 3);

    expect(store.quantities().get('laptop')).toBe(3);
    expect(store.quantities().get('mug')).toBeUndefined();
  });

  describe('syncWithCatalog', () => {
    it('recorta las lineas al stock que quedo tras una compra', () => {
      store.add(laptop, 5);

      store.syncWithCatalog([{ ...laptop, stock: 2 }]);

      expect(store.quantityOf('laptop')).toBe(2);
    });

    it('elimina las lineas de productos agotados', () => {
      store.add(laptop, 2);
      store.add(mug, 1);

      store.syncWithCatalog([{ ...laptop, stock: 3 }, { ...mug, stock: 0 }]);

      expect(store.items()).toHaveLength(1);
      expect(store.quantityOf('mug')).toBe(0);
    });

    it('elimina las lineas de productos que ya no estan en el catalogo', () => {
      store.add(laptop);

      store.syncWithCatalog([]);

      expect(store.isEmpty()).toBe(true);
    });

    it('actualiza el precio si cambio en el servidor', () => {
      store.add(laptop, 1);

      store.syncWithCatalog([{ ...laptop, unitPriceInCents: 99_900 }]);

      expect(store.originalSubtotalInCents()).toBe(99_900);
    });

    it('deja intactas las lineas que siguen siendo validas', () => {
      store.add(laptop, 2);

      store.syncWithCatalog([laptop]);

      expect(store.quantityOf('laptop')).toBe(2);
    });
  });
});

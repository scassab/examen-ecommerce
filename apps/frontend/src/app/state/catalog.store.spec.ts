import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_ROUTES } from '@ecommerce/shared';
import type { ProductDto } from '@ecommerce/shared';

import { CartStore } from './cart.store';
import { CatalogStore } from './catalog.store';

const laptop: ProductDto = {
  id: 'laptop',
  name: 'Laptop Pro 14"',
  category: 'TECHNOLOGY',
  categoryName: 'Tecnología',
  unitPriceInCents: 129_900,
  stock: 5,
};

describe('CatalogStore', () => {
  let store: CatalogStore;
  let cart: CartStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    store = TestBed.inject(CatalogStore);
    cart = TestBed.inject(CartStore);
    cart.clear();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('empieza sin productos, sin carga y sin error', () => {
    expect(store.items()).toEqual([]);
    expect(store.isLoading()).toBe(false);
    expect(store.errorMessage()).toBeNull();
  });

  it('marca la carga en curso mientras espera la respuesta', () => {
    store.load();

    expect(store.isLoading()).toBe(true);

    http.expectOne(API_ROUTES.products).flush([laptop]);

    expect(store.isLoading()).toBe(false);
  });

  it('publica el catalogo recibido', () => {
    store.load();
    http.expectOne(API_ROUTES.products).flush([laptop]);

    expect(store.items()).toEqual([laptop]);
    expect(store.errorMessage()).toBeNull();
  });

  it('distingue un catalogo vacio de una carga en curso', () => {
    store.load();
    http.expectOne(API_ROUTES.products).flush([]);

    expect(store.isEmpty()).toBe(true);
  });

  it('no considera vacio un catalogo que todavia esta cargando', () => {
    store.load();

    expect(store.isEmpty()).toBe(false);

    http.expectOne(API_ROUTES.products).flush([]);
  });

  it('explica el fallo al cliente sin exponer el detalle tecnico', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    store.load();

    http
      .expectOne(API_ROUTES.products)
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });

    expect(store.errorMessage()).toContain('No se pudo cargar el catálogo');
    expect(store.isLoading()).toBe(false);
    expect(store.isEmpty()).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('limpia el error anterior al reintentar', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    store.load();
    http.expectOne(API_ROUTES.products).flush('boom', { status: 500, statusText: 'Error' });

    store.load();

    expect(store.errorMessage()).toBeNull();
    http.expectOne(API_ROUTES.products).flush([laptop]);
    consoleSpy.mockRestore();
  });

  it('reconcilia el carrito con el stock recien traido', () => {
    cart.add(laptop, 5);

    store.load();
    http.expectOne(API_ROUTES.products).flush([{ ...laptop, stock: 1 }]);

    expect(cart.quantityOf('laptop')).toBe(1);
  });

  it('vacia del carrito lo que ya no existe en el catalogo', () => {
    cart.add(laptop, 2);

    store.load();
    http.expectOne(API_ROUTES.products).flush([]);

    expect(cart.isEmpty()).toBe(true);
  });
});

import { API_ROUTES } from '@ecommerce/shared';
import request from 'supertest';
import type { Express } from 'express';

import { CheckoutUseCase } from '../../src/application/use-cases/checkout.use-case';
import { ListOrdersUseCase, ListProductsUseCase } from '../../src/application/use-cases/catalog.use-cases';
import { QuoteCartUseCase } from '../../src/application/use-cases/quote-cart.use-case';
import { DEFAULT_DISCOUNT_CONFIG } from '../../src/domain/discounts/discount-config';
import { DiscountEngine } from '../../src/domain/discounts/discount-engine';
import type { AppConfig } from '../../src/infrastructure/config/env';
import { createApp } from '../../src/infrastructure/http/app';
import { buildCoupon } from '../doubles/cart.builder';
import {
  FixedClock,
  InMemoryCheckoutUnitOfWork,
  InMemoryCouponRepository,
  InMemoryOrderRepository,
  InMemoryProductRepository,
  SequentialIdGenerator,
} from '../doubles/in-memory.adapters';
import { buildProduct } from '../doubles/product.builder';

const NOW = new Date('2026-09-09T15:00:00.000Z');

const LAPTOP_ID = '11111111-1111-4111-8111-111111111101';
const COFFEE_ID = '22222222-2222-4222-8222-222222222201';

const config: AppConfig = {
  api: { port: 3000, corsOrigin: 'http://localhost:4200' },
  database: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgresql',
    name: 'ecommerce',
    testSchema: 'test',
  },
};

interface TestApi {
  readonly app: Express;
  readonly products: InMemoryProductRepository;
  readonly orders: InMemoryOrderRepository;
}

/**
 * Monta la API completa sobre adaptadores en memoria.
 *
 * Se ejercitan los controladores, la validación, los casos de uso reales y el
 * motor de descuentos: lo único que se sustituye es PostgreSQL. Es la prueba
 * que demuestra que la arquitectura hexagonal no es decorativa.
 */
const buildTestApi = (): TestApi => {
  const products = new InMemoryProductRepository([
    buildProduct({
      id: LAPTOP_ID,
      name: 'Laptop Pro 14"',
      category: 'TECHNOLOGY',
      categoryName: 'Tecnología',
      priceInCents: 129_900,
      stock: 5,
    }),
    buildProduct({
      id: COFFEE_ID,
      name: 'Cafetera espresso',
      category: 'HOME',
      categoryName: 'Hogar',
      priceInCents: 24_999,
      stock: 2,
    }),
  ]);
  const orders = new InMemoryOrderRepository();
  const coupons = new InMemoryCouponRepository([
    buildCoupon({ code: 'WELCOME2026', percentage: 15 }),
    buildCoupon({ code: 'MEGA50', percentage: 50 }),
    buildCoupon({
      code: 'SUMMER2024',
      percentage: 20,
      expiresAt: new Date('2024-09-30T23:59:59.000Z'),
    }),
  ]);
  const engine = DiscountEngine.fromConfig(DEFAULT_DISCOUNT_CONFIG);
  const clock = new FixedClock(NOW);

  const app = createApp(config, {
    listProducts: new ListProductsUseCase(products),
    quoteCart: new QuoteCartUseCase(products, coupons, engine, clock),
    checkout: new CheckoutUseCase(
      new InMemoryCheckoutUnitOfWork(products, orders),
      coupons,
      engine,
      clock,
      new SequentialIdGenerator(),
    ),
    listOrders: new ListOrdersUseCase(orders),
  });

  return { app, products, orders };
};

describe('infrastructure', () => {
  const { app } = buildTestApi();

  it('answers the health check', async () => {
    const response = await request(app).get(API_ROUTES.health);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });

  it('answers an unknown route with the shared error envelope', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'ROUTE_NOT_FOUND',
      message: 'no route matches GET /api/does-not-exist',
    });
  });

  it('rejects a malformed JSON body without leaking the stack trace', async () => {
    const response = await request(app)
      .post(API_ROUTES.quote)
      .set('Content-Type', 'application/json')
      .send('{"items": [');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_PAYLOAD');
    expect(response.text).not.toContain('at Object');
  });

  it('allows requests from the configured frontend origin', async () => {
    const response = await request(app)
      .get(API_ROUTES.health)
      .set('Origin', 'http://localhost:4200');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:4200');
  });

  it('does not advertise the underlying framework', async () => {
    const response = await request(app).get(API_ROUTES.health);

    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('GET /api/products', () => {
  it('returns the catalog with prices in cents and the display category', async () => {
    const { app } = buildTestApi();

    const response = await request(app).get(API_ROUTES.products);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toEqual({
      id: LAPTOP_ID,
      name: 'Laptop Pro 14"',
      category: 'TECHNOLOGY',
      categoryName: 'Tecnología',
      unitPriceInCents: 129_900,
      stock: 5,
    });
  });
});

describe('POST /api/cart/quote', () => {
  it('returns the full cascade broken down step by step', async () => {
    const { app } = buildTestApi();

    const response = await request(app)
      .post(API_ROUTES.quote)
      .send({ items: [{ productId: LAPTOP_ID, quantity: 1 }], couponCode: 'welcome2026' });

    expect(response.status).toBe(200);
    expect(response.body.originalSubtotalInCents).toBe(129_900);
    expect(response.body.discounts).toEqual([
      { kind: 'CATEGORY', percentage: 10, baseInCents: 129_900, amountInCents: 12_990 },
      { kind: 'VOLUME', percentage: 5, baseInCents: 116_910, amountInCents: 5846 },
      { kind: 'COUPON', percentage: 15, baseInCents: 111_064, amountInCents: 16_660 },
    ]);
    expect(response.body.coupon).toEqual({ code: 'WELCOME2026', status: 'APPLIED' });
    expect(response.body.capReached).toBe(false);
  });

  it('flags the cap so the frontend can raise the alert', async () => {
    const { app } = buildTestApi();

    const response = await request(app)
      .post(API_ROUTES.quote)
      .send({ items: [{ productId: LAPTOP_ID, quantity: 1 }], couponCode: 'MEGA50' });

    expect(response.body.capReached).toBe(true);
    expect(response.body.effectiveDiscountPercentage).toBe(35);
    expect(response.body.capAdjustmentInCents).toBeGreaterThan(0);
    expect(response.body.maxDiscountPercentage).toBe(35);
  });

  it('quotes anyway when the coupon does not exist', async () => {
    const { app } = buildTestApi();

    const response = await request(app)
      .post(API_ROUTES.quote)
      .send({ items: [{ productId: LAPTOP_ID, quantity: 1 }], couponCode: 'NOPE2026' });

    expect(response.status).toBe(200);
    expect(response.body.coupon).toEqual({ code: 'NOPE2026', status: 'INVALID' });
  });

  it('reports an expired coupon as expired', async () => {
    const { app } = buildTestApi();

    const response = await request(app)
      .post(API_ROUTES.quote)
      .send({ items: [{ productId: LAPTOP_ID, quantity: 1 }], couponCode: 'SUMMER2024' });

    expect(response.body.coupon.status).toBe('EXPIRED');
  });

  it.each<[string, unknown]>([
    ['an empty cart', { items: [] }],
    ['a zero quantity', { items: [{ productId: LAPTOP_ID, quantity: 0 }] }],
    ['a fractional quantity', { items: [{ productId: LAPTOP_ID, quantity: 1.5 }] }],
    ['a missing product id', { items: [{ quantity: 1 }] }],
    ['a duplicated product', {
      items: [
        { productId: LAPTOP_ID, quantity: 1 },
        { productId: LAPTOP_ID, quantity: 1 },
      ],
    }],
    ['no body at all', {}],
  ])('rejects %s with the validation issues', async (_label, payload) => {
    const { app } = buildTestApi();

    const response = await request(app).post(API_ROUTES.quote).send(payload);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_PAYLOAD');
    expect(response.body.issues.length).toBeGreaterThan(0);
    expect(response.body.issues[0]).toHaveProperty('path');
  });

  it('answers 404 when a product is not in the catalog', async () => {
    const { app } = buildTestApi();

    const response = await request(app)
      .post(API_ROUTES.quote)
      .send({ items: [{ productId: '99999999-9999-4999-8999-999999999999', quantity: 1 }] });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('PRODUCT_NOT_FOUND');
  });
});

describe('POST /api/checkout', () => {
  it('creates the order, returns it and reduces the stock', async () => {
    const { app, products } = buildTestApi();

    const response = await request(app)
      .post(API_ROUTES.checkout)
      .send({ items: [{ productId: LAPTOP_ID, quantity: 2 }], couponCode: 'WELCOME2026' });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe('order-1');
    expect(response.body.createdAt).toBe('2026-09-09T15:00:00.000Z');
    expect(response.body.summary.lines).toHaveLength(1);
    expect(response.body.summary.coupon.status).toBe('APPLIED');
    expect(products.stockOf(LAPTOP_ID)).toBe(3);
  });

  it('keeps the contract invariant in the persisted summary', async () => {
    const { app } = buildTestApi();

    const response = await request(app)
      .post(API_ROUTES.checkout)
      .send({ items: [{ productId: LAPTOP_ID, quantity: 1 }], couponCode: 'MEGA50' });

    const summary = response.body.summary;
    expect(summary.originalSubtotalInCents - summary.totalDiscountInCents).toBe(
      summary.totalInCents,
    );
    expect(summary.capReached).toBe(true);
  });

  it('answers 409 with the shortage of every offending line', async () => {
    const { app, products, orders } = buildTestApi();

    const response = await request(app)
      .post(API_ROUTES.checkout)
      .send({
        items: [
          { productId: LAPTOP_ID, quantity: 1 },
          { productId: COFFEE_ID, quantity: 9 },
        ],
      });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('OUT_OF_STOCK');
    expect(response.body.details).toEqual([{ productId: COFFEE_ID, requested: 9, available: 2 }]);
    // Nada se persiste y el stock disponible queda intacto.
    expect(products.stockOf(LAPTOP_ID)).toBe(5);
    expect(await orders.findAll()).toHaveLength(0);
  });

  it('rejects an invalid payload before touching the catalog', async () => {
    const { app, products } = buildTestApi();

    const response = await request(app).post(API_ROUTES.checkout).send({ items: [] });

    expect(response.status).toBe(400);
    expect(products.stockOf(LAPTOP_ID)).toBe(5);
  });
});

describe('GET /api/orders', () => {
  it('starts empty', async () => {
    const { app } = buildTestApi();

    const response = await request(app).get(API_ROUTES.orders);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('lists what the checkout persisted, which is how the demo proves persistence', async () => {
    const { app } = buildTestApi();
    await request(app)
      .post(API_ROUTES.checkout)
      .send({ items: [{ productId: COFFEE_ID, quantity: 1 }] });

    const response = await request(app).get(API_ROUTES.orders);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].summary.lines[0]).toMatchObject({
      productId: COFFEE_ID,
      name: 'Cafetera espresso',
      quantity: 1,
    });
  });
});

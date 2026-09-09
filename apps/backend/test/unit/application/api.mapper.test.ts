import {
  toOrderDto,
  toProductDto,
  toQuoteResponseDto,
} from '../../../src/application/mappers/api.mapper';
import { ListOrdersUseCase, ListProductsUseCase } from '../../../src/application/use-cases/catalog.use-cases';
import { DEFAULT_DISCOUNT_CONFIG } from '../../../src/domain/discounts/discount-config';
import { DiscountEngine } from '../../../src/domain/discounts/discount-engine';
import { Order } from '../../../src/domain/models/order';
import { buildCart, buildCoupon } from '../../doubles/cart.builder';
import { InMemoryOrderRepository, InMemoryProductRepository } from '../../doubles/in-memory.adapters';
import { buildProduct } from '../../doubles/product.builder';

const NOW = new Date('2026-09-09T15:00:00.000Z');

const engine = DiscountEngine.fromConfig(DEFAULT_DISCOUNT_CONFIG);
const laptop = buildProduct({
  id: 'laptop-pro',
  name: 'Laptop Pro',
  category: 'TECHNOLOGY',
  categoryName: 'Tecnología',
  priceInCents: 100_000,
  stock: 4,
});
const mug = buildProduct({
  id: 'mug',
  name: 'Taza',
  category: 'HOME',
  categoryName: 'Hogar',
  priceInCents: 1500,
  stock: 9,
});

const cart = buildCart([{ product: laptop }, { product: mug }]);
const breakdown = engine.calculate({
  cart,
  coupon: buildCoupon({ code: 'WELCOME2026', percentage: 15 }),
  requestedCouponCode: 'WELCOME2026',
  moment: NOW,
});

describe('toProductDto', () => {
  it('exposes the price in integer cents and both category fields', () => {
    expect(toProductDto(laptop)).toEqual({
      id: 'laptop-pro',
      name: 'Laptop Pro',
      category: 'TECHNOLOGY',
      categoryName: 'Tecnología',
      unitPriceInCents: 100_000,
      stock: 4,
    });
  });
});

describe('toQuoteResponseDto', () => {
  const dto = toQuoteResponseDto(cart, breakdown);

  it('serialises every cart line', () => {
    expect(dto.lines).toEqual([
      {
        productId: 'laptop-pro',
        name: 'Laptop Pro',
        category: 'TECHNOLOGY',
        unitPriceInCents: 100_000,
        quantity: 1,
        lineSubtotalInCents: 100_000,
      },
      {
        productId: 'mug',
        name: 'Taza',
        category: 'HOME',
        unitPriceInCents: 1500,
        quantity: 1,
        lineSubtotalInCents: 1500,
      },
    ]);
  });

  it('serialises the cascade step by step with its base', () => {
    expect(dto.discounts).toEqual([
      { kind: 'CATEGORY', percentage: 10, baseInCents: 100_000, amountInCents: 10_000 },
      { kind: 'VOLUME', percentage: 5, baseInCents: 91_500, amountInCents: 4575 },
      { kind: 'COUPON', percentage: 15, baseInCents: 86_925, amountInCents: 13_039 },
    ]);
  });

  it('serialises the totals and the cap information', () => {
    expect(dto.originalSubtotalInCents).toBe(101_500);
    expect(dto.totalDiscountInCents).toBe(27_614);
    expect(dto.totalInCents).toBe(73_886);
    expect(dto.effectiveDiscountPercentage).toBe(27.21);
    expect(dto.capAdjustmentInCents).toBe(0);
    expect(dto.capReached).toBe(false);
    expect(dto.maxDiscountPercentage).toBe(35);
  });

  it('serialises the coupon outcome', () => {
    expect(dto.coupon).toEqual({ code: 'WELCOME2026', status: 'APPLIED' });
  });

  it('keeps the invariant the contract promises', () => {
    expect(dto.originalSubtotalInCents - dto.totalDiscountInCents).toBe(dto.totalInCents);
  });

  it('never leaks a domain object into the contract', () => {
    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
  });
});

describe('toOrderDto', () => {
  const order = Order.fromCart({ id: 'order-1', createdAt: NOW, cart, breakdown });
  const dto = toOrderDto(order);

  it('serialises the identity of the order', () => {
    expect(dto.id).toBe('order-1');
    expect(dto.createdAt).toBe('2026-09-09T15:00:00.000Z');
  });

  it('serialises the frozen lines instead of the current catalog', () => {
    expect(dto.summary.lines).toEqual([
      {
        productId: 'laptop-pro',
        name: 'Laptop Pro',
        category: 'TECHNOLOGY',
        unitPriceInCents: 100_000,
        quantity: 1,
        lineSubtotalInCents: 100_000,
      },
      {
        productId: 'mug',
        name: 'Taza',
        category: 'HOME',
        unitPriceInCents: 1500,
        quantity: 1,
        lineSubtotalInCents: 1500,
      },
    ]);
  });

  it('carries the same totals the customer saw at checkout', () => {
    expect(dto.summary.totalInCents).toBe(73_886);
    expect(dto.summary.coupon.status).toBe('APPLIED');
  });
});

describe('read only use cases', () => {
  it('lists the catalog', async () => {
    const useCase = new ListProductsUseCase(new InMemoryProductRepository([laptop, mug]));

    expect(await useCase.execute()).toHaveLength(2);
  });

  it('lists the persisted orders', async () => {
    const repository = new InMemoryOrderRepository();
    await repository.save(Order.fromCart({ id: 'order-1', createdAt: NOW, cart, breakdown }));
    const useCase = new ListOrdersUseCase(repository);

    expect(await useCase.execute()).toHaveLength(1);
  });
});

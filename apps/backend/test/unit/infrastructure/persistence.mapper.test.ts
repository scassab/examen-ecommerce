import { DEFAULT_DISCOUNT_CONFIG } from '../../../src/domain/discounts/discount-config';
import { DiscountEngine } from '../../../src/domain/discounts/discount-engine';
import { Order } from '../../../src/domain/models/order';
import { numericTransformer } from '../../../src/infrastructure/persistence/typeorm/entities/numeric.transformer';
import { OrderEntity } from '../../../src/infrastructure/persistence/typeorm/entities/order.entities';
import {
  toCouponDomain,
  toOrderDomain,
  toOrderEntity,
  toProductDomain,
} from '../../../src/infrastructure/persistence/typeorm/mappers/persistence.mapper';
import { buildCart, buildCoupon } from '../../doubles/cart.builder';
import { buildProduct } from '../../doubles/product.builder';
import { buildCouponEntity, buildProductEntity } from '../../doubles/typeorm.doubles';

const NOW = new Date('2026-09-09T15:00:00.000Z');
const engine = DiscountEngine.fromConfig(DEFAULT_DISCOUNT_CONFIG);

const cart = buildCart([
  { product: buildProduct({ id: 'laptop', category: 'TECHNOLOGY', priceInCents: 100_000 }) },
  {
    product: buildProduct({
      id: 'mug',
      name: 'Taza',
      category: 'HOME',
      categoryName: 'Hogar',
      priceInCents: 1500,
    }),
    quantity: 2,
  },
]);

const breakdown = engine.calculate({
  cart,
  coupon: buildCoupon({ code: 'WELCOME2026', percentage: 15 }),
  requestedCouponCode: 'WELCOME2026',
  moment: NOW,
});

const order = Order.fromCart({ id: 'order-1', createdAt: NOW, cart, breakdown });

describe('toProductDomain', () => {
  it('turns flat columns into a validated domain product', () => {
    const product = toProductDomain(buildProductEntity({ unitPriceInCents: 129_900, stock: 5 }));

    expect(product.name).toBe('Laptop Pro 14"');
    expect(product.category).toBe('TECHNOLOGY');
    expect(product.categoryName).toBe('Tecnología');
    expect(product.unitPrice.inCents).toBe(129_900);
    expect(product.stock).toBe(5);
  });

  it('rejects data that violates a domain invariant instead of trusting the database', () => {
    expect(() => toProductDomain(buildProductEntity({ stock: -1 }))).toThrow();
  });
});

describe('toCouponDomain', () => {
  it('rebuilds the coupon with its percentage as a value object', () => {
    const coupon = toCouponDomain(buildCouponEntity({ percentage: 15 }));

    expect(coupon.code).toBe('WELCOME2026');
    expect(coupon.percentage.value).toBe(15);
    expect(coupon.isUsableAt(NOW)).toBe(true);
  });

  it('keeps a null expiry as a coupon that never expires', () => {
    expect(toCouponDomain(buildCouponEntity({ expiresAt: null })).expiresAt).toBeNull();
  });

  it('rebuilds an expired coupon as expired', () => {
    const coupon = toCouponDomain(
      buildCouponEntity({ code: 'SUMMER2024', expiresAt: new Date('2024-09-30T23:59:59.000Z') }),
    );

    expect(coupon.statusAt(NOW)).toBe('EXPIRED');
  });
});

describe('toOrderEntity', () => {
  const entity = toOrderEntity(order, {
    itemIds: ['item-1', 'item-2'],
    discountIds: ['discount-1', 'discount-2', 'discount-3'],
  });

  it('flattens the totals into integer columns', () => {
    expect(entity.id).toBe('order-1');
    expect(entity.originalSubtotalInCents).toBe(103_000);
    expect(entity.totalDiscountInCents).toBe(breakdown.totalDiscount.inCents);
    expect(entity.totalInCents).toBe(breakdown.total.inCents);
    expect(entity.couponCode).toBe('WELCOME2026');
    expect(entity.couponStatus).toBe('APPLIED');
  });

  it('writes one row per purchased line with its frozen data', () => {
    expect(entity.items).toHaveLength(2);
    expect(entity.items[1]).toMatchObject({
      id: 'item-2',
      productId: 'mug',
      productName: 'Taza',
      categoryCode: 'HOME',
      categoryName: 'Hogar',
      unitPriceInCents: 1500,
      quantity: 2,
      lineSubtotalInCents: 3000,
    });
  });

  it('writes one row per applied rule, numbered to preserve the cascade order', () => {
    expect(entity.discounts.map((discount) => [discount.sequence, discount.kind])).toEqual([
      [0, 'CATEGORY'],
      [1, 'VOLUME'],
      [2, 'COUPON'],
    ]);
  });

  it('records the base each rule was applied on', () => {
    expect(entity.discounts[0]?.baseInCents).toBe(100_000);
    expect(entity.discounts[1]?.baseInCents).toBe(93_000);
  });

  it('falls back to derived ids when not enough were provided', () => {
    const withoutIds = toOrderEntity(order, { itemIds: [], discountIds: [] });

    expect(withoutIds.items[0]?.id).toBe('order-1-item-0');
    expect(withoutIds.discounts[0]?.id).toBe('order-1-discount-0');
  });
});

describe('toOrderDomain', () => {
  const persisted = toOrderEntity(order, {
    itemIds: ['item-1', 'item-2'],
    discountIds: ['discount-1', 'discount-2', 'discount-3'],
  });

  it('restores the order exactly as it was persisted', () => {
    const restored = toOrderDomain(persisted);

    expect(restored.id).toBe('order-1');
    expect(restored.lines).toHaveLength(2);
    expect(restored.breakdown.totalDiscount.inCents).toBe(breakdown.totalDiscount.inCents);
    expect(restored.total.inCents).toBe(breakdown.total.inCents);
    expect(restored.breakdown.couponStatus).toBe('APPLIED');
  });

  it('reorders the cascade by sequence, because the database does not promise an order', () => {
    const shuffled = new OrderEntity();

    Object.assign(shuffled, persisted);
    shuffled.discounts = [...persisted.discounts].reverse();

    expect(toOrderDomain(shuffled).breakdown.discounts.map((discount) => discount.kind)).toEqual([
      'CATEGORY',
      'VOLUME',
      'COUPON',
    ]);
  });

  it('survives a full round trip without losing a single cent', () => {
    const restored = toOrderDomain(persisted);

    expect(restored.breakdown.originalSubtotal.inCents).toBe(103_000);
    expect(
      restored.breakdown.originalSubtotal.inCents - restored.breakdown.totalDiscount.inCents,
    ).toBe(restored.total.inCents);
  });
});

describe('numericTransformer', () => {
  it('sends numbers to the database untouched', () => {
    expect(numericTransformer.to(27.21)).toBe(27.21);
  });

  it('parses the string that the pg driver returns for numeric columns', () => {
    // El driver devuelve "27.21" para no perder precision; sin esto, el dominio
    // recibiria un string y cualquier comparacion aritmetica fallaria en silencio.
    expect(numericTransformer.from('27.21')).toBe(27.21);
  });

  it('keeps a null column as null', () => {
    expect(numericTransformer.from(null)).toBeNull();
  });
});

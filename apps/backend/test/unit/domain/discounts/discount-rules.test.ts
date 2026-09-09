import { DEFAULT_DISCOUNT_CONFIG } from '../../../../src/domain/discounts/discount-config';
import type { DiscountRuleInput } from '../../../../src/domain/discounts/discount-rule';
import { CategoryDiscountRule } from '../../../../src/domain/discounts/rules/category-discount.rule';
import { CouponDiscountRule } from '../../../../src/domain/discounts/rules/coupon-discount.rule';
import { VolumeDiscountRule } from '../../../../src/domain/discounts/rules/volume-discount.rule';
import { Money } from '../../../../src/domain/models/money';
import { Percentage } from '../../../../src/domain/models/percentage';
import { buildCart, buildCoupon } from '../../../doubles/cart.builder';
import { buildProduct } from '../../../doubles/product.builder';

const NOW = new Date('2026-09-09T15:00:00.000Z');

const laptop = buildProduct({ id: 'laptop-pro', category: 'TECHNOLOGY', priceInCents: 100_000 });
const mouse = buildProduct({ id: 'mouse', category: 'TECHNOLOGY', priceInCents: 2500 });
const mug = buildProduct({ id: 'mug', category: 'HOME', priceInCents: 1500 });

const inputFor = (overrides: Partial<DiscountRuleInput>): DiscountRuleInput => ({
  cart: overrides.cart ?? buildCart([{ product: laptop }]),
  runningTotal: overrides.runningTotal ?? Money.fromCents(100_000),
  coupon: overrides.coupon === undefined ? null : overrides.coupon,
  moment: overrides.moment ?? NOW,
});

describe('CategoryDiscountRule', () => {
  const rule = new CategoryDiscountRule(DEFAULT_DISCOUNT_CONFIG.categoryDiscount);

  it('does not apply when the cart has no product of the target category', () => {
    const cart = buildCart([{ product: mug, quantity: 3 }]);

    expect(rule.apply(inputFor({ cart }))).toBeNull();
  });

  it('discounts only the lines of the target category, not the whole cart', () => {
    const cart = buildCart([{ product: laptop }, { product: mug, quantity: 2 }]);

    const result = rule.apply(inputFor({ cart, runningTotal: cart.subtotal }));

    expect(result).not.toBeNull();
    expect(result?.kind).toBe('CATEGORY');
    // La base son los 100000 del portátil, nunca los 103000 del carrito entero.
    expect(result?.base.inCents).toBe(100_000);
    expect(result?.amount.inCents).toBe(10_000);
  });

  it('adds up every line of the category', () => {
    const cart = buildCart([{ product: laptop }, { product: mouse, quantity: 2 }]);

    const result = rule.apply(inputFor({ cart, runningTotal: cart.subtotal }));

    expect(result?.base.inCents).toBe(105_000);
    expect(result?.amount.inCents).toBe(10_500);
  });

  it('ignores the running total: it always works over the category subtotal', () => {
    const cart = buildCart([{ product: laptop }]);

    const result = rule.apply(inputFor({ cart, runningTotal: Money.fromCents(1) }));

    expect(result?.base.inCents).toBe(100_000);
  });

  it('honours the configured category and percentage', () => {
    const homeRule = new CategoryDiscountRule({
      category: 'HOME',
      percentage: Percentage.fromNumber(20),
    });
    const cart = buildCart([{ product: laptop }, { product: mug }]);

    const result = homeRule.apply(inputFor({ cart }));

    expect(result?.base.inCents).toBe(1500);
    expect(result?.amount.inCents).toBe(300);
  });
});

describe('VolumeDiscountRule', () => {
  const rule = new VolumeDiscountRule(DEFAULT_DISCOUNT_CONFIG.volumeDiscount);

  it('does not apply below the threshold', () => {
    expect(rule.apply(inputFor({ runningTotal: Money.fromCents(9999) }))).toBeNull();
  });

  it('does not apply at exactly one hundred dollars: the rule says "above"', () => {
    expect(rule.apply(inputFor({ runningTotal: Money.fromCents(10_000) }))).toBeNull();
  });

  it('applies one cent above the threshold', () => {
    const result = rule.apply(inputFor({ runningTotal: Money.fromCents(10_001) }));

    expect(result?.kind).toBe('VOLUME');
    expect(result?.base.inCents).toBe(10_001);
    // 5% de 10001 son 500.05 centavos, que redondean a 500.
    expect(result?.amount.inCents).toBe(500);
  });

  it('works over the running total left by the previous rule, not the original subtotal', () => {
    const cart = buildCart([{ product: laptop }]);

    const result = rule.apply(inputFor({ cart, runningTotal: Money.fromCents(90_000) }));

    expect(result?.base.inCents).toBe(90_000);
    expect(result?.amount.inCents).toBe(4500);
  });
});

describe('CouponDiscountRule', () => {
  const rule = new CouponDiscountRule();

  it('does not apply when no coupon was provided', () => {
    expect(rule.apply(inputFor({ coupon: null }))).toBeNull();
  });

  it('does not apply an expired coupon', () => {
    const expired = buildCoupon({ expiresAt: new Date('2024-01-01T00:00:00.000Z') });

    expect(rule.apply(inputFor({ coupon: expired }))).toBeNull();
  });

  it('does not apply a deactivated coupon', () => {
    expect(rule.apply(inputFor({ coupon: buildCoupon({ active: false }) }))).toBeNull();
  });

  it('applies the percentage carried by the coupon itself over the running total', () => {
    const result = rule.apply(
      inputFor({ coupon: buildCoupon({ percentage: 15 }), runningTotal: Money.fromCents(86_925) }),
    );

    expect(result?.kind).toBe('COUPON');
    expect(result?.percentage.value).toBe(15);
    expect(result?.base.inCents).toBe(86_925);
    // 15% de 86925 son 13038.75 centavos: media unidad redondea hacia arriba.
    expect(result?.amount.inCents).toBe(13_039);
  });

  it('lets each coupon carry a different percentage without touching the engine', () => {
    const result = rule.apply(
      inputFor({ coupon: buildCoupon({ percentage: 50 }), runningTotal: Money.fromCents(85_500) }),
    );

    expect(result?.amount.inCents).toBe(42_750);
  });
});

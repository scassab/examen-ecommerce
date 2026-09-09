import { DEFAULT_DISCOUNT_CONFIG } from '../../../../src/domain/discounts/discount-config';
import { DiscountRuleFactory } from '../../../../src/domain/discounts/discount-rule.factory';
import { Money } from '../../../../src/domain/models/money';
import { Percentage } from '../../../../src/domain/models/percentage';
import { buildCart } from '../../../doubles/cart.builder';
import { buildProduct } from '../../../doubles/product.builder';

const NOW = new Date('2026-09-09T15:00:00.000Z');

describe('DiscountRuleFactory', () => {
  it('builds the three rules in the precedence order the business requires', () => {
    const rules = new DiscountRuleFactory(DEFAULT_DISCOUNT_CONFIG).createAll();

    expect(rules.map((rule) => rule.kind)).toEqual(['CATEGORY', 'VOLUME', 'COUPON']);
  });

  it('wires the configured values into the rules it creates', () => {
    const factory = new DiscountRuleFactory({
      categoryDiscount: { category: 'HOME', percentage: Percentage.fromNumber(25) },
      volumeDiscount: {
        threshold: Money.fromCents(50_000),
        percentage: Percentage.fromNumber(8),
      },
      maxTotalDiscount: Percentage.fromNumber(50),
    });
    const cart = buildCart([
      { product: buildProduct({ id: 'mug', category: 'HOME', priceInCents: 20_000 }) },
    ]);
    const [categoryRule, volumeRule] = factory.createAll();

    const categoryResult = categoryRule?.apply({
      cart,
      runningTotal: cart.subtotal,
      coupon: null,
      moment: NOW,
    });
    const volumeResult = volumeRule?.apply({
      cart,
      runningTotal: Money.fromCents(50_001),
      coupon: null,
      moment: NOW,
    });

    expect(categoryResult?.amount.inCents).toBe(5000);
    expect(volumeResult?.amount.inCents).toBe(4000);
  });

  it('returns fresh instances so no state leaks between calculations', () => {
    const factory = new DiscountRuleFactory(DEFAULT_DISCOUNT_CONFIG);

    expect(factory.createAll()[0]).not.toBe(factory.createAll()[0]);
  });
});

import type { DiscountBreakdown } from '../../../../src/domain/discounts/discount-engine';
import { DiscountEngine } from '../../../../src/domain/discounts/discount-engine';
import { DEFAULT_DISCOUNT_CONFIG } from '../../../../src/domain/discounts/discount-config';
import type { Cart } from '../../../../src/domain/models/cart';
import type { Coupon } from '../../../../src/domain/models/coupon';
import { Money } from '../../../../src/domain/models/money';
import { Percentage } from '../../../../src/domain/models/percentage';
import { buildCart, buildCoupon } from '../../../doubles/cart.builder';
import { buildProduct } from '../../../doubles/product.builder';

const NOW = new Date('2026-09-09T15:00:00.000Z');

const engine = DiscountEngine.fromConfig(DEFAULT_DISCOUNT_CONFIG);

const laptop = buildProduct({ id: 'laptop-pro', category: 'TECHNOLOGY', priceInCents: 100_000 });
const mug = buildProduct({ id: 'mug', category: 'HOME', priceInCents: 1500 });

interface CalculationOptions {
  readonly coupon?: Coupon | null;
  readonly requestedCouponCode?: string | null;
}

const calculate = (cart: Cart, options: CalculationOptions = {}): DiscountBreakdown => {
  const coupon = options.coupon ?? null;

  return engine.calculate({
    cart,
    coupon,
    requestedCouponCode:
      options.requestedCouponCode === undefined ? (coupon?.code ?? null) : options.requestedCouponCode,
    moment: NOW,
  });
};

const amountOf = (breakdown: DiscountBreakdown, kind: string): number | undefined =>
  breakdown.discounts.find((discount) => discount.kind === kind)?.amount.inCents;

describe('DiscountEngine', () => {
  describe('the cascade described in the business rules', () => {
    // Portátil de 1000 USD (tecnología) y taza de 15 USD (hogar), cupón del 15%.
    const cart = buildCart([{ product: laptop }, { product: mug }]);
    const breakdown = calculate(cart, { coupon: buildCoupon({ percentage: 15 }) });

    it('starts from the untouched original subtotal', () => {
      expect(breakdown.originalSubtotal.inCents).toBe(101_500);
    });

    it('applies the three rules in the required order', () => {
      expect(breakdown.discounts.map((discount) => discount.kind)).toEqual([
        'CATEGORY',
        'VOLUME',
        'COUPON',
      ]);
    });

    it('discounts 10% over the technology lines only', () => {
      expect(amountOf(breakdown, 'CATEGORY')).toBe(10_000);
    });

    it('discounts 5% over the total already reduced by the category rule', () => {
      // 5% de 91500, no de los 101500 originales.
      expect(amountOf(breakdown, 'VOLUME')).toBe(4575);
    });

    it('discounts 15% over the total left by the volume rule, rounding half up', () => {
      // 15% de 86925 son 13038.75 centavos.
      expect(amountOf(breakdown, 'COUPON')).toBe(13_039);
    });

    it('is multiplicative, not a sum of percentages', () => {
      // Sumar 10 + 5 + 15 sobre el original daría 30450 centavos de descuento.
      expect(breakdown.totalDiscount.inCents).toBe(27_614);
      expect(breakdown.totalDiscount.inCents).not.toBe(30_450);
    });

    it('reports the effective percentage over the original subtotal', () => {
      // 27614 sobre 101500 son 27.2059%, redondeados a dos decimales.
      expect(breakdown.effectivePercentage.value).toBe(27.21);
    });

    it('leaves the cap untouched because the cascade never reaches it', () => {
      expect(breakdown.capReached).toBe(false);
      expect(breakdown.capAdjustment.isZero()).toBe(true);
      expect(breakdown.maxDiscountPercentage.value).toBe(35);
    });

    it('keeps the invariant subtotal minus discount equals total', () => {
      expect(breakdown.total.inCents).toBe(73_886);
      expect(breakdown.originalSubtotal.subtract(breakdown.totalDiscount).inCents).toBe(
        breakdown.total.inCents,
      );
    });
  });

  describe('the absolute 35% cap', () => {
    it('truncates the cascade and reports the exact amount it cut', () => {
      // 10% + 5% + un cupón del 50% acumulan 57.25%, muy por encima del tope.
      const breakdown = calculate(buildCart([{ product: laptop }]), {
        coupon: buildCoupon({ code: 'MEGA50', percentage: 50 }),
      });

      expect(breakdown.capReached).toBe(true);
      expect(breakdown.capAdjustment.inCents).toBe(22_250);
      expect(breakdown.totalDiscount.inCents).toBe(35_000);
      expect(breakdown.total.inCents).toBe(65_000);
      expect(breakdown.effectivePercentage.value).toBe(35);
    });

    it('still reports every raw rule amount so the breakdown stays auditable', () => {
      const breakdown = calculate(buildCart([{ product: laptop }]), {
        coupon: buildCoupon({ code: 'MEGA50', percentage: 50 }),
      });

      expect(amountOf(breakdown, 'CATEGORY')).toBe(10_000);
      expect(amountOf(breakdown, 'VOLUME')).toBe(4500);
      expect(amountOf(breakdown, 'COUPON')).toBe(42_750);
      // Las tres reglas suman 57250, y el ajuste explica la diferencia.
      const rawTotal = 10_000 + 4500 + 42_750;
      expect(rawTotal - breakdown.capAdjustment.inCents).toBe(breakdown.totalDiscount.inCents);
    });

    it('flags the cap when the discount lands exactly on 35% without truncating', () => {
      // Taza de 50 USD: sin categoría ni volumen, solo un cupón del 35%.
      const cart = buildCart([
        { product: buildProduct({ id: 'mug', category: 'HOME', priceInCents: 5000 }) },
      ]);

      const breakdown = calculate(cart, { coupon: buildCoupon({ percentage: 35 }) });

      expect(breakdown.capReached).toBe(true);
      expect(breakdown.capAdjustment.isZero()).toBe(true);
      expect(breakdown.totalDiscount.inCents).toBe(1750);
      expect(breakdown.effectivePercentage.value).toBe(35);
    });

    it('never lets the effective discount go above the cap', () => {
      const breakdown = calculate(buildCart([{ product: laptop }]), {
        coupon: buildCoupon({ percentage: 100 }),
      });

      expect(breakdown.effectivePercentage.value).toBeLessThanOrEqual(35);
      expect(breakdown.total.inCents).toBe(65_000);
    });
  });

  describe('the volume threshold', () => {
    it('does not apply at exactly one hundred dollars', () => {
      const cart = buildCart([
        { product: buildProduct({ id: 'mug', category: 'HOME', priceInCents: 10_000 }) },
      ]);

      expect(calculate(cart).discounts).toHaveLength(0);
    });

    it('applies one cent above the threshold', () => {
      const cart = buildCart([
        { product: buildProduct({ id: 'mug', category: 'HOME', priceInCents: 10_001 }) },
      ]);

      const breakdown = calculate(cart);

      expect(breakdown.discounts.map((discount) => discount.kind)).toEqual(['VOLUME']);
      expect(amountOf(breakdown, 'VOLUME')).toBe(500);
    });

    it('measures the threshold after the category discount, not before', () => {
      // 10200 de tecnología quedan en 9180 tras el 10%, por debajo del umbral.
      const cart = buildCart([
        { product: buildProduct({ id: 'gadget', category: 'TECHNOLOGY', priceInCents: 10_200 }) },
      ]);

      const breakdown = calculate(cart);

      expect(breakdown.discounts.map((discount) => discount.kind)).toEqual(['CATEGORY']);
    });
  });

  describe('carts without technology', () => {
    it('skips the category rule entirely', () => {
      const breakdown = calculate(buildCart([{ product: mug, quantity: 2 }]));

      expect(breakdown.discounts).toHaveLength(0);
      expect(breakdown.totalDiscount.isZero()).toBe(true);
      expect(breakdown.effectivePercentage.isZero()).toBe(true);
      expect(breakdown.total.inCents).toBe(3000);
    });
  });

  describe('coupon status reported to the client', () => {
    const cart = buildCart([{ product: laptop }]);

    it('says nothing was provided when the customer sent no coupon', () => {
      const breakdown = calculate(cart);

      expect(breakdown.couponStatus).toBe('NOT_PROVIDED');
      expect(breakdown.couponCode).toBeNull();
    });

    it('marks an unknown code as invalid and keeps the code for the message', () => {
      const breakdown = calculate(cart, { coupon: null, requestedCouponCode: 'NOPE2026' });

      expect(breakdown.couponStatus).toBe('INVALID');
      expect(breakdown.couponCode).toBe('NOPE2026');
      expect(amountOf(breakdown, 'COUPON')).toBeUndefined();
    });

    it('marks an expired coupon as expired and grants no coupon discount', () => {
      const expired = buildCoupon({
        code: 'SUMMER2024',
        expiresAt: new Date('2024-09-30T23:59:59.000Z'),
      });

      const breakdown = calculate(cart, { coupon: expired });

      expect(breakdown.couponStatus).toBe('EXPIRED');
      expect(amountOf(breakdown, 'COUPON')).toBeUndefined();
      // Las reglas anteriores siguen aplicando con normalidad.
      expect(amountOf(breakdown, 'CATEGORY')).toBe(10_000);
    });

    it('marks a deactivated coupon as invalid', () => {
      const breakdown = calculate(cart, { coupon: buildCoupon({ active: false }) });

      expect(breakdown.couponStatus).toBe('INVALID');
      expect(amountOf(breakdown, 'COUPON')).toBeUndefined();
    });

    it('marks a usable coupon as applied', () => {
      const breakdown = calculate(cart, { coupon: buildCoupon({ code: 'WELCOME2026' }) });

      expect(breakdown.couponStatus).toBe('APPLIED');
      expect(breakdown.couponCode).toBe('WELCOME2026');
    });
  });

  describe('configurability', () => {
    it('runs a completely different policy without touching a single rule', () => {
      const customEngine = DiscountEngine.fromConfig({
        categoryDiscount: { category: 'HOME', percentage: Percentage.fromNumber(20) },
        volumeDiscount: {
          threshold: Money.fromCents(1000),
          percentage: Percentage.fromNumber(10),
        },
        maxTotalDiscount: Percentage.fromNumber(15),
      });
      const cart = buildCart([{ product: mug, quantity: 10 }]);

      const breakdown = customEngine.calculate({
        cart,
        coupon: null,
        requestedCouponCode: null,
        moment: NOW,
      });

      // 15000 originales: 20% de categoría y 10% de volumen suman 28%, topado al 15%.
      expect(breakdown.originalSubtotal.inCents).toBe(15_000);
      expect(breakdown.maxDiscountPercentage.value).toBe(15);
      expect(breakdown.capReached).toBe(true);
      expect(breakdown.totalDiscount.inCents).toBe(2250);
      expect(breakdown.total.inCents).toBe(12_750);
    });
  });

  describe('invariants that must hold for every cart', () => {
    const scenarios: readonly { readonly label: string; readonly breakdown: DiscountBreakdown }[] = [
      { label: 'no discount at all', breakdown: calculate(buildCart([{ product: mug }])) },
      {
        label: 'the full cascade',
        breakdown: calculate(buildCart([{ product: laptop }, { product: mug }]), {
          coupon: buildCoupon({ percentage: 15 }),
        }),
      },
      {
        label: 'a capped cascade',
        breakdown: calculate(buildCart([{ product: laptop }]), {
          coupon: buildCoupon({ percentage: 50 }),
        }),
      },
    ];

    it.each(scenarios)('keeps subtotal minus discount equal to total with $label', ({ breakdown }) => {
      expect(breakdown.originalSubtotal.inCents - breakdown.totalDiscount.inCents).toBe(
        breakdown.total.inCents,
      );
    });

    it.each(scenarios)('never discounts more than the cap allows with $label', ({ breakdown }) => {
      expect(breakdown.effectivePercentage.value).toBeLessThanOrEqual(
        breakdown.maxDiscountPercentage.value,
      );
    });

    it.each(scenarios)('never produces a negative total with $label', ({ breakdown }) => {
      expect(breakdown.total.inCents).toBeGreaterThanOrEqual(0);
    });
  });
});

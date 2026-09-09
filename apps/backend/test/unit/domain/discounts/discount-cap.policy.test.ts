import { DiscountCapPolicy } from '../../../../src/domain/discounts/discount-cap.policy';
import { Money } from '../../../../src/domain/models/money';
import { Percentage } from '../../../../src/domain/models/percentage';

const policy = new DiscountCapPolicy(Percentage.fromNumber(35));

describe('DiscountCapPolicy', () => {
  it('leaves a discount below the cap untouched', () => {
    const evaluation = policy.evaluate(Money.fromCents(100_000), Money.fromCents(27_325));

    expect(evaluation.adjustment.isZero()).toBe(true);
    expect(evaluation.reached).toBe(false);
    expect(evaluation.maxDiscount.inCents).toBe(35_000);
  });

  it('truncates a discount above the cap and reports how much was cut', () => {
    const evaluation = policy.evaluate(Money.fromCents(100_000), Money.fromCents(57_250));

    expect(evaluation.adjustment.inCents).toBe(22_250);
    expect(evaluation.reached).toBe(true);
    expect(evaluation.maxDiscount.inCents).toBe(35_000);
  });

  it('flags the cap as reached when the discount lands exactly on it', () => {
    const evaluation = policy.evaluate(Money.fromCents(100_000), Money.fromCents(35_000));

    expect(evaluation.adjustment.isZero()).toBe(true);
    expect(evaluation.reached).toBe(true);
  });

  it('does not flag a cart with no discount at all', () => {
    const evaluation = policy.evaluate(Money.fromCents(100_000), Money.zero());

    expect(evaluation.reached).toBe(false);
    expect(evaluation.adjustment.isZero()).toBe(true);
  });

  it('never flags anything when the cart itself is worth nothing', () => {
    const evaluation = policy.evaluate(Money.zero(), Money.zero());

    expect(evaluation.reached).toBe(false);
    expect(evaluation.maxDiscount.isZero()).toBe(true);
  });

  it('rounds the maximum allowed discount half up', () => {
    // 35% de 1010 centavos son 353.5, que redondean a 354.
    expect(policy.evaluate(Money.fromCents(1010), Money.zero()).maxDiscount.inCents).toBe(354);
  });

  it('honours a different cap without any change to the rules', () => {
    const strictPolicy = new DiscountCapPolicy(Percentage.fromNumber(10));

    const evaluation = strictPolicy.evaluate(Money.fromCents(100_000), Money.fromCents(27_325));

    expect(evaluation.maxDiscount.inCents).toBe(10_000);
    expect(evaluation.adjustment.inCents).toBe(17_325);
    expect(evaluation.reached).toBe(true);
  });
});

import { InvalidValueError } from '../../../src/domain/errors/domain.error';
import { Money } from '../../../src/domain/models/money';
import { Percentage } from '../../../src/domain/models/percentage';

describe('Percentage', () => {
  it('is built from a number between zero and one hundred', () => {
    expect(Percentage.fromNumber(35).value).toBe(35);
    expect(Percentage.fromNumber(0).isZero()).toBe(true);
    expect(Percentage.fromNumber(100).value).toBe(100);
  });

  it.each<[string, number]>([
    ['a negative rate', -0.01],
    ['a rate above one hundred', 100.01],
    ['an infinite rate', Number.POSITIVE_INFINITY],
    ['not a number', Number.NaN],
  ])('refuses %s', (_label, value) => {
    expect(() => Percentage.fromNumber(value)).toThrow(InvalidValueError);
  });

  it('applies itself over a base amount', () => {
    expect(Percentage.fromNumber(15).applyTo(Money.fromCents(20_000)).inCents).toBe(3000);
  });

  describe('of', () => {
    it('expresses a part over a whole', () => {
      expect(Percentage.of(Money.fromCents(3500), Money.fromCents(10_000)).value).toBe(35);
    });

    it('keeps two decimals, which is what the breakdown shows', () => {
      // 27325 sobre 100000 es 27.325%, que redondea a 27.33%
      expect(Percentage.of(Money.fromCents(27_325), Money.fromCents(100_000)).value).toBe(27.33);
    });

    it('returns zero when the whole is zero instead of dividing by zero', () => {
      expect(Percentage.of(Money.fromCents(100), Money.zero()).isZero()).toBe(true);
    });

    it('returns zero when there is no discount at all', () => {
      expect(Percentage.of(Money.zero(), Money.fromCents(10_000)).isZero()).toBe(true);
    });
  });

  it('compares rates', () => {
    expect(Percentage.fromNumber(36).isGreaterThan(Percentage.fromNumber(35))).toBe(true);
    expect(Percentage.fromNumber(35).isGreaterThan(Percentage.fromNumber(35))).toBe(false);
  });
});

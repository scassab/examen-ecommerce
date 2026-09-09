import { Money } from '../../../src/domain/models/money';
import { Percentage } from '../../../src/domain/models/percentage';
import { InvalidValueError } from '../../../src/domain/errors/domain.error';

describe('Money', () => {
  it('is built from an integer amount of cents', () => {
    expect(Money.fromCents(1999).inCents).toBe(1999);
  });

  it('accepts zero', () => {
    expect(Money.zero().inCents).toBe(0);
    expect(Money.zero().isZero()).toBe(true);
  });

  it.each<[string, number]>([
    ['a fractional amount', 19.99],
    ['a negative amount', -1],
    ['a non finite amount', Number.POSITIVE_INFINITY],
    ['not a number at all', Number.NaN],
  ])('refuses %s', (_label, cents) => {
    expect(() => Money.fromCents(cents)).toThrow(InvalidValueError);
  });

  it('adds without losing a single cent', () => {
    expect(Money.fromCents(1999).add(Money.fromCents(1)).inCents).toBe(2000);
  });

  it('sums a list, treating the empty list as zero', () => {
    expect(Money.sum([Money.fromCents(100), Money.fromCents(250)]).inCents).toBe(350);
    expect(Money.sum([]).isZero()).toBe(true);
  });

  it('subtracts', () => {
    expect(Money.fromCents(2000).subtract(Money.fromCents(1)).inCents).toBe(1999);
  });

  it('refuses a subtraction that would go negative', () => {
    expect(() => Money.fromCents(100).subtract(Money.fromCents(101))).toThrow(InvalidValueError);
  });

  it('allows a subtraction that lands exactly on zero', () => {
    expect(Money.fromCents(100).subtract(Money.fromCents(100)).isZero()).toBe(true);
  });

  it('multiplies by a quantity of units', () => {
    expect(Money.fromCents(1999).multipliedBy(3).inCents).toBe(5997);
    expect(Money.fromCents(1999).multipliedBy(0).isZero()).toBe(true);
  });

  it.each<[string, number]>([
    ['a fractional quantity', 1.5],
    ['a negative quantity', -1],
  ])('refuses to multiply by %s', (_label, quantity) => {
    expect(() => Money.fromCents(100).multipliedBy(quantity)).toThrow(InvalidValueError);
  });

  describe('percentage', () => {
    it('applies a percentage over the amount', () => {
      expect(Money.fromCents(100_000).percentage(Percentage.fromNumber(10)).inCents).toBe(10_000);
    });

    it('rounds half up, the commercial criterion', () => {
      // 1005 * 10% = 100.5 cents exactos
      expect(Money.fromCents(1005).percentage(Percentage.fromNumber(10)).inCents).toBe(101);
    });

    it('rounds down below the half cent', () => {
      // 1004 * 10% = 100.4 cents
      expect(Money.fromCents(1004).percentage(Percentage.fromNumber(10)).inCents).toBe(100);
    });

    it('rounds a single cent split in half up to one cent', () => {
      expect(Money.fromCents(1).percentage(Percentage.fromNumber(50)).inCents).toBe(1);
    });

    it('returns zero for a zero percentage', () => {
      expect(Money.fromCents(100_000).percentage(Percentage.zero()).isZero()).toBe(true);
    });
  });

  it('compares amounts', () => {
    expect(Money.fromCents(200).isGreaterThan(Money.fromCents(100))).toBe(true);
    expect(Money.fromCents(100).isGreaterThan(Money.fromCents(100))).toBe(false);
    expect(Money.fromCents(100).equals(Money.fromCents(100))).toBe(true);
    expect(Money.fromCents(100).equals(Money.fromCents(101))).toBe(false);
  });

  it('returns the smaller of two amounts', () => {
    expect(Money.fromCents(100).min(Money.fromCents(250)).inCents).toBe(100);
    expect(Money.fromCents(250).min(Money.fromCents(100)).inCents).toBe(100);
    expect(Money.fromCents(100).min(Money.fromCents(100)).inCents).toBe(100);
  });

  it('never mutates the original amount', () => {
    const original = Money.fromCents(1000);

    original.add(Money.fromCents(500));
    original.multipliedBy(3);

    expect(original.inCents).toBe(1000);
  });
});

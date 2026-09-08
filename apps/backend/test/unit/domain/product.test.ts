import { InsufficientStockError, InvalidValueError } from '../../../src/domain/errors/domain.error';
import { Money } from '../../../src/domain/models/money';
import { buildProduct } from '../../doubles/product.builder';

describe('Product', () => {
  it.each<[string, () => unknown]>([
    ['an empty id', (): unknown => buildProduct({ id: '   ' })],
    ['an empty name', (): unknown => buildProduct({ name: '' })],
    ['a negative stock', (): unknown => buildProduct({ stock: -1 })],
    ['a fractional stock', (): unknown => buildProduct({ stock: 1.5 })],
  ])('refuses to exist with %s', (_label, create) => {
    expect(create).toThrow(InvalidValueError);
  });

  it('accepts a product with no stock left', () => {
    expect(buildProduct({ stock: 0 }).stock).toBe(0);
  });

  it('knows the category it belongs to', () => {
    const product = buildProduct({ category: 'TECHNOLOGY' });

    expect(product.belongsTo('TECHNOLOGY')).toBe(true);
    expect(product.belongsTo('HOME')).toBe(false);
  });

  it('answers whether it can cover a requested quantity', () => {
    const product = buildProduct({ stock: 3 });

    expect(product.hasStockFor(3)).toBe(true);
    expect(product.hasStockFor(4)).toBe(false);
  });

  it('prices a quantity of units', () => {
    expect(buildProduct({ priceInCents: 1999 }).priceFor(3).inCents).toBe(5997);
  });

  describe('withStockReducedBy', () => {
    it('returns a new product and leaves the original untouched', () => {
      const original = buildProduct({ stock: 5 });

      const reduced = original.withStockReducedBy(2);

      expect(reduced.stock).toBe(3);
      expect(original.stock).toBe(5);
      expect(reduced).not.toBe(original);
    });

    it('keeps every other attribute intact', () => {
      const original = buildProduct({ stock: 5, priceInCents: 4599, categoryName: 'Tecnología' });

      const reduced = original.withStockReducedBy(1);

      expect(reduced.id).toBe(original.id);
      expect(reduced.name).toBe(original.name);
      expect(reduced.category).toBe(original.category);
      expect(reduced.categoryName).toBe('Tecnología');
      expect(reduced.unitPrice.equals(Money.fromCents(4599))).toBe(true);
    });

    it('allows taking the very last unit', () => {
      expect(buildProduct({ stock: 1 }).withStockReducedBy(1).stock).toBe(0);
    });

    it('reports how many units were requested and how many were available', () => {
      const product = buildProduct({ id: 'laptop-pro', stock: 2 });

      try {
        product.withStockReducedBy(3);
        throw new Error('expected the reduction to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientStockError);
        const failure = error as InsufficientStockError;
        expect(failure.code).toBe('OUT_OF_STOCK');
        expect(failure.productId).toBe('laptop-pro');
        expect(failure.requested).toBe(3);
        expect(failure.available).toBe(2);
      }
    });

    it.each<[string, number]>([
      ['zero units', 0],
      ['a negative amount', -1],
      ['a fractional amount', 1.5],
    ])('refuses to reduce by %s', (_label, quantity) => {
      expect(() => buildProduct().withStockReducedBy(quantity)).toThrow(InvalidValueError);
    });
  });
});

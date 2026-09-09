import {
  DuplicatedProductError,
  EmptyCartError,
  InvalidValueError,
} from '../../../src/domain/errors/domain.error';
import { Cart, CartLine } from '../../../src/domain/models/cart';
import { buildProduct } from '../../doubles/product.builder';

const laptop = buildProduct({ id: 'laptop-pro', category: 'TECHNOLOGY', priceInCents: 100_000 });
const mouse = buildProduct({ id: 'mouse', category: 'TECHNOLOGY', priceInCents: 2500 });
const mug = buildProduct({ id: 'mug', category: 'HOME', priceInCents: 1500 });

describe('CartLine', () => {
  it('prices the line as unit price times quantity', () => {
    expect(new CartLine(mouse, 4).subtotal.inCents).toBe(10_000);
  });

  it.each<[string, number]>([
    ['zero', 0],
    ['a negative quantity', -2],
    ['a fractional quantity', 2.5],
  ])('refuses %s as a quantity', (_label, quantity) => {
    expect(() => new CartLine(mouse, quantity)).toThrow(InvalidValueError);
  });
});

describe('Cart', () => {
  it('refuses to exist without lines', () => {
    expect(() => Cart.fromLines([])).toThrow(EmptyCartError);
  });

  it('refuses the same product in two lines', () => {
    expect(() => Cart.fromLines([new CartLine(mouse, 1), new CartLine(mouse, 2)])).toThrow(
      DuplicatedProductError,
    );
  });

  it('reports which product was duplicated', () => {
    try {
      Cart.fromLines([new CartLine(laptop, 1), new CartLine(laptop, 1)]);
      throw new Error('expected the cart to be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(DuplicatedProductError);
      expect((error as DuplicatedProductError).productId).toBe('laptop-pro');
    }
  });

  it('adds up every line into the original subtotal', () => {
    const cart = Cart.fromLines([new CartLine(laptop, 1), new CartLine(mug, 2)]);

    expect(cart.subtotal.inCents).toBe(103_000);
    expect(cart.size).toBe(2);
  });

  it('adds up only the lines of a given category', () => {
    const cart = Cart.fromLines([
      new CartLine(laptop, 1),
      new CartLine(mouse, 2),
      new CartLine(mug, 1),
    ]);

    expect(cart.subtotalOfCategory('TECHNOLOGY').inCents).toBe(105_000);
    expect(cart.subtotalOfCategory('HOME').inCents).toBe(1500);
  });

  it('returns zero for a category that is not in the cart', () => {
    const cart = Cart.fromLines([new CartLine(mug, 1)]);

    expect(cart.subtotalOfCategory('CLOTHING').isZero()).toBe(true);
  });

  it('answers whether a category is present', () => {
    const cart = Cart.fromLines([new CartLine(mug, 1)]);

    expect(cart.containsCategory('HOME')).toBe(true);
    expect(cart.containsCategory('TECHNOLOGY')).toBe(false);
  });
});

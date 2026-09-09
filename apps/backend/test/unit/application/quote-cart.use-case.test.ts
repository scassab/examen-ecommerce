import { QuoteCartUseCase } from '../../../src/application/use-cases/quote-cart.use-case';
import { DEFAULT_DISCOUNT_CONFIG } from '../../../src/domain/discounts/discount-config';
import { DiscountEngine } from '../../../src/domain/discounts/discount-engine';
import {
  DuplicatedProductError,
  EmptyCartError,
  ProductNotFoundError,
} from '../../../src/domain/errors/domain.error';
import { buildCoupon } from '../../doubles/cart.builder';
import {
  FixedClock,
  InMemoryCouponRepository,
  InMemoryProductRepository,
} from '../../doubles/in-memory.adapters';
import { buildProduct } from '../../doubles/product.builder';

const NOW = new Date('2026-09-09T15:00:00.000Z');

const laptop = buildProduct({
  id: 'laptop-pro',
  category: 'TECHNOLOGY',
  priceInCents: 100_000,
  stock: 3,
});
const mug = buildProduct({ id: 'mug', category: 'HOME', priceInCents: 1500, stock: 10 });

const welcome = buildCoupon({ code: 'WELCOME2026', percentage: 15 });
const expired = buildCoupon({
  code: 'SUMMER2024',
  percentage: 20,
  expiresAt: new Date('2024-09-30T23:59:59.000Z'),
});

const buildUseCase = (): QuoteCartUseCase =>
  new QuoteCartUseCase(
    new InMemoryProductRepository([laptop, mug]),
    new InMemoryCouponRepository([welcome, expired]),
    DiscountEngine.fromConfig(DEFAULT_DISCOUNT_CONFIG),
    new FixedClock(NOW),
  );

describe('QuoteCartUseCase', () => {
  it('resolves the catalog and runs the full cascade', async () => {
    const { cart, breakdown } = await buildUseCase().execute({
      items: [
        { productId: 'laptop-pro', quantity: 1 },
        { productId: 'mug', quantity: 1 },
      ],
      couponCode: 'WELCOME2026',
    });

    expect(cart.size).toBe(2);
    expect(breakdown.originalSubtotal.inCents).toBe(101_500);
    expect(breakdown.totalDiscount.inCents).toBe(27_614);
    expect(breakdown.total.inCents).toBe(73_886);
    expect(breakdown.couponStatus).toBe('APPLIED');
  });

  it('prices several units of the same product', async () => {
    const { breakdown } = await buildUseCase().execute({
      items: [{ productId: 'mug', quantity: 4 }],
      couponCode: null,
    });

    expect(breakdown.originalSubtotal.inCents).toBe(6000);
  });

  it('rejects a product that is not in the catalog', async () => {
    await expect(
      buildUseCase().execute({
        items: [{ productId: 'ghost-product', quantity: 1 }],
        couponCode: null,
      }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
  });

  it('reports every unknown product at once', async () => {
    try {
      await buildUseCase().execute({
        items: [
          { productId: 'ghost-one', quantity: 1 },
          { productId: 'laptop-pro', quantity: 1 },
          { productId: 'ghost-two', quantity: 1 },
        ],
        couponCode: null,
      });
      throw new Error('expected the quote to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ProductNotFoundError);
      expect((error as ProductNotFoundError).productIds).toEqual(['ghost-one', 'ghost-two']);
    }
  });

  it('rejects an empty cart', async () => {
    await expect(buildUseCase().execute({ items: [], couponCode: null })).rejects.toBeInstanceOf(
      EmptyCartError,
    );
  });

  it('rejects the same product sent in two lines', async () => {
    await expect(
      buildUseCase().execute({
        items: [
          { productId: 'mug', quantity: 1 },
          { productId: 'mug', quantity: 2 },
        ],
        couponCode: null,
      }),
    ).rejects.toBeInstanceOf(DuplicatedProductError);
  });

  it('still quotes when the coupon code does not exist', async () => {
    const { breakdown } = await buildUseCase().execute({
      items: [{ productId: 'laptop-pro', quantity: 1 }],
      couponCode: 'NOPE2026',
    });

    expect(breakdown.couponStatus).toBe('INVALID');
    expect(breakdown.couponCode).toBe('NOPE2026');
    expect(breakdown.total.inCents).toBe(85_500);
  });

  it('still quotes when the coupon has expired', async () => {
    const { breakdown } = await buildUseCase().execute({
      items: [{ productId: 'laptop-pro', quantity: 1 }],
      couponCode: 'SUMMER2024',
    });

    expect(breakdown.couponStatus).toBe('EXPIRED');
    expect(breakdown.discounts.map((discount) => discount.kind)).toEqual(['CATEGORY', 'VOLUME']);
  });

  it('does not check stock: quoting is a simulation, not a purchase', async () => {
    const { breakdown } = await buildUseCase().execute({
      // Solo hay 3 portátiles en catálogo.
      items: [{ productId: 'laptop-pro', quantity: 5 }],
      couponCode: null,
    });

    expect(breakdown.originalSubtotal.inCents).toBe(500_000);
  });

  it('leaves the catalog untouched', async () => {
    const products = new InMemoryProductRepository([laptop, mug]);
    const useCase = new QuoteCartUseCase(
      products,
      new InMemoryCouponRepository([welcome]),
      DiscountEngine.fromConfig(DEFAULT_DISCOUNT_CONFIG),
      new FixedClock(NOW),
    );

    await useCase.execute({ items: [{ productId: 'laptop-pro', quantity: 2 }], couponCode: null });

    expect(products.stockOf('laptop-pro')).toBe(3);
  });
});

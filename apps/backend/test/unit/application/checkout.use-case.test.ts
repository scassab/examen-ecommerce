import { CheckoutUseCase } from '../../../src/application/use-cases/checkout.use-case';
import { DEFAULT_DISCOUNT_CONFIG } from '../../../src/domain/discounts/discount-config';
import { DiscountEngine } from '../../../src/domain/discounts/discount-engine';
import { OutOfStockError, ProductNotFoundError } from '../../../src/domain/errors/domain.error';
import { buildCoupon } from '../../doubles/cart.builder';
import {
  FixedClock,
  InMemoryCheckoutUnitOfWork,
  InMemoryCouponRepository,
  InMemoryOrderRepository,
  InMemoryProductRepository,
  SequentialIdGenerator,
} from '../../doubles/in-memory.adapters';
import { buildProduct } from '../../doubles/product.builder';

const NOW = new Date('2026-09-09T15:00:00.000Z');

const laptop = buildProduct({
  id: 'laptop-pro',
  category: 'TECHNOLOGY',
  priceInCents: 100_000,
  stock: 3,
});
const mug = buildProduct({ id: 'mug', category: 'HOME', priceInCents: 1500, stock: 2 });

interface Harness {
  readonly useCase: CheckoutUseCase;
  readonly products: InMemoryProductRepository;
  readonly orders: InMemoryOrderRepository;
  readonly unitOfWork: InMemoryCheckoutUnitOfWork;
}

const buildHarness = (): Harness => {
  const products = new InMemoryProductRepository([laptop, mug]);
  const orders = new InMemoryOrderRepository();
  const unitOfWork = new InMemoryCheckoutUnitOfWork(products, orders);
  const useCase = new CheckoutUseCase(
    unitOfWork,
    new InMemoryCouponRepository([buildCoupon({ code: 'WELCOME2026', percentage: 15 })]),
    DiscountEngine.fromConfig(DEFAULT_DISCOUNT_CONFIG),
    new FixedClock(NOW),
    new SequentialIdGenerator(),
  );

  return { useCase, products, orders, unitOfWork };
};

describe('CheckoutUseCase', () => {
  it('persists the order with the breakdown recalculated on the server', async () => {
    const { useCase, orders } = buildHarness();

    const order = await useCase.execute({
      items: [
        { productId: 'laptop-pro', quantity: 1 },
        { productId: 'mug', quantity: 1 },
      ],
      couponCode: 'WELCOME2026',
    });

    expect(order.id).toBe('order-1');
    expect(order.createdAt).toEqual(NOW);
    expect(order.breakdown.totalDiscount.inCents).toBe(27_614);
    expect(order.total.inCents).toBe(73_886);
    expect(await orders.findAll()).toHaveLength(1);
  });

  it('reduces the stock of every purchased product', async () => {
    const { useCase, products } = buildHarness();

    await useCase.execute({
      items: [
        { productId: 'laptop-pro', quantity: 2 },
        { productId: 'mug', quantity: 1 },
      ],
      couponCode: null,
    });

    expect(products.stockOf('laptop-pro')).toBe(1);
    expect(products.stockOf('mug')).toBe(1);
  });

  it('freezes name and price into the order lines', async () => {
    const { useCase } = buildHarness();

    const order = await useCase.execute({
      items: [{ productId: 'laptop-pro', quantity: 2 }],
      couponCode: null,
    });

    expect(order.lines).toHaveLength(1);
    expect(order.lines[0]?.productName).toBe('Laptop Pro');
    expect(order.lines[0]?.category).toBe('TECHNOLOGY');
    expect(order.lines[0]?.unitPrice.inCents).toBe(100_000);
    expect(order.lines[0]?.lineSubtotal.inCents).toBe(200_000);
  });

  it('locks the products before doing anything else', async () => {
    const { useCase, unitOfWork } = buildHarness();

    await useCase.execute({
      items: [
        { productId: 'laptop-pro', quantity: 1 },
        { productId: 'mug', quantity: 1 },
      ],
      couponCode: null,
    });

    expect(unitOfWork.lockedIds).toEqual([['laptop-pro', 'mug']]);
  });

  it('allows buying the very last unit in stock', async () => {
    const { useCase, products } = buildHarness();

    await useCase.execute({ items: [{ productId: 'mug', quantity: 2 }], couponCode: null });

    expect(products.stockOf('mug')).toBe(0);
  });

  describe('when there is not enough stock', () => {
    it('rejects the purchase', async () => {
      const { useCase } = buildHarness();

      await expect(
        useCase.execute({ items: [{ productId: 'mug', quantity: 3 }], couponCode: null }),
      ).rejects.toBeInstanceOf(OutOfStockError);
    });

    it('reports every shortage at once, not just the first one', async () => {
      const { useCase } = buildHarness();

      try {
        await useCase.execute({
          items: [
            { productId: 'laptop-pro', quantity: 9 },
            { productId: 'mug', quantity: 5 },
          ],
          couponCode: null,
        });
        throw new Error('expected the checkout to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(OutOfStockError);
        expect((error as OutOfStockError).shortages).toEqual([
          { productId: 'laptop-pro', requested: 9, available: 3 },
          { productId: 'mug', requested: 5, available: 2 },
        ]);
      }
    });

    it('leaves the stock untouched and persists no order', async () => {
      const { useCase, products, orders } = buildHarness();

      await expect(
        useCase.execute({
          items: [
            { productId: 'laptop-pro', quantity: 1 },
            { productId: 'mug', quantity: 3 },
          ],
          couponCode: null,
        }),
      ).rejects.toBeInstanceOf(OutOfStockError);

      // El portátil sí tenía stock: sin transacción se habría descontado igual.
      expect(products.stockOf('laptop-pro')).toBe(3);
      expect(products.stockOf('mug')).toBe(2);
      expect(await orders.findAll()).toHaveLength(0);
    });
  });

  it('rejects an unknown product without touching anything', async () => {
    const { useCase, products, orders } = buildHarness();

    await expect(
      useCase.execute({ items: [{ productId: 'ghost', quantity: 1 }], couponCode: null }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);

    expect(products.stockOf('laptop-pro')).toBe(3);
    expect(await orders.findAll()).toHaveLength(0);
  });

  it('records the coupon status in the persisted order', async () => {
    const { useCase } = buildHarness();

    const order = await useCase.execute({
      items: [{ productId: 'laptop-pro', quantity: 1 }],
      couponCode: 'NOPE2026',
    });

    expect(order.breakdown.couponStatus).toBe('INVALID');
    expect(order.breakdown.couponCode).toBe('NOPE2026');
  });

  it('persists the cap information so the order stays auditable', async () => {
    const products = new InMemoryProductRepository([laptop]);
    const orders = new InMemoryOrderRepository();
    const useCase = new CheckoutUseCase(
      new InMemoryCheckoutUnitOfWork(products, orders),
      new InMemoryCouponRepository([buildCoupon({ code: 'MEGA50', percentage: 50 })]),
      DiscountEngine.fromConfig(DEFAULT_DISCOUNT_CONFIG),
      new FixedClock(NOW),
      new SequentialIdGenerator(),
    );

    const order = await useCase.execute({
      items: [{ productId: 'laptop-pro', quantity: 1 }],
      couponCode: 'MEGA50',
    });

    expect(order.breakdown.capReached).toBe(true);
    expect(order.breakdown.capAdjustment.inCents).toBe(22_250);
    expect(order.breakdown.totalDiscount.inCents).toBe(35_000);
  });

  it('gives each order its own identifier', async () => {
    const { useCase } = buildHarness();

    const first = await useCase.execute({
      items: [{ productId: 'mug', quantity: 1 }],
      couponCode: null,
    });
    const second = await useCase.execute({
      items: [{ productId: 'mug', quantity: 1 }],
      couponCode: null,
    });

    expect(first.id).toBe('order-1');
    expect(second.id).toBe('order-2');
  });
});

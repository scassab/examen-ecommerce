import { CheckoutUseCase } from '../../../src/application/use-cases/checkout.use-case';
import { ListOrdersUseCase, ListProductsUseCase } from '../../../src/application/use-cases/catalog.use-cases';
import { QuoteCartUseCase } from '../../../src/application/use-cases/quote-cart.use-case';
import { DEFAULT_DISCOUNT_CONFIG } from '../../../src/domain/discounts/discount-config';
import { DiscountEngine } from '../../../src/domain/discounts/discount-engine';
import { Money } from '../../../src/domain/models/money';
import { Order } from '../../../src/domain/models/order';
import { Percentage } from '../../../src/domain/models/percentage';
import { buildApiDependencies } from '../../../src/infrastructure/composition-root';
import { CouponEntity, ProductEntity } from '../../../src/infrastructure/persistence/typeorm/entities/catalog.entities';
import { OrderEntity } from '../../../src/infrastructure/persistence/typeorm/entities/order.entities';
import { TypeOrmCheckoutUnitOfWork } from '../../../src/infrastructure/persistence/typeorm/repositories/typeorm-checkout.unit-of-work';
import {
  TypeOrmCouponRepository,
  TypeOrmOrderRepository,
  TypeOrmProductRepository,
} from '../../../src/infrastructure/persistence/typeorm/repositories/typeorm.repositories';
import { SystemClock, UuidGenerator } from '../../../src/infrastructure/services/system-services';
import { buildCart, buildCoupon } from '../../doubles/cart.builder';
import { SequentialIdGenerator } from '../../doubles/in-memory.adapters';
import { buildProduct } from '../../doubles/product.builder';
import {
  FakeDataSource,
  FakeEntityManager,
  buildCouponEntity,
  buildProductEntity,
} from '../../doubles/typeorm.doubles';

const NOW = new Date('2026-09-09T15:00:00.000Z');

const buildOrder = (): Order => {
  const cart = buildCart([
    { product: buildProduct({ id: 'laptop', category: 'TECHNOLOGY', priceInCents: 100_000 }) },
  ]);

  return Order.fromCart({
    id: 'order-1',
    createdAt: NOW,
    cart,
    breakdown: DiscountEngine.fromConfig(DEFAULT_DISCOUNT_CONFIG).calculate({
      cart,
      coupon: buildCoupon({ percentage: 15 }),
      requestedCouponCode: 'WELCOME2026',
      moment: NOW,
    }),
  });
};

describe('TypeOrmProductRepository', () => {
  it('returns domain products, not entities', async () => {
    const manager = new FakeEntityManager(new Map([[ProductEntity, [buildProductEntity()]]]));
    const repository = new TypeOrmProductRepository(manager.asEntityManager());

    const products = await repository.findAll();

    expect(products[0]?.unitPrice.inCents).toBe(129_900);
    expect(products[0]?.categoryName).toBe('Tecnología');
  });

  it('does not hit the database when no id was requested', async () => {
    const manager = new FakeEntityManager();
    const repository = new TypeOrmProductRepository(manager.asEntityManager());

    expect(await repository.findByIds([])).toEqual([]);
    expect(manager.finds).toHaveLength(0);
  });

  it('queries only the requested ids', async () => {
    const manager = new FakeEntityManager(new Map([[ProductEntity, [buildProductEntity()]]]));
    const repository = new TypeOrmProductRepository(manager.asEntityManager());

    await repository.findByIds(['a', 'b']);

    expect(manager.finds[0]?.target).toBe(ProductEntity);
  });
});

describe('TypeOrmCouponRepository', () => {
  it('maps a found coupon into the domain', async () => {
    const manager = new FakeEntityManager(new Map([[CouponEntity, [buildCouponEntity()]]]));
    const repository = new TypeOrmCouponRepository(manager.asEntityManager());

    const coupon = await repository.findByCode('WELCOME2026');

    expect(coupon?.percentage.value).toBe(15);
  });

  it('returns null for an unknown code instead of throwing', async () => {
    const manager = new FakeEntityManager();
    const repository = new TypeOrmCouponRepository(manager.asEntityManager());

    expect(await repository.findByCode('NOPE')).toBeNull();
  });
});

describe('TypeOrmOrderRepository', () => {
  it('persists the order with generated ids for its child rows', async () => {
    const manager = new FakeEntityManager();
    const repository = new TypeOrmOrderRepository(
      manager.asEntityManager(),
      new SequentialIdGenerator('row'),
    );

    await repository.save(buildOrder());

    const saved = manager.saved[0] as OrderEntity;
    expect(saved.id).toBe('order-1');
    expect(saved.items[0]?.id).toBe('row-1');
    expect(saved.discounts.map((discount) => discount.id)).toEqual(['row-2', 'row-3', 'row-4']);
  });

  it('returns the domain order it was given, not the entity', async () => {
    const manager = new FakeEntityManager();
    const repository = new TypeOrmOrderRepository(
      manager.asEntityManager(),
      new SequentialIdGenerator(),
    );
    const order = buildOrder();

    expect(await repository.save(order)).toBe(order);
  });

  it('rebuilds persisted orders into the domain', async () => {
    const manager = new FakeEntityManager();
    const writer = new TypeOrmOrderRepository(
      manager.asEntityManager(),
      new SequentialIdGenerator(),
    );
    await writer.save(buildOrder());

    const reader = new TypeOrmOrderRepository(
      new FakeEntityManager(new Map([[OrderEntity, manager.saved]])).asEntityManager(),
      new SequentialIdGenerator(),
    );

    const orders = await reader.findAll();

    expect(orders[0]?.id).toBe('order-1');
    expect(orders[0]?.breakdown.discounts.map((discount) => discount.kind)).toEqual([
      'CATEGORY',
      'VOLUME',
      'COUPON',
    ]);
  });
});

describe('TypeOrmCheckoutUnitOfWork', () => {
  it('runs the work inside a transaction', async () => {
    const manager = new FakeEntityManager();
    const dataSource = new FakeDataSource(manager);
    const unitOfWork = new TypeOrmCheckoutUnitOfWork(
      dataSource.asDataSource(),
      new SequentialIdGenerator(),
    );

    const result = await unitOfWork.run(async () => 'done');

    expect(result).toBe('done');
    expect(dataSource.transactions).toBe(1);
  });

  it('asks PostgreSQL for a pessimistic write lock on the products table', async () => {
    const manager = new FakeEntityManager(new Map([[ProductEntity, [buildProductEntity()]]]));
    const unitOfWork = new TypeOrmCheckoutUnitOfWork(
      new FakeDataSource(manager).asDataSource(),
      new SequentialIdGenerator(),
    );

    await unitOfWork.run(async (context) => context.lockProducts(['laptop']));

    expect(manager.finds[0]?.options).toMatchObject({
      lock: { mode: 'pessimistic_write', tables: ['products'] },
    });
  });

  it('skips the query when there is nothing to lock', async () => {
    const manager = new FakeEntityManager();
    const unitOfWork = new TypeOrmCheckoutUnitOfWork(
      new FakeDataSource(manager).asDataSource(),
      new SequentialIdGenerator(),
    );

    const locked = await unitOfWork.run(async (context) => context.lockProducts([]));

    expect(locked).toEqual([]);
    expect(manager.finds).toHaveLength(0);
  });

  it('updates only the stock column of each purchased product', async () => {
    const manager = new FakeEntityManager();
    const unitOfWork = new TypeOrmCheckoutUnitOfWork(
      new FakeDataSource(manager).asDataSource(),
      new SequentialIdGenerator(),
    );

    await unitOfWork.run(async (context) =>
      context.saveProducts([buildProduct({ id: 'laptop', stock: 4 })]),
    );

    expect(manager.updates).toEqual([
      { target: ProductEntity, criteria: { id: 'laptop' }, partial: { stock: 4 } },
    ]);
  });

  it('saves the order through the same transactional manager', async () => {
    const manager = new FakeEntityManager();
    const unitOfWork = new TypeOrmCheckoutUnitOfWork(
      new FakeDataSource(manager).asDataSource(),
      new SequentialIdGenerator(),
    );

    await unitOfWork.run(async (context) => context.saveOrder(buildOrder()));

    expect((manager.saved[0] as OrderEntity).id).toBe('order-1');
  });

  it('lets the failure escape so the transaction rolls back', async () => {
    const unitOfWork = new TypeOrmCheckoutUnitOfWork(
      new FakeDataSource(new FakeEntityManager()).asDataSource(),
      new SequentialIdGenerator(),
    );

    await expect(
      unitOfWork.run(async () => {
        throw new Error('stock ran out');
      }),
    ).rejects.toThrow('stock ran out');
  });
});

describe('system services', () => {
  it('reads the real clock', () => {
    const before = Date.now();

    expect(new SystemClock().now().getTime()).toBeGreaterThanOrEqual(before);
  });

  it('generates unique identifiers', () => {
    const generator = new UuidGenerator();

    expect(generator.next()).not.toBe(generator.next());
    expect(generator.next()).toHaveLength(36);
  });
});

describe('composition root', () => {
  it('wires every use case against the TypeORM adapters', () => {
    const manager = new FakeEntityManager();
    const dataSource = new FakeDataSource(manager).asDataSource();

    const dependencies = buildApiDependencies(dataSource);

    expect(dependencies.listProducts).toBeInstanceOf(ListProductsUseCase);
    expect(dependencies.quoteCart).toBeInstanceOf(QuoteCartUseCase);
    expect(dependencies.checkout).toBeInstanceOf(CheckoutUseCase);
    expect(dependencies.listOrders).toBeInstanceOf(ListOrdersUseCase);
  });

  it('accepts an alternative discount configuration without touching the engine', async () => {
    const manager = new FakeEntityManager(new Map([[ProductEntity, [buildProductEntity()]]]));
    const dataSource = new FakeDataSource(manager).asDataSource();

    const dependencies = buildApiDependencies(dataSource, {
      categoryDiscount: { category: 'TECHNOLOGY', percentage: Percentage.fromNumber(50) },
      volumeDiscount: { threshold: Money.fromCents(10_000), percentage: Percentage.zero() },
      maxTotalDiscount: Percentage.fromNumber(90),
    });

    const { breakdown } = await dependencies.quoteCart.execute({
      items: [{ productId: '11111111-1111-4111-8111-111111111101', quantity: 1 }],
      couponCode: null,
    });

    expect(breakdown.maxDiscountPercentage.value).toBe(90);
    expect(breakdown.totalDiscount.inCents).toBe(64_950);
  });
});

import type { Coupon } from '../../src/domain/models/coupon';
import type { Order } from '../../src/domain/models/order';
import type { Product } from '../../src/domain/models/product';
import type {
  CheckoutContext,
  CheckoutUnitOfWork,
  CouponRepository,
  OrderRepository,
  ProductRepository,
} from '../../src/domain/ports/repositories';
import type { Clock, IdGenerator } from '../../src/domain/ports/services';

/**
 * Adaptadores en memoria de los puertos del dominio.
 *
 * Son la contrapartida de haber definido puertos: los casos de uso se prueban
 * completos, con su orquestación real, sin levantar PostgreSQL. Lo único que se
 * sustituye es la tecnología de almacenamiento.
 */
export class InMemoryProductRepository implements ProductRepository {
  public constructor(private products: readonly Product[] = []) {}

  public async findAll(): Promise<readonly Product[]> {
    return this.products;
  }

  public async findByIds(ids: readonly string[]): Promise<readonly Product[]> {
    return this.products.filter((product) => ids.includes(product.id));
  }

  public replace(updated: readonly Product[]): void {
    const byId = new Map(updated.map((product) => [product.id, product]));

    this.products = this.products.map((product) => byId.get(product.id) ?? product);
  }

  public snapshot(): readonly Product[] {
    return this.products;
  }

  public restore(products: readonly Product[]): void {
    this.products = products;
  }

  public stockOf(id: string): number | undefined {
    return this.products.find((product) => product.id === id)?.stock;
  }
}

export class InMemoryCouponRepository implements CouponRepository {
  public constructor(private readonly coupons: readonly Coupon[] = []) {}

  public async findByCode(code: string): Promise<Coupon | null> {
    return this.coupons.find((coupon) => coupon.code === code) ?? null;
  }
}

export class InMemoryOrderRepository implements OrderRepository {
  private orders: Order[] = [];

  public async save(order: Order): Promise<Order> {
    this.orders.push(order);

    return order;
  }

  public async findAll(): Promise<readonly Order[]> {
    return this.orders;
  }

  public snapshot(): readonly Order[] {
    return [...this.orders];
  }

  public restore(orders: readonly Order[]): void {
    this.orders = [...orders];
  }
}

/**
 * Unidad de trabajo en memoria que imita la semántica transaccional real:
 * si el trabajo lanza, deshace productos y órdenes. Registra además qué ids se
 * bloquearon, para poder afirmar que el checkout bloquea antes de verificar.
 */
export class InMemoryCheckoutUnitOfWork implements CheckoutUnitOfWork {
  public readonly lockedIds: string[][] = [];

  public constructor(
    private readonly products: InMemoryProductRepository,
    private readonly orders: InMemoryOrderRepository,
  ) {}

  public async run<TResult>(work: (context: CheckoutContext) => Promise<TResult>): Promise<TResult> {
    const productsBefore = this.products.snapshot();
    const ordersBefore = this.orders.snapshot();

    const context: CheckoutContext = {
      lockProducts: async (ids) => {
        this.lockedIds.push([...ids]);

        return this.products.findByIds(ids);
      },
      saveProducts: async (updated) => {
        this.products.replace(updated);
      },
      saveOrder: async (order) => this.orders.save(order),
    };

    try {
      return await work(context);
    } catch (error) {
      this.products.restore(productsBefore);
      this.orders.restore(ordersBefore);

      throw error;
    }
  }
}

export class FixedClock implements Clock {
  public constructor(private readonly moment: Date) {}

  public now(): Date {
    return this.moment;
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;

  public constructor(private readonly prefix = 'order') {}

  public next(): string {
    this.counter += 1;

    return `${this.prefix}-${this.counter}`;
  }
}

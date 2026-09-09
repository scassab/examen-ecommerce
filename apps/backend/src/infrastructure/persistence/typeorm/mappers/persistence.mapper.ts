import type { DiscountBreakdown } from '../../../../domain/discounts/discount-engine';
import type { DiscountRuleResult } from '../../../../domain/discounts/discount-rule';
import { Coupon } from '../../../../domain/models/coupon';
import { Money } from '../../../../domain/models/money';
import { Order, OrderLine } from '../../../../domain/models/order';
import { Percentage } from '../../../../domain/models/percentage';
import { Product } from '../../../../domain/models/product';
import type { CouponEntity, ProductEntity } from '../entities/catalog.entities';
import { OrderDiscountEntity, OrderEntity, OrderItemEntity } from '../entities/order.entities';

/**
 * Traducción entre entidades de TypeORM y modelos de dominio.
 *
 * Es la pieza que justifica mantener dos representaciones: al pasar por aquí un
 * número plano de la base se convierte en un `Money` que ya no admite valores
 * negativos ni fraccionarios. El dominio recibe objetos que se validan solos y
 * la base de datos no impone su forma a las reglas de negocio.
 */
export const toProductDomain = (entity: ProductEntity): Product =>
  new Product({
    id: entity.id,
    name: entity.name,
    category: entity.category.code,
    categoryName: entity.category.name,
    unitPrice: Money.fromCents(entity.unitPriceInCents),
    stock: entity.stock,
  });

export const toCouponDomain = (entity: CouponEntity): Coupon =>
  new Coupon({
    code: entity.code,
    percentage: Percentage.fromNumber(entity.percentage),
    active: entity.active,
    expiresAt: entity.expiresAt,
  });

/** Identificadores de las filas hijas, inyectados para mantener el mapper puro. */
export interface OrderChildIds {
  readonly itemIds: readonly string[];
  readonly discountIds: readonly string[];
}

const buildItemEntity = (
  order: OrderEntity,
  line: OrderLine,
  id: string,
): OrderItemEntity => {
  const item = new OrderItemEntity();

  item.id = id;
  item.order = order;
  item.productId = line.productId;
  item.productName = line.productName;
  item.categoryCode = line.category;
  item.categoryName = line.categoryName;
  item.unitPriceInCents = line.unitPrice.inCents;
  item.quantity = line.quantity;
  item.lineSubtotalInCents = line.lineSubtotal.inCents;

  return item;
};

const buildDiscountEntity = (
  order: OrderEntity,
  discount: DiscountRuleResult,
  id: string,
  sequence: number,
): OrderDiscountEntity => {
  const entity = new OrderDiscountEntity();

  entity.id = id;
  entity.order = order;
  entity.sequence = sequence;
  entity.kind = discount.kind;
  entity.percentage = discount.percentage.value;
  entity.baseInCents = discount.base.inCents;
  entity.amountInCents = discount.amount.inCents;

  return entity;
};

export const toOrderEntity = (order: Order, ids: OrderChildIds): OrderEntity => {
  const entity = new OrderEntity();

  entity.id = order.id;
  entity.createdAt = order.createdAt;
  entity.originalSubtotalInCents = order.breakdown.originalSubtotal.inCents;
  entity.totalDiscountInCents = order.breakdown.totalDiscount.inCents;
  entity.capAdjustmentInCents = order.breakdown.capAdjustment.inCents;
  entity.totalInCents = order.breakdown.total.inCents;
  entity.effectiveDiscountPercentage = order.breakdown.effectivePercentage.value;
  entity.maxDiscountPercentage = order.breakdown.maxDiscountPercentage.value;
  entity.capReached = order.breakdown.capReached;
  entity.couponCode = order.breakdown.couponCode;
  entity.couponStatus = order.breakdown.couponStatus;

  entity.items = order.lines.map((line, index) =>
    buildItemEntity(entity, line, ids.itemIds[index] ?? `${order.id}-item-${index}`),
  );

  entity.discounts = order.breakdown.discounts.map((discount, index) =>
    buildDiscountEntity(
      entity,
      discount,
      ids.discountIds[index] ?? `${order.id}-discount-${index}`,
      index,
    ),
  );

  return entity;
};

const toBreakdownDomain = (entity: OrderEntity): DiscountBreakdown => ({
  originalSubtotal: Money.fromCents(entity.originalSubtotalInCents),
  // Se ordena por `sequence` porque la base no garantiza el orden de las filas,
  // y el desglose pierde sentido si la cascada se lee desordenada.
  discounts: [...entity.discounts]
    .sort((left, right) => left.sequence - right.sequence)
    .map((discount) => ({
      kind: discount.kind,
      percentage: Percentage.fromNumber(discount.percentage),
      base: Money.fromCents(discount.baseInCents),
      amount: Money.fromCents(discount.amountInCents),
    })),
  capAdjustment: Money.fromCents(entity.capAdjustmentInCents),
  totalDiscount: Money.fromCents(entity.totalDiscountInCents),
  effectivePercentage: Percentage.fromNumber(entity.effectiveDiscountPercentage),
  total: Money.fromCents(entity.totalInCents),
  capReached: entity.capReached,
  maxDiscountPercentage: Percentage.fromNumber(entity.maxDiscountPercentage),
  couponCode: entity.couponCode,
  couponStatus: entity.couponStatus,
});

export const toOrderDomain = (entity: OrderEntity): Order =>
  new Order({
    id: entity.id,
    createdAt: entity.createdAt,
    lines: entity.items.map(
      (item) =>
        new OrderLine(
          item.productId,
          item.productName,
          item.categoryCode,
          item.categoryName,
          Money.fromCents(item.unitPriceInCents),
          item.quantity,
          Money.fromCents(item.lineSubtotalInCents),
        ),
    ),
    breakdown: toBreakdownDomain(entity),
  });

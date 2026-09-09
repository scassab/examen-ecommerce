import type {
  DiscountLineDto,
  OrderDto,
  ProductDto,
  QuoteLineDto,
  QuoteResponseDto,
} from '@ecommerce/shared';

import type { DiscountBreakdown } from '../../domain/discounts/discount-engine';
import type { Cart } from '../../domain/models/cart';
import type { Order, OrderLine } from '../../domain/models/order';
import type { Product } from '../../domain/models/product';

/**
 * Traducción del dominio al contrato público.
 *
 * Es la frontera donde los objetos de valor se convierten en números planos:
 * hacia fuera solo viajan centavos enteros y porcentajes, nunca instancias de
 * `Money`. Mantener esta traducción en un único sitio es lo que permite cambiar
 * el modelo interno sin romper a los clientes de la API.
 */
export const toProductDto = (product: Product): ProductDto => ({
  id: product.id,
  name: product.name,
  category: product.category,
  categoryName: product.categoryName,
  unitPriceInCents: product.unitPrice.inCents,
  stock: product.stock,
});

const toQuoteLineDto = (line: Cart['lines'][number]): QuoteLineDto => ({
  productId: line.product.id,
  name: line.product.name,
  category: line.product.category,
  unitPriceInCents: line.product.unitPrice.inCents,
  quantity: line.quantity,
  lineSubtotalInCents: line.subtotal.inCents,
});

const toOrderQuoteLineDto = (line: OrderLine): QuoteLineDto => ({
  productId: line.productId,
  name: line.productName,
  category: line.category,
  unitPriceInCents: line.unitPrice.inCents,
  quantity: line.quantity,
  lineSubtotalInCents: line.lineSubtotal.inCents,
});

const toDiscountLineDto = (discount: DiscountBreakdown['discounts'][number]): DiscountLineDto => ({
  kind: discount.kind,
  percentage: discount.percentage.value,
  baseInCents: discount.base.inCents,
  amountInCents: discount.amount.inCents,
});

const toBreakdownDto = (
  lines: readonly QuoteLineDto[],
  breakdown: DiscountBreakdown,
): QuoteResponseDto => ({
  lines,
  originalSubtotalInCents: breakdown.originalSubtotal.inCents,
  discounts: breakdown.discounts.map(toDiscountLineDto),
  capAdjustmentInCents: breakdown.capAdjustment.inCents,
  totalDiscountInCents: breakdown.totalDiscount.inCents,
  effectiveDiscountPercentage: breakdown.effectivePercentage.value,
  totalInCents: breakdown.total.inCents,
  capReached: breakdown.capReached,
  maxDiscountPercentage: breakdown.maxDiscountPercentage.value,
  coupon: {
    code: breakdown.couponCode,
    status: breakdown.couponStatus,
  },
});

export const toQuoteResponseDto = (cart: Cart, breakdown: DiscountBreakdown): QuoteResponseDto =>
  toBreakdownDto(cart.lines.map(toQuoteLineDto), breakdown);

/**
 * La orden se serializa desde su propia foto de las líneas, no desde el
 * catálogo actual: así una orden consultada mañana muestra los precios que
 * realmente se cobraron.
 */
export const toOrderDto = (order: Order): OrderDto => ({
  id: order.id,
  createdAt: order.createdAt.toISOString(),
  summary: toBreakdownDto(order.lines.map(toOrderQuoteLineDto), order.breakdown),
});

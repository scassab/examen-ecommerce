import { Cart, CartLine } from '../../src/domain/models/cart';
import { Coupon } from '../../src/domain/models/coupon';
import { Percentage } from '../../src/domain/models/percentage';
import type { Product } from '../../src/domain/models/product';

import { buildProduct } from './product.builder';

export interface CartLineSpec {
  readonly product: Product;
  readonly quantity?: number;
}

/** Carrito armado a partir de pares producto/cantidad, con cantidad 1 por defecto. */
export const buildCart = (specs: readonly CartLineSpec[]): Cart =>
  Cart.fromLines(specs.map((spec) => new CartLine(spec.product, spec.quantity ?? 1)));

/** Atajo para el caso más frecuente: un único producto de tecnología. */
export const buildTechnologyCart = (priceInCents: number, quantity = 1): Cart =>
  buildCart([
    { product: buildProduct({ id: 'laptop-pro', category: 'TECHNOLOGY', priceInCents }), quantity },
  ]);

export interface CouponSpec {
  readonly code?: string;
  readonly percentage?: number;
  readonly active?: boolean;
  readonly expiresAt?: Date | null;
}

export const buildCoupon = (spec: CouponSpec = {}): Coupon =>
  new Coupon({
    code: spec.code ?? 'WELCOME2026',
    percentage: Percentage.fromNumber(spec.percentage ?? 15),
    active: spec.active ?? true,
    expiresAt: spec.expiresAt === undefined ? null : spec.expiresAt,
  });

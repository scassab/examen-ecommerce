import { ProductNotFoundError } from '../../domain/errors/domain.error';
import { Cart, CartLine } from '../../domain/models/cart';
import type { Coupon } from '../../domain/models/coupon';
import type { Product } from '../../domain/models/product';
import type { CouponRepository } from '../../domain/ports/repositories';

/** Ítem tal como llega desde el transporte, ya validado por el esquema. */
export interface RequestedItem {
  readonly productId: string;
  readonly quantity: number;
}

/**
 * Ensambla el carrito de dominio a partir de los ítems pedidos y los productos
 * resueltos del catálogo.
 *
 * Vive aparte porque cotización y checkout necesitan exactamente el mismo
 * ensamblado: duplicarlo abriría la puerta a que el checkout cobre algo distinto
 * de lo que la cotización mostró, que es el peor fallo posible en un pago.
 */
export const assembleCart = (
  items: readonly RequestedItem[],
  products: readonly Product[],
): Cart => {
  const catalog = new Map(products.map((product) => [product.id, product]));
  const missing = items.filter((item) => !catalog.has(item.productId));

  if (missing.length > 0) {
    throw new ProductNotFoundError(missing.map((item) => item.productId));
  }

  return Cart.fromLines(
    items.map((item) => {
      // El mapa contiene la clave: la comprobación anterior ya lo garantiza.
      const product = catalog.get(item.productId) as Product;

      return new CartLine(product, item.quantity);
    }),
  );
};

/**
 * Resuelve el cupón del catálogo.
 *
 * Un código desconocido devuelve `null` sin lanzar: el motor lo reportará como
 * cupón inválido y la cotización se entrega igual, porque escribir mal un cupón
 * no debe impedirle al cliente ver su total.
 */
export const resolveCoupon = async (
  coupons: CouponRepository,
  code: string | null,
): Promise<Coupon | null> => (code === null ? null : coupons.findByCode(code));
